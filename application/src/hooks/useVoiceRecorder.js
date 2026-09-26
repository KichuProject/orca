import { useState, useRef, useEffect, useCallback } from 'react';
import { startRecording, stopRecording, playAudio, stopPlayback } from '../services/audioService';
import { uploadAudioForTranscription, getTtsAudioUrl } from '../api/voiceApi';

export function useVoiceRecorder({ onTranscribed, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const timerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopPlayback();
    };
  }, []);

  const start = useCallback(async () => {
    try {
      setDurationSec(0);
      const success = await startRecording((status) => {
        if (status.isRecording) {
          const sec = Math.floor((status.durationMillis || 0) / 1000);
          setDurationSec(sec);
        }
      });

      if (success) {
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start voice record:', err);
      if (onError) onError(err.message || 'Microphone access failed.');
    }
  }, [onError]);

  const stop = useCallback(async () => {
    if (!isRecording) return;
    try {
      setIsRecording(false);
      setIsTranscribing(true);

      const result = await stopRecording();
      if (!result || !result.uri) {
        throw new Error('No audio was captured from microphone.');
      }

      // Upload mobile audio to backend Faster-Whisper ASR endpoint
      const transcribeResult = await uploadAudioForTranscription(result.uri);

      if (transcribeResult?.text && transcribeResult.text.trim()) {
        if (onTranscribed) {
          onTranscribed({
            text: transcribeResult.text.trim(),
            language: transcribeResult.language || 'en',
          });
        }
      } else {
        if (onError) onError('Could not clearly understand the audio. Please speak again.');
      }
    } catch (err) {
      console.error('Voice processing error:', err);
      if (onError) onError(err.message || 'Voice transcription failed.');
    } finally {
      setIsTranscribing(false);
      setDurationSec(0);
    }
  }, [isRecording, onError, onTranscribed]);

  const cancel = useCallback(async () => {
    setIsRecording(false);
    setIsTranscribing(false);
    setDurationSec(0);
    await stopRecording();
  }, []);

  const speakText = useCallback(async (text, lang = 'en') => {
    if (!text) return;
    try {
      setIsPlayingAudio(true);
      const url = getTtsAudioUrl(text, lang);
      await playAudio(url, (status) => {
        if (status.didJustFinish) {
          setIsPlayingAudio(false);
        }
      });
    } catch {
      setIsPlayingAudio(false);
    }
  }, []);

  const stopSpeaking = useCallback(async () => {
    setIsPlayingAudio(false);
    await stopPlayback();
  }, []);

  return {
    isRecording,
    isTranscribing,
    durationSec,
    isPlayingAudio,
    startRecording: start,
    stopRecording: stop,
    cancelRecording: cancel,
    speakText,
    stopSpeaking,
  };
}

export default useVoiceRecorder;
