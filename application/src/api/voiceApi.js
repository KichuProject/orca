import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ENDPOINTS, getEndpoint, getBaseUrl } from '../config/api';

/**
 * ORCA Voice API Service
 * Handles mobile microphone audio uploads for speech-to-text transcription
 * and generates high-definition TTS playback URLs.
 */

/**
 * Uploads a locally recorded audio file from mobile device to backend /api/voice/transcribe
 * Uses native FileSystem.uploadAsync on Android/iOS to avoid New Architecture FormDataPart errors.
 * @param {string} audioUri - Local file URI (e.g. file:///.../recording.m4a or .wav)
 * @param {string} [mimeType='audio/m4a'] - Audio MIME type
 * @returns {Promise<{ success: boolean, text: string, language: string, duration?: number }>}
 */
export async function uploadAudioForTranscription(audioUri, mimeType = 'audio/m4a') {
  if (!audioUri) {
    throw new Error('No audio file provided for transcription.');
  }

  const endpoint = getEndpoint(ENDPOINTS.VOICE_TRANSCRIBE);
  const filename = audioUri.split('/').pop() || 'mobile-voice.m4a';

  if (__DEV__) {
    console.log(`🎙️ [Voice API] Uploading audio to: ${endpoint} (${filename})`);
  }

  // 1. On Web: Use standard browser fetch with Blob
  if (Platform.OS === 'web') {
    const blob = await (await fetch(audioUri)).blob();
    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voice transcription failed with status ${response.status}: ${errorText.slice(0, 150)}`);
    }

    return await response.json();
  }

  // 2. On Native (Android / iOS): Use FileSystem.uploadAsync
  // This bypasses React Native 0.86+ TurboModule FormData limitations completely
  try {
    const uploadResult = await FileSystem.uploadAsync(endpoint, audioUri, {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      mimeType: mimeType || 'audio/m4a',
      headers: {
        Accept: 'application/json',
      },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(
        `Voice transcription failed with status ${uploadResult.status}: ${uploadResult.body?.slice(0, 150)}`
      );
    }

    const data = typeof uploadResult.body === 'string' ? JSON.parse(uploadResult.body) : uploadResult.body;
    return data;
  } catch (nativeErr) {
    console.warn('⚠️ [Voice API] FileSystem.uploadAsync encountered error, attempting blob fallback:', nativeErr.message);

    // Fallback: Fetch file as blob and upload
    const response = await fetch(audioUri);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob, filename);

    const uploadResp = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      throw new Error(`Voice transcription failed (${uploadResp.status}): ${errorText.slice(0, 150)}`);
    }

    return await uploadResp.json();
  }
}

/**
 * Returns the stream URL for backend multilingual TTS synthesis.
 * @param {string} text - Message text to synthesize
 * @param {string} [lang='en'] - Two-letter language code
 * @returns {string} - Direct playable audio URL
 */
export function getTtsAudioUrl(text, lang = 'en') {
  if (!text) return '';
  const cleanText = encodeURIComponent(text.slice(0, 500)); // Cap for URL parameter safety
  const cleanLang = encodeURIComponent(lang || 'en');
  return `${getBaseUrl()}${ENDPOINTS.VOICE_TTS}?text=${cleanText}&lang=${cleanLang}`;
}

export default {
  uploadAudioForTranscription,
  getTtsAudioUrl,
};
