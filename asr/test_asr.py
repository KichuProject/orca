import torch
import torchaudio
import soundfile as sf
from transformers import AutoModel

MODEL_ID = "ai4bharat/indic-conformer-600m-multilingual"
AUDIO_FILE = r"E:\sih\voice\orca-question.wav"

print("Loading model...")
print("GPU:", torch.cuda.get_device_name(0))

model = AutoModel.from_pretrained(
    MODEL_ID,
    trust_remote_code=True
)

model = model.to("cuda")
model.eval()

print("Model loaded on GPU.")

print("Loading audio...")
audio, sr = sf.read(AUDIO_FILE, dtype="float32")

wav = torch.from_numpy(audio)

# Convert mono/stereo correctly
if wav.ndim == 1:
    wav = wav.unsqueeze(0)
else:
    wav = wav.mean(dim=1, keepdim=True).T

if sr != 16000:
    print(f"Resampling {sr} Hz → 16000 Hz")
    resampler = torchaudio.transforms.Resample(
        orig_freq=sr,
        new_freq=16000
    )
    wav = resampler(wav)

wav = wav.to("cuda")

print("Running ASR...")

# Change this according to the language being spoken:
language = "ta"

with torch.no_grad():
    transcription = model(wav, language, "ctc")

print("\n==============================")
print("TRANSCRIPTION:")
print(transcription)
print("==============================")