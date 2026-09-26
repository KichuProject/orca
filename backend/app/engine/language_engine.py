"""
engine/language_engine.py
PHASE B7 — MULTILINGUAL PIPELINE ENGINE
Deterministic language detection + response formatting hints.

Supports:
English, Tamil, Hindi, Malayalam, Telugu, Kannada,
Bengali, Marathi, Gujarati, Odia

Rules:
- Zero top-level execution
- Everything inside functions
- Dynamic language detection
- TEST_* constants only inside __main__
- TEST RUN prints full result data
"""
import re
import json
from datetime import datetime

# ============================================================
# TEST CONSTANTS
# ============================================================
TEST_QUERIES = [
    "Is it safe to fish near Chennai tomorrow?",
    "சென்னை அருகே மீன் பிடிக்கச் செல்வது பாதுகாப்பானதா?",
    "రేపు ఉదయం సముద్రంలోకి వెళ్ళడం సురక్షితమేనా?",
    "क्या कल सुबह समुद्र में जाना सुरक्षित है?",
    "നാളെ രാവിലെ കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ?",
    "ನಾಳೆ ಬೆಳಿಗ್ಗೆ ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವುದು ಸುರಕ್ಷಿತವೇ?",
    "আগামীকাল সকালে সমুদ্রে যাওয়া কি নিরাপদ?",
    "উद्या সকালে সমুদ্রত যোৱাটো নিৰাপদ নেকি?",
    "કાલે સવારે સમુદ્રમાં જવું સુરક્ષિત છે?",
    "କାଲି ସକାଳେ ସମୁଦ୍ରକୁ ଯିବା ସୁରକ୍ଷିତ କି?",
]

# ============================================================
# LANGUAGE DETECTION (Unicode-based, deterministic)
# ============================================================
LANGUAGE_RANGES = {
    "en": (r"[\u0041-\u007A]", "English"),
    "ta": (r"[\u0B80-\u0BFF]", "Tamil"),
    "te": (r"[\u0C00-\u0C7F]", "Telugu"),
    "hi": (r"[\u0900-\u097F]", "Hindi"),
    "ml": (r"[\u0D00-\u0D7F]", "Malayalam"),
    "kn": (r"[\u0C80-\u0CFF]", "Kannada"),
    "bn": (r"[\u0980-\u09FF]", "Bengali"),
    "mr": (r"[\u0900-\u097F]", "Marathi"),  # Same Devanagari as Hindi
    "gu": (r"[\u0A80-\u0AFF]", "Gujarati"),
    "or": (r"[\u0B00-\u0B7F]", "Odia"),
    "as": (r"[\u0980-\u09FF]", "Assamese"),  # Same as Bengali
}

# Priority order for disambiguation (Devanagari: Hindi vs Marathi)
LANGUAGE_PRIORITY = ["ta", "te", "ml", "kn", "bn", "gu", "or", "hi", "mr", "as", "en"]

def detect_language(text: str) -> dict:
    """
    Detects the primary language of the input text using Unicode ranges.
    Returns:
    {
        "code": "ta",
        "name": "Tamil",
        "confidence": "HIGH",
        "char_count": 25,
        "total_chars": 30
    }
    """
    if not text or not text.strip():
        return {
            "code": "en",
            "name": "English",
            "confidence": "LOW",
            "char_count": 0,
            "total_chars": 0
        }

    # Count characters in each language range
    counts = {}
    total_chars = len(text.strip())

    for code, (pattern, name) in LANGUAGE_RANGES.items():
        matches = re.findall(pattern, text)
        if matches:
            counts[code] = len(matches)

    if not counts:
        return {
            "code": "en",
            "name": "English",
            "confidence": "LOW",
            "char_count": 0,
            "total_chars": total_chars
        }

    # Find the language with the most characters
    # Use priority order for disambiguation
    best_code = "en"
    best_count = 0

    for code in LANGUAGE_PRIORITY:
        if code in counts and counts[code] > best_count:
            best_code = code
            best_count = counts[code]

    # Get the name
    name = LANGUAGE_RANGES.get(best_code, ("", "Unknown"))[1]

    # Handle Devanagari disambiguation (Hindi vs Marathi)
        # Handle Devanagari disambiguation (Hindi vs Marathi)
    if best_code in ("hi", "mr"):
        # Check for Marathi-specific vocabulary
        marathi_words = re.findall(r"\b(आहे|मी|तुम्ही|काय|आहेस|आहात|नको|पाहिजे|कुठे)\b", text)
        if len(marathi_words) > 0:
            best_code = "mr"
            name = "Marathi"
        else:
            best_code = "hi"
            name = "Hindi"

    # Handle Bengali/Assamese disambiguation
    if best_code in ("bn", "as"):
        # Check for Assamese-specific characters
        assamese_chars = re.findall(r"[\u09F0-\u09F1]", text)
        if assamese_chars:
            best_code = "as"
            name = "Assamese"
        else:
            best_code = "bn"
            name = "Bengali"

    # Calculate confidence
    confidence = "HIGH" if best_count > 8 else ("MEDIUM" if best_count > 3 else "LOW")

    return {
        "code": best_code,
        "name": name,
        "confidence": confidence,
        "char_count": best_count,
        "total_chars": total_chars
    }

# ============================================================
# LANGUAGE-SPECIFIC RESPONSE FORMATTING
# ============================================================
LANGUAGE_GREETINGS = {
    "en": "Hello! I'm your Marine Intelligence Assistant.",
    "ta": "வணக்கம்! நான் உங்கள் கடல்சார் நுண்ணறிவு உதவியாளர்.",
    "te": "నమస్తే! నేను మీ సముద్ర మేధస్సు సహాయకుడిని.",
    "hi": "नमस्ते! मैं आपका समुद्री बुद्धिमत्ता सहायक हूं।",
    "ml": "ഹലോ! ഞാൻ നിങ്ങളുടെ സമുദ്ര ബുദ്ധി സഹായിയാണ്.",
    "kn": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಸಮುದ್ರ ಬುದ್ಧಿಮತ್ತೆ ಸಹಾಯಕ.",
    "bn": "হ্যালো! আমি আপনার সমুদ্র বুদ্ধিমত্তা সহায়ক।",
    "mr": "नमस्कार! मी तुमचा समुद्री बुद्धिमत्ता सहाय्यक आहे.",
    "gu": "નમસ્તે! હું તમારો સમુદ્રી બુદ્ધિમત્તા સહાયક છું.",
    "or": "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ ସମୁଦ୍ର ବୁଦ୍ଧିମତ୍ତା ସହାୟକ।",
    "as": "নমস্কাৰ! মই আপোনাৰ সমুদ্ৰ বুদ্ধিমত্তা সহায়ক।",
}

LANGUAGE_SAFETY_TERMS = {
    "en": {"safe": "SAFE ✅", "caution": "CAUTION ⚠️", "dangerous": "DANGEROUS 🚫"},
    "ta": {"safe": "பாதுகாப்பானது ✅", "caution": "எச்சரிக்கை ⚠️", "dangerous": "அபாயகரமானது 🚫"},
    "te": {"safe": "సురక్షితం ✅", "caution": "జాగ్రత్త ⚠️", "dangerous": "ప్రమాదకరం 🚫"},
    "hi": {"safe": "सुरक्षित ✅", "caution": "सावधानी ⚠️", "dangerous": "खतरनाक 🚫"},
    "ml": {"safe": "സുരക്ഷിതം ✅", "caution": "ജാഗ്രത ⚠️", "dangerous": "അപകടകരം 🚫"},
    "kn": {"safe": "ಸುರಕ್ಷಿತ ✅", "caution": "ಎಚ್ಚರಿಕೆ ⚠️", "dangerous": "ಅಪಾಯಕಾರಿ 🚫"},
    "bn": {"safe": "নিরাপদ ✅", "caution": "সতর্কতা ⚠️", "dangerous": "বিপজ্জনক 🚫"},
    "mr": {"safe": "सुरक्षित ✅", "caution": "सावधान ⚠️", "dangerous": "धोकादायक 🚫"},
    "gu": {"safe": "સુરક્ષિત ✅", "caution": "સાવચેતી ⚠️", "dangerous": "ખતરનાક 🚫"},
    "or": {"safe": "ସୁରକ୍ଷିତ ✅", "caution": "ସତର୍କତା ⚠️", "dangerous": "ବିପଜ୍ଜନକ 🚫"},
    "as": {"safe": "সুৰক্ষিত ✅", "caution": "সতর্কতা ⚠️", "dangerous": "বিপজ্জনক 🚫"},
}

LANGUAGE_DATA_SOURCES = {
    "en": "📡 Data referred from:",
    "ta": "📡 தரவு ஆதாரங்கள்:",
    "te": "📡 డేటా మూలాలు:",
    "hi": "📡 डेटा स्रोत:",
    "ml": "📡 ഡാറ്റാ സ്രോതസ്സുകൾ:",
    "kn": "📡 ಡೇಟಾ ಮೂಲಗಳು:",
    "bn": "📡 ডেটা সূত্র:",
    "mr": "📡 डेटा स्रोत:",
    "gu": "📡 ડેટા સ્ત્રોતો:",
    "or": "📡 ଡାଟା ଉତ୍ସ:",
    "as": "📡 ডাটা উৎস:",
}

