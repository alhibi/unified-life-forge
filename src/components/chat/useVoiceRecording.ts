import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { haptic } from './sounds';
import {
  chatError, reportMicError, validateFile,
  MAX_VOICE_SECONDS,
} from './chatNotify';
import { startMicAnalyser, ANALYSER_BAR_COUNT, type MicAnalyserHandle } from '@/lib/chat/micAnalyser';

interface UseVoiceRecordingOptions {
  activeConvId: string | null;
  userId: string | undefined;
  isAr: boolean;
  sendMessage: (type: string, fileUrl?: string, fileName?: string) => Promise<void>;
}

// Pick the highest-quality codec the runtime supports. We prefer Opus at
// 48 kHz because it produces clean voice at a fraction of the bitrate of
// AAC; Safari currently has no webm/Opus support so we fall back to AAC
// inside an MP4 container with the LC profile (mp4a.40.2).
function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
  ];
  for (const mime of candidates) {
    try { if (MediaRecorder.isTypeSupported(mime)) return mime; } catch { /* no-op */ }
  }
  return '';
}

function extFromMime(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg'))  return 'ogg';
  if (mime.includes('mp4'))  return 'mp4';
  if (mime.includes('aac'))  return 'aac';
  return 'webm';
}

// Voice quality:
//   • Opus 64 kbps mono @ 48 kHz is broadcast-clear for speech (WhatsApp
//     uses ~32 kbps; we go higher because our users care about fidelity).
//   • AAC needs more headroom for the same perceptual quality.
// If bandwidth becomes a concern later, we can drop these back to
// 32 kbps / 64 kbps without any code change beyond this function.
function targetBitrate(mime: string): number {
  if (mime.includes('opus') || mime.includes('webm') || mime.includes('ogg')) return 64_000;
  return 96_000;
}

/**
 * WhatsApp/Telegram-style voice recording:
 * - press & hold to record
 * - drag up to "lock" (hands-free)
 * - drag sideways to cancel
 * - after lock, button becomes Stop, shows preview w/ Send / Delete
 *
 * Robustness:
 * - Auto-stops at MAX_VOICE_SECONDS
 * - Fails loudly (toast) instead of silently on mic denied / upload error
 * - Uses a single timestamp for both storage path and file_name so the
 *   downstream lookup never has to guess
 * - Refs capture the latest `activeConvId`/`userId`/`sendMessage` so onstop
 *   (fired long after start) never uses stale closures
 */
