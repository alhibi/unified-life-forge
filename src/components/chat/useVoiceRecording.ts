import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { playChatSound, haptic } from './sounds';

interface UseVoiceRecordingOptions {
  activeConvId: string | null;
  userId: string | undefined;
  sendMessage: (type: string, fileUrl?: string, fileName?: string) => Promise<void>;
}

/**
 * WhatsApp/Telegram-style voice recording:
 * - press & hold to record
 * - drag up to "lock" (hands-free)
 * - drag sideways to cancel
 * - after lock, button becomes Stop, shows preview w/ Send / Delete
 */
export function useVoiceRecording({ activeConvId, userId, sendMessage }: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [locked, setLocked] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewExt, setPreviewExt] = useState<string>('webm');
  const [previewMime, setPreviewMime] = useState<string>('audio/webm');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelModeRef = useRef<'send' | 'cancel' | 'preview'>('send');

  const voicePlayer = useVoicePlayer();

  // Cleanup preview blob URL on unmount or change
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const cleanupRecorder = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
    setIsRecording(false);
    setLocked(false);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (voicePlayer.state.isPlaying) voicePlayer.stop();

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

      mediaRecorder.onstop = async () => {
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: finalMime });
        cleanupRecorder();

        if (cancelModeRef.current === 'cancel' || blob.size === 0 || !activeConvId || !userId) return;

        if (cancelModeRef.current === 'preview') {
          // Keep blob for preview and let the user decide via Send / Delete buttons
          const url = URL.createObjectURL(blob);
          setPreviewBlob(blob);
          setPreviewUrl(url);
          setPreviewExt(ext);
          setPreviewMime(finalMime);
          return;
        }

        // Direct send
        const path = `${userId}/${activeConvId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('chat-files').upload(path, blob, {
          contentType: finalMime, upsert: false,
        });
        if (!error) {
          await sendMessage('voice', path, `voice_${Date.now()}.${ext}`);
        } else {
          playChatSound('error');
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      haptic('medium');
    } catch {
      // Mic denied or unavailable
      playChatSound('error');
      cleanupRecorder();
    }
  }, [activeConvId, userId, sendMessage, voicePlayer, cleanupRecorder]);

  const stopAndSend = useCallback(() => {
    cancelModeRef.current = 'send';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecorder();
    }
  }, [cleanupRecorder]);

  const stopAndCancel = useCallback(() => {
    cancelModeRef.current = 'cancel';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecorder();
    }
    haptic('heavy');
  }, [cleanupRecorder]);

  const stopForPreview = useCallback(() => {
    cancelModeRef.current = 'preview';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
    if (!previewBlob || !activeConvId || !userId) { discardPreview(); return; }
    const path = `${userId}/${activeConvId}/${Date.now()}.${previewExt}`;
    const { error } = await supabase.storage.from('chat-files').upload(path, previewBlob, {
      contentType: previewMime, upsert: false,
    });
    if (!error) {
      await sendMessage('voice', path, `voice_${Date.now()}.${previewExt}`);
    } else {
      playChatSound('error');
    }
    discardPreview();
  }, [previewBlob, activeConvId, userId, previewExt, previewMime, sendMessage, discardPreview]);

  return {
    isRecording, recordingTime, locked,
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