# ============================================================
# LANGUAGE HINT FOR LLM
# ============================================================
def build_language_hint(detected_language: dict) -> str:
    """
    Builds a language instruction hint for the LLM.
    """
    code = detected_language.get("code", "en")
    name = detected_language.get("name", "English")

    if code == "en":
        return "Respond in English."

    return (
        f"CRITICAL LANGUAGE INSTRUCTION: "
        f"The user is writing in {name}. "
        f"You MUST respond entirely in {name}. "
        f"Do NOT use English sentences. "
        f"Technical terms like PFZ, SST, EEZ, IMD, INCOIS may remain in English. "
        f"Use this greeting: '{LANGUAGE_GREETINGS.get(code, '')}'"
    )

# ============================================================
# MULTILINGUAL VERDICT FORMATTER
# ============================================================
def format_verdict(verdict: str, language_code: str = "en") -> str:
    """
    Formats a safety verdict in the user's language.
    """
    terms = LANGUAGE_SAFETY_TERMS.get(language_code, LANGUAGE_SAFETY_TERMS["en"])

    verdict_lower = str(verdict).lower()
    if "safe" in verdict_lower:
        return terms.get("safe", "SAFE ✅")
    elif "caution" in verdict_lower:
        return terms.get("caution", "CAUTION ⚠️")
    elif "danger" in verdict_lower or "do_not" in verdict_lower:
        return terms.get("dangerous", "DANGEROUS 🚫")
    return verdict

# ============================================================
# MASTER MULTILINGUAL ANALYSIS
# ============================================================
def analyze_multilingual_query(query: str) -> dict:
    """
    AI Tool: Analyzes a query and returns language detection + formatting hints.
    """
    detected = detect_language(query)
    language_hint = build_language_hint(detected)
    greeting = LANGUAGE_GREETINGS.get(detected["code"], "")
    sources_label = LANGUAGE_DATA_SOURCES.get(detected["code"], LANGUAGE_DATA_SOURCES["en"])

    return {
        "tool": "language_engine.analyze_multilingual_query",
        "generated_at": datetime.now().isoformat(),
        "query_preview": query[:100],
        "detected_language": detected,
        "language_hint_for_llm": language_hint,
        "greeting": greeting,
        "sources_label": sources_label,
        "supported_languages": list(LANGUAGE_RANGES.keys()),
    }

# ============================================================
# TEST RUN
# ============================================================
if __name__ == "__main__":
    print("=" * 70)
    print("LANGUAGE ENGINE — PHASE B7 TEST RUN")
    print("=" * 70)

    for i, query in enumerate(TEST_QUERIES, 1):
        result = analyze_multilingual_query(query)
        detected = result["detected_language"]
        print(f"\n📦 Test {i}: {query[:50]}...")
        print(f"   Language: {detected['name']} ({detected['code']})")
        print(f"   Confidence: {detected['confidence']}")
        print(f"   Chars: {detected['char_count']}/{detected['total_chars']}")
        print(f"   Greeting: {result['greeting']}")
        print(f"   Verdict (SAFE): {format_verdict('SAFE', detected['code'])}")
        print(f"   Verdict (DANGEROUS): {format_verdict('DANGEROUS', detected['code'])}")

    # Full JSON for first test
    print("\n" + "=" * 70)
    print("📦 Full JSON for first test:")
    print("=" * 70)
    full_result = analyze_multilingual_query(TEST_QUERIES[1])
    print(json.dumps(full_result, indent=1, ensure_ascii=False))

    print("\n✅ LANGUAGE ENGINE TEST COMPLETE")
    print("\nCALL LIST:")
    print("  py .\\engine\\language_engine.py")
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from language_engine import detect_language; import json; print(json.dumps(detect_language(\'சென்னை அருகே மீன் பிடிக்கச் செல்வது பாதுகாப்பானதா?\'), indent=1, ensure_ascii=False))"')
    print('  py -c "import sys; sys.path.insert(0,\'engine\'); from language_engine import analyze_multilingual_query; import json; print(json.dumps(analyze_multilingual_query(\'రేపు ఉదయం సముద్రంలోకి వెళ్ళడం సురక్షితమేనా?\'), indent=1, ensure_ascii=False))"')