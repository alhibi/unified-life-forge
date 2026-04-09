import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';

interface UseVoiceRecordingOptions {
  activeConvId: string | null;
  userId: string | undefined;
  sendMessage: (type: string, fileUrl?: string, fileName?: string) => Promise<void>;
}

export function useVoiceRecording({ activeConvId, userId, sendMessage }: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCancelledRef = useRef(false);

  const voicePlayer = useVoicePlayer();

  const startRecording = useCallback(async () => {
    try {
      if (voicePlayer.state.isPlaying) { voicePlayer.stop(); }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        }
      });

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
      recordingCancelledRef.current = false;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingCancelledRef.current) return;
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: finalMime });
        if (blob.size > 0 && activeConvId && userId) {
          const path = `${userId}/${activeConvId}/${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('chat-files').upload(path, blob, {
            contentType: finalMime,
            upsert: false,
          });
          if (!error) {
            await sendMessage('voice', path, `voice_${Date.now()}.${ext}`);
          }
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      // silently fail
    }
  }, [activeConvId, userId, sendMessage, voicePlayer]);

  const stopRecording = useCallback((cancel = false) => {
    recordingCancelledRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  }, []);

  return { isRecording, recordingTime, startRecording, stopRecording };
}
