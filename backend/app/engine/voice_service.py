"""
voice_service.py — ORCA Automatic Voice Intelligence & Language Detection
Uses Faster-Whisper (int8 quantization on CPU) to auto-detect the spoken
language (Tamil, English, Hindi, Telugu, Malayalam, etc.) and transcribe audio.
"""

import os
import tempfile
from pathlib import Path

_whisper_model = None

def get_whisper_model(model_size: str = "base"):
    """
    Lazy singleton loader for Faster-Whisper.
    Uses 'base' model on CPU with int8 compute for high speed and low memory.
    """
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            print(f"[VOICE] Initializing Faster-Whisper '{model_size}' (CPU int8)...")
            _whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
            print("[VOICE] Faster-Whisper model ready for auto-language detection.")
        except Exception as e:
            print(f"[VOICE] Failed to load Faster-Whisper: {e}")
            raise e
    return _whisper_model

def transcribe_audio_stream(audio_bytes: bytes, file_ext: str = "webm", beam_size: int = 5) -> dict:
    """
    Transcribes audio bytes and automatically detects the spoken language.
    Returns:
        {
            "text": str,
            "language": str (e.g. "ta", "en", "hi"),
            "language_probability": float,
            "duration": float
        }
    """
    model = get_whisper_model("base")

    with tempfile.NamedTemporaryFile(suffix=f".{file_ext}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # None language enables Whisper's 99-language acoustic classifier
        segments, info = model.transcribe(tmp_path, beam_size=beam_size)
        text_chunks = [segment.text for segment in segments]
        full_text = " ".join(text_chunks).strip()

        return {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
        }
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
