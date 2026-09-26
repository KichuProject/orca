import { Platform } from 'react-native';

/**
 * ORCA Marine Audio Service
 * Uses modern Expo SDK 57 expo-audio with lazy-loading and graceful fallbacks
 * so the application NEVER crashes on startup if native audio is unavailable.
 */

let ExpoAudioModule = null;

function getAudioModule() {
  if (ExpoAudioModule !== null) return ExpoAudioModule;
  try {
    ExpoAudioModule = require('expo-audio');
  } catch (err) {
    console.warn('⚠️ [AudioService] expo-audio native module not available:', err.message);
    ExpoAudioModule = false;
  }
  return ExpoAudioModule;
}

let activeRecorder = null;
let activePlayer = null;

/**
 * Checks if native microphone audio recording is supported in the current environment.
 * @returns {boolean}
 */
export function isAudioSupported() {
  return !!getAudioModule();
}

/**
 * Requests microphone permission only when user taps the voice button.
 * @returns {Promise<boolean>}
 */
export async function requestMicrophonePermission() {
  const mod = getAudioModule();
  if (!mod) {
    console.warn('Microphone permission skipped: expo-audio module not installed.');
    return false;
  }

  try {
    const getPerm = mod.getRecordingPermissionsAsync || mod.AudioModule?.getRecordingPermissionsAsync;
    if (typeof getPerm === 'function') {
      const current = await getPerm();
      if (current?.granted) return true;
    }

    const reqPerm = mod.requestRecordingPermissionsAsync || mod.AudioModule?.requestRecordingPermissionsAsync;
    if (typeof reqPerm === 'function') {
      const response = await reqPerm();
      return !!response?.granted;
    }

    return false;
  } catch (err) {
    console.error('Failed to request microphone permission:', err);
    return false;
  }
}

/**
 * Starts recording audio from the mobile microphone using expo-audio.
 * @param {Function} [onStatusUpdate] - Status callback with recording duration
 * @returns {Promise<boolean>}
 */
export async function startRecording(onStatusUpdate) {
  const mod = getAudioModule();
  if (!mod) {
    throw new Error('Microphone recording is not supported in this runtime. Please use text chat.');
  }

  try {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      throw new Error('Microphone permission was not granted.');
    }

    // Stop any ongoing playback
    await stopPlayback();

    // Configure Audio Mode if available
    const setAudioMode = mod.setAudioModeAsync || mod.AudioModule?.setAudioModeAsync;
    if (typeof setAudioMode === 'function') {
      try {
        await setAudioMode({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (e) {
        console.warn('AudioMode set skipped:', e?.message);
      }
    }

    // Clean up previous recorder if still active
    if (activeRecorder) {
      try {
        await activeRecorder.stop();
      } catch {}
      activeRecorder = null;
    }

    // Resolve native AudioRecorder class from expo-audio / AudioModule
    const AudioRecorderClass =
      mod.AudioModule?.AudioRecorder ||
      mod.AudioRecorder ||
      mod.AudioModule?.AudioRecorderWeb;

    if (!AudioRecorderClass) {
      throw new Error('Native AudioRecorder class not found on AudioModule. Please verify expo-audio installation.');
    }

    const preset = mod.RecordingPresets?.HIGH_QUALITY || {};
    const platform = Platform.OS;
    const platformExtra =
      platform === 'android'
        ? preset.android
        : platform === 'ios'
        ? preset.ios
        : preset.web;

    const recordingOptions = {
      extension: preset.extension || '.m4a',
      sampleRate: preset.sampleRate || 44100,
      numberOfChannels: preset.numberOfChannels || 1,
      bitRate: preset.bitRate || 128000,
      isMeteringEnabled: false,
      ...(platformExtra || {}),
    };

    const recorder = new AudioRecorderClass(recordingOptions);

    if (onStatusUpdate && typeof recorder.addListener === 'function') {
      recorder.addListener('recordingStatusUpdate', (status) => {
        onStatusUpdate(status);
      });
    }

    if (typeof recorder.prepareToRecordAsync === 'function') {
      await recorder.prepareToRecordAsync();
    }
    if (typeof recorder.record === 'function') {
      recorder.record();
    }
    activeRecorder = recorder;
    return true;
  } catch (err) {
    console.error('Failed to start voice recording:', err);
    activeRecorder = null;
    throw err;
  }
}

/**
 * Stops the recording and returns the local file URI.
 * @returns {Promise<{ uri: string, durationMillis: number }|null>}
 */
export async function stopRecording() {
  if (!activeRecorder) return null;

  try {
    let status = {};
    if (typeof activeRecorder.getStatus === 'function') {
      try {
        status = activeRecorder.getStatus() || {};
      } catch {}
    }

    let stopResult = null;
    if (typeof activeRecorder.stop === 'function') {
      stopResult = await activeRecorder.stop();
    }

    const uri =
      (stopResult && stopResult.uri) ||
      activeRecorder.uri ||
      activeRecorder.filePath ||
      null;

    const durationMillis =
      (stopResult && stopResult.durationMillis) ||
      status.durationMillis ||
      0;

    activeRecorder = null;
    return { uri, durationMillis };
  } catch (err) {
    console.error('Failed to stop recording:', err);
    activeRecorder = null;
    return null;
  }
}

/**
 * Plays a remote or local audio stream (e.g. ORCA TTS).
 * @param {string} audioUrl
 * @param {Function} [onPlaybackStatusUpdate]
 * @returns {Promise<void>}
 */
export async function playAudio(audioUrl, onPlaybackStatusUpdate) {
  if (!audioUrl) return;
  const mod = getAudioModule();
  if (!mod || !mod.createAudioPlayer) return;

  try {
    await stopPlayback();

    const player = mod.createAudioPlayer(audioUrl);
    if (onPlaybackStatusUpdate) {
      player.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
    }
    player.play();
    activePlayer = player;
  } catch (err) {
    console.error('Failed to play audio:', err);
  }
}

/**
 * Stops and unloads any active sound playback.
 */
export async function stopPlayback() {
  if (activePlayer) {
    try {
      if (typeof activePlayer.pause === 'function') activePlayer.pause();
      if (typeof activePlayer.remove === 'function') activePlayer.remove();
    } catch {}
    activePlayer = null;
  }
}

export default {
  isAudioSupported,
  requestMicrophonePermission,
  startRecording,
  stopRecording,
  playAudio,
  stopPlayback,
};