export function useVoiceRecording({ activeConvId, userId, isAr, sendMessage }: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [locked, setLocked] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewExt, setPreviewExt] = useState<string>('webm');
  const [previewMime, setPreviewMime] = useState<string>('audio/webm');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  // Live amplitude bars (0..1, oldest → newest). Updated at ~30 Hz while
  // recording; null when not recording. We persist a captured envelope on
  // stop so the preview pill renders the *real* waveform of what the user
  // just said instead of a generic seeded fallback.
  const [liveBars, setLiveBars] = useState<number[] | null>(null);
  const [capturedBars, setCapturedBars] = useState<number[] | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelModeRef = useRef<'send' | 'cancel' | 'preview'>('send');
  const analyserRef = useRef<MicAnalyserHandle | null>(null);
  // Keep the latest bar snapshot in a ref so we can capture an envelope
  // for the preview without depending on state-update timing (the
  // analyser keeps emitting after stop() until cleanupRecorder runs).
  const latestBarsRef = useRef<number[]>([]);

  // Keep latest callbacks/ids in refs so the long-lived onstop closure
  // always uses current values (recordings can outlive several re-renders).
  const activeConvIdRef = useRef(activeConvId);
  const userIdRef = useRef(userId);
  const sendMessageRef = useRef(sendMessage);
  const isArRef = useRef(isAr);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { isArRef.current = isAr; }, [isAr]);

  const voicePlayer = useVoicePlayer();

  // Cleanup preview blob URL on unmount or change
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // Hard-stop timers + release mic on unmount so nothing dangles when the
  // drawer closes mid-recording.
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      analyserRef.current?.stop();
      analyserRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* no-op */ }
      }
    };
  }, []);

  const cleanupRecorder = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    setRecordingTime(0);
    setIsRecording(false);
    setLocked(false);
    setLiveBars(null);
    analyserRef.current?.stop();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  /**
   * Uploads a recorded blob to chat-files storage and emits the message.
   * Returns `true` on success — callers use this to decide whether to keep
   * the preview blob around (so the user can retry without re-recording).
   */
  const uploadBlob = useCallback(async (blob: Blob, mime: string, ext: string): Promise<boolean> => {
    const convId = activeConvIdRef.current;
    const uid = userIdRef.current;
    const ar = isArRef.current;
    if (!convId || !uid) { chatError('conversationGone', ar); return false; }

    // Cheap guard: don't send silent stubs
    if (blob.size < 512) { chatError('voiceEmpty', ar); return false; }

    // Enforce max file size. validateFile already toasts the right message.
    const probe = new File([blob], `voice.${ext}`, { type: mime });
    if (!validateFile(probe, 'voice', ar)) return false;

    // Use a SINGLE timestamp for both the storage path and the file_name
    // so downstream code never has to fuzzy-match by closest ts.
    const stamp = Date.now();
    const path = `${uid}/${convId}/${stamp}.${ext}`;

    setUploadingVoice(true);
    try {
      const { error } = await supabase.storage.from('chat-files').upload(path, blob, {
        contentType: mime, upsert: false,
      });
      if (error) {
        chatError('voiceUploadFailed', ar, error.message);
        return false;
      }
      await sendMessageRef.current('voice', path, `voice_${stamp}.${ext}`);
      return true;
    } catch (err) {
      chatError('voiceUploadFailed', ar, (err as Error)?.message);
      return false;
    } finally {
      setUploadingVoice(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (voicePlayer.state.isPlaying) voicePlayer.stop();

      // Some browsers (especially iOS Safari when triggered outside a user
      // gesture by a ref-swap) need this check.
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        chatError('micUnavailable', isArRef.current);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        }
      });
      streamRef.current = stream;

      // Spin up the live amplitude analyser BEFORE MediaRecorder.start so
      // the first frame is on screen by the time the user's finger has
      // settled on the mic button. Throttle React updates to ~30 Hz —
      // smoother than the underlying RAF (~60 Hz) while still feeling
      // perfectly responsive to voice changes.
      latestBarsRef.current = new Array(ANALYSER_BAR_COUNT).fill(0.06);
      analyserRef.current = startMicAnalyser(stream, {
        onFrame: (frameIdx, bars) => {
          latestBarsRef.current = bars;
          if (frameIdx % 2 === 0) setLiveBars(bars);
        },
      });

      const mimeType = pickRecorderMime();

      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: targetBitrate(mimeType),
      };
      const mediaRecorder = new MediaRecorder(stream, options);
      recordingChunksRef.current = [];
      cancelModeRef.current = 'send';
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = () => {
        chatError('voiceUploadFailed', isArRef.current);
        cleanupRecorder();
      };

      mediaRecorder.onstop = async () => {
        const finalMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const ext = extFromMime(finalMime);
        const blob = new Blob(recordingChunksRef.current, { type: finalMime });
        const mode = cancelModeRef.current;
        // Capture the live envelope BEFORE cleanupRecorder tears the
        // analyser down, so the preview pill paints the real waveform of
        // what the user just said.
        const envelopeSnapshot = latestBarsRef.current.length
          ? Array.from(latestBarsRef.current)
          : null;
        cleanupRecorder();

        if (mode === 'cancel') return;
        if (blob.size === 0) { chatError('voiceEmpty', isArRef.current); return; }

        if (mode === 'preview') {
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewExt(ext);
          setPreviewMime(finalMime);
          setCapturedBars(envelopeSnapshot);
          return;
        }

        // Direct-send path: on failure, fall back to preview so the user
        // can retry with a single tap instead of losing the recording.
        const ok = await uploadBlob(blob, finalMime, ext);
        if (!ok) {
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewExt(ext);
          setPreviewMime(finalMime);
          setCapturedBars(envelopeSnapshot);
        }
      };

      // Larger timeslice = bigger chunks = fewer events on the JS thread =
      // less risk of dropping audio when the page is doing other work.
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto-stop at MAX_VOICE_SECONDS → treat as send to not lose the audio
      maxDurationTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          cancelModeRef.current = 'send';
          try { mediaRecorderRef.current.stop(); } catch { /* no-op */ }
          chatError('voiceTooLong', isArRef.current);
        }
      }, MAX_VOICE_SECONDS * 1000);

      haptic('medium');
    } catch (err) {
      reportMicError(err, isArRef.current);
      cleanupRecorder();
    }
  }, [voicePlayer, cleanupRecorder, uploadBlob]);

  const stopAndSend = useCallback(() => {
    cancelModeRef.current = 'send';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { cleanupRecorder(); }
    } else {
      cleanupRecorder();
    }
  }, [cleanupRecorder]);

  const stopAndCancel = useCallback(() => {
    cancelModeRef.current = 'cancel';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { cleanupRecorder(); }
    } else {
      cleanupRecorder();
    }
    haptic('heavy');
  }, [cleanupRecorder]);

  const stopForPreview = useCallback(() => {
    cancelModeRef.current = 'preview';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { cleanupRecorder(); }
    } else {
      cleanupRecorder();
    }
  }, [cleanupRecorder]);

  const lockRecording = useCallback(() => {
    setLocked(true);
    haptic('medium');
  }, []);

  // Legacy-compatible API
  const stopRecording = useCallback((cancel = false) => {
    if (cancel) stopAndCancel();
    else stopAndSend();
  }, [stopAndCancel, stopAndSend]);

  const discardPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl('');
    setCapturedBars(null);
  }, [previewUrl]);

  const sendPreview = useCallback(async () => {
    if (!previewBlob) { discardPreview(); return; }
    // Don't tear the preview down up front: if the upload fails we want
    // the user to see the same waveform and tap Send again, instead of
    // re-recording from scratch.
    const blob = previewBlob;
    const mime = previewMime;
    const ext = previewExt;
    const ok = await uploadBlob(blob, mime, ext);
    if (ok) discardPreview();
  }, [previewBlob, previewMime, previewExt, discardPreview, uploadBlob]);

  return {
    isRecording, recordingTime, locked, uploadingVoice,
    liveBars, capturedBars,
    startRecording,
    stopRecording,       // legacy: (cancel?: boolean) => void
    stopAndSend,
    stopAndCancel,
    stopForPreview,      // release with preview intent
    lockRecording,
    previewBlob, previewUrl,
    sendPreview, discardPreview,
  };
}
