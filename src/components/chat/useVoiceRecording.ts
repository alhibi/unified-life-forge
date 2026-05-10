import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { haptic } from './sounds';
import {
  chatError, reportMicError, validateFile,
  MAX_VOICE_SECONDS,
} from './chatNotify';

interface UseVoiceRecordingOptions {
  activeConvId: string | null;
  userId: string | undefined;
  isAr: boolean;
  sendMessage: (type: string, fileUrl?: string, fileName?: string) => Promise<void>;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelModeRef = useRef<'send' | 'cancel' | 'preview'>('send');

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
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const uploadBlob = useCallback(async (blob: Blob, mime: string, ext: string) => {
    const convId = activeConvIdRef.current;
    const uid = userIdRef.current;
    const ar = isArRef.current;
    if (!convId || !uid) { chatError('conversationGone', ar); return; }

    // Cheap guard: don't send silent stubs
    if (blob.size < 512) { chatError('voiceEmpty', ar); return; }

    // Enforce max file size. validateFile already toasts the right message.
    const probe = new File([blob], `voice.${ext}`, { type: mime });
    if (!validateFile(probe, 'voice', ar)) return;

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
        return;
      }
      await sendMessageRef.current('voice', path, `voice_${stamp}.${ext}`);
    } catch (err) {
      chatError('voiceUploadFailed', ar, (err as Error)?.message);
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

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128000,
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
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: finalMime });
        const mode = cancelModeRef.current;
        cleanupRecorder();

        if (mode === 'cancel') return;
        if (blob.size === 0) { chatError('voiceEmpty', isArRef.current); return; }

        if (mode === 'preview') {
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewExt(ext);
          setPreviewMime(finalMime);
          return;
        }

        await uploadBlob(blob, finalMime, ext);
      };

      mediaRecorder.start(200);
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
  }, [previewUrl]);

  const sendPreview = useCallback(async () => {
    if (!previewBlob) { discardPreview(); return; }
    // Snapshot the blob before discardPreview() revokes its URL so we can
    // upload it independently of the component's preview state.
    const blob = previewBlob;
    const mime = previewMime;
    const ext = previewExt;
    discardPreview();
    await uploadBlob(blob, mime, ext);
  }, [previewBlob, previewMime, previewExt, discardPreview, uploadBlob]);

  return {
    isRecording, recordingTime, locked, uploadingVoice,
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
