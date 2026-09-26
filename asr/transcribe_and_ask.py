"""
transcribe_and_ask.py

AI4Bharat Indic Conformer ASR & ORCA Voice Endpoint Integration.
Designed to run exclusively within e:\\sih\\asr\\.venv.

Flow:
1. Loads indic-conformer-600m-multilingual on GPU (CUDA).
2. Reads the input WAV file (e.g. E:\\sih\\voice\\orca-question.wav).
3. Transcribes user speech into native text (Tamil, Telugu, Hindi, English, etc.).
4. Calls POST http://localhost:8000/api/chat/voice with the transcribed question.
5. Returns and displays the Direct Answer, Verdict, and generated orca-response.wav.
"""

import sys
import os
import argparse
import json
import urllib.request
import urllib.error
import soundfile as sf
import torch
import torchaudio
from transformers import AutoModel

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

MODEL_ID = "ai4bharat/indic-conformer-600m-multilingual"
DEFAULT_AUDIO_PATH = r"E:\sih\voice\orca-question.wav"
DEFAULT_BACKEND_URL = "http://localhost:8000/api/chat/voice"


def transcribe_audio(audio_path: str, language: str = "ta", device: str = "cuda") -> str:
    """
    Transcribes audio file to text:
    - English ('en'): Uses whisper-tiny on CUDA (fast & highly accurate for English)
    - Indic languages ('ta', 'hi', 'te', 'ml', etc.): Uses AI4Bharat Indic Conformer 600M
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    device = "cuda" if torch.cuda.is_available() and device == "cuda" else "cpu"

    if (language or "").strip().lower() in ["en", "english"]:
        print(f"[ASR] Transcribing English audio via Whisper on {device.upper()}...")
        from transformers import pipeline
        asr_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny", device=device)
        res = asr_pipe(audio_path)
        text = (res.get("text") or "").strip()
        return text

    print(f"[ASR] Loading model '{MODEL_ID}' on {device.upper()}...")
    
    model = AutoModel.from_pretrained(
        MODEL_ID,
        trust_remote_code=True
    )
    model = model.to(device)
    model.eval()

    print(f"[ASR] Reading audio file: {audio_path}")
    audio, sr = sf.read(audio_path, dtype="float32")
    wav = torch.from_numpy(audio)

    # Convert to mono if multi-channel
    if wav.ndim == 1:
        wav = wav.unsqueeze(0)
    else:
        wav = wav.mean(dim=1, keepdim=True).T

    # Resample to 16000 Hz if necessary
    if sr != 16000:
        print(f"[ASR] Resampling from {sr} Hz to 16000 Hz...")
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
        wav = resampler(wav)

    wav = wav.to(device)

    print(f"[ASR] Running CTC decoding for language '{language}'...")
    with torch.no_grad():
        transcription = model(wav, language, "ctc")

    if isinstance(transcription, (list, tuple)):
        transcription = " ".join(str(t) for t in transcription)
    else:
        transcription = str(transcription)

    transcription = transcription.strip()
    return transcription


def send_to_voice_endpoint(
    question: str,
    language: str = "ta",
    user_id: str = "1001",
    lat: float = 13.0827,
    lon: float = 80.2707,
    vessel_type: str = "small_boat",
    backend_url: str = DEFAULT_BACKEND_URL
) -> dict:
    """
    Posts the transcribed speech to ORCA Voice Free-Form Endpoint.
    """
    payload = {
        "question": question,
        "language": language,
        "user_id": user_id,
        "lat": lat,
        "lon": lon,
        "vessel_type": vessel_type,
        "format": "json"
    }

    print(f"[ORCA] Sending transcribed question to {backend_url}...")
    print(f"   Question: {question}")
    print(f"   Language: {language} | User: {user_id}")

    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        backend_url,
        data=data_bytes,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        res_bytes = resp.read()
        return json.loads(res_bytes.decode("utf-8"))


def process_voice_flow(
    audio_path: str = DEFAULT_AUDIO_PATH,
    language: str = "ta",
    user_id: str = "1001",
    lat: float = 13.0827,
    lon: float = 80.2707,
    vessel_type: str = "small_boat",
    backend_url: str = DEFAULT_BACKEND_URL
):
    print("==================================================")
    print("ORCA AI4Bharat Voice-to-Direct-Answer Pipeline")
    print("==================================================")

    # 1. Transcribe WAV
    transcribed_text = transcribe_audio(audio_path, language=language)
    print("\n--------------------------------------------------")
    print(f"ASR Transcribed Text: {transcribed_text}")
    print("--------------------------------------------------")

    if not transcribed_text:
        print("Transcription is empty. Cannot query ORCA.")
        return None

    # 2. Call ORCA Voice Endpoint
    result = send_to_voice_endpoint(
        question=transcribed_text,
        language=language,
        user_id=user_id,
        lat=lat,
        lon=lon,
        vessel_type=vessel_type,
        backend_url=backend_url
    )

    # 3. Display Output
    print("\n==================================================")
    print("ORCA DIRECT ANSWER RESULT:")
    print("==================================================")
    print(f"* Verdict:       {result.get('verdict')}")
    print(f"* Short Answer:  {result.get('short_answer')}")
    print(f"* Spoken Text:   {result.get('spoken_text')}")
    print(f"* Response Audio:{result.get('audio_file')} ({result.get('audio_path')})")
    print("==================================================\n")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORCA Voice ASR Extractor & Endpoint Caller")
    parser.add_argument("--audio", default=DEFAULT_AUDIO_PATH, help="Path to caller WAV file")
    parser.add_argument("--lang", default="ta", help="Language code (ta, hi, te, en, ml, kn, etc.)")
    parser.add_argument("--user", default="1001", help="User ID / Caller extension")
    parser.add_argument("--lat", type=float, default=13.0827, help="Caller Latitude")
    parser.add_argument("--lon", type=float, default=80.2707, help="Caller Longitude")
    parser.add_argument("--vessel", default="small_boat", help="Vessel type")
    parser.add_argument("--url", default=DEFAULT_BACKEND_URL, help="ORCA Voice Endpoint URL")

    args = parser.parse_args()
    process_voice_flow(
        audio_path=args.audio,
        language=args.lang,
        user_id=args.user,
        lat=args.lat,
        lon=args.lon,
        vessel_type=args.vessel,
        backend_url=args.url
    )
