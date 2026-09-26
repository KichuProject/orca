"""
ORCA IVR & Voice Call Short-Answer Extraction Engine
Transforms rich multi-agent marine intelligence into crisp, natural spoken answers
suitable for Interactive Voice Response (IVR), TTS telephony (Twilio/Exotel/GSM), and audio feeds.
"""

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import edge_tts

# Global In-Memory Cache for latest IVR queries and short answers
LATEST_IVR_STORE: Dict[str, Any] = {
    "__global__": {
        "short_answer": "ORCA Marine Intelligence is online and ready for voice inquiries.",
        "spoken_text": "ORCA Marine Intelligence is online and ready for voice inquiries.",
        "verdict": "SAFE",
        "confidence_pct": 95,
        "language": "en",
        "query": "system_init",
        "timestamp": datetime.now().isoformat(),
        "user_id": "system"
    }
}

# Language codes to BCP-47 / TTS Voice tags
VOICE_LANG_TAGS = {
    "en": "en-IN",
    "ta": "ta-IN",
    "hi": "hi-IN",
    "te": "te-IN",
    "ml": "ml-IN",
    "kn": "kn-IN",
    "bn": "bn-IN",
    "gu": "gu-IN",
    "mr": "mr-IN",
    "or": "or-IN",
}

# 10-Language IVR Question Mapping (Options 1 to 8)
IVR_QUESTIONS_MULTILINGUAL: Dict[str, Dict[int, str]] = {
    "en": {
        1: "Where is the nearest Potential Fishing Zone (PFZ) today?",
        2: "Is it safe to venture into the sea tomorrow morning?",
        3: "What are the tide, weather, and sea conditions near my fishing location?",
        4: "Are there any lightning or cyclone alerts in my area?",
        5: "Which regions show high chlorophyll concentration and favourable sea surface temperature?",
        6: "What is the safest route for a fishing vessel considering weather and sea-state conditions?",
        7: "Why has fish productivity declined in a particular coastal region?",
        8: "Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?",
    },
    "ta": {
        1: "இன்று எனக்கு மிக அருகில் உள்ள சாத்தியமான மீன்பிடி மண்டலம் (PFZ) எங்குள்ளது?",
        2: "நாளை காலை கடலுக்குச் செல்வது பாதுகாப்பானதா?",
        3: "எனது மீன்பிடி பகுதிக்கு அருகில் அலைகள், வானிலை மற்றும் கடல் நிலவரங்கள் எவ்வாறு உள்ளன?",
        4: "எனது பகுதியில் இடிமின்னல் அல்லது புயல் எச்சரிக்கைகள் ஏதேனும் உள்ளதா?",
        5: "அதிக குளோரோபில் செறிவு மற்றும் சாதகமான கடல் மேற்பரப்பு வெப்பநிலை உள்ள பகுதிகள் எவை?",
        6: "வானிலை மற்றும் கடல் நிலவரங்களைக் கருத்தில் கொண்டு மீன்பிடி படகுக்கான மிகவும் பாதுகாப்பான வழித்தடம் எது?",
        7: "குறிப்பிட்ட கடலோரப் பகுதியில் மீன் உற்பத்தித்திறன் குறைந்து போனதற்கான காரணங்கள் என்ன?",
        8: "அபாயகரமான கடல் நிலைமைகள் அல்லது எல்லைக் கட்டுப்பாடுகள் காரணமாக எந்தெந்த மீன்பிடி மண்டலங்களைத் தவிர்க்க வேண்டும்?",
    },
    "hi": {
        1: "आज सबसे निकटतम संभावित मछली पकड़ने का क्षेत्र (PFZ) कहाँ है?",
        2: "क्या कल सुबह समुद्र में जाना सुरक्षित है?",
        3: "मेरे मछली पकड़ने के स्थान के पास ज्वार-भाटा, मौसम और समुद्र की स्थिति क्या है?",
        4: "क्या मेरे क्षेत्र में बिजली गिरने या चक्रवात की कोई चेतावनी है?",
        5: "किन क्षेत्रों में उच्च क्लोरोफिल सांद्रता और अनुकूल समुद्री सतह तापमान दिखाई देता है?",
        6: "मौसम और समुद्र की स्थिति को ध्यान में रखते हुए मछली पकड़ने वाली नाव के लिए सबसे सुरक्षित मार्ग क्या है?",
        7: "किसी विशेष तटीय क्षेत्र में मछली उत्पादन में गिरावट क्यों आई है?",
        8: "खतरनाक समुद्री परिस्थितियों या जियोफेंसिंग प्रतिबंधों के कारण किन मछली पकड़ने वाले क्षेत्रों से बचना चाहिए?",
    },
    "te": {
        1: "ఈ రోజు సమీపంలోని సంభావ్య చేపల వేట ప్రాంతం (PFZ) ఎక్కడ ఉంది?",
        2: "రేపు ఉదయం సముద్రంలోకి వెళ్లడం సురక్షితమేనా?",
        3: "నా చేపల వేట ప్రదేశం సమీపంలో అలలు, వాతావరణం మరియు సముద్ర పరిస్థితులు ఎలా ఉన్నాయి?",
        4: "నా ప్రాంతంలో పిడుగుపాటు లేదా తుఫాను హెచ్చరికలు ఏమైనా ఉన్నాయా?",
        5: "ఏ ప్రాంతాలు అధిక క్లోరోఫిల్ సాంద్రత మరియు అనుకూలమైన సముద్ర ఉపరితల ఉష్ణోగ్రతను చూపుతాయి?",
        6: "వాతావరణం మరియు సముద్ర పరిస్థితులను పరిగణనలోకి తీసుకుంటే చేపల వేట పడవకు అత్యంత సురక్షితమైన మార్గం ఏది?",
        7: "ఒక నిర్దిష్ట తీర ప్రాంతంలో చేపల ఉత్పాదకత ఎందుకు తగ్గింది?",
        8: "ప్రమాదకరమైన సముద్ర పరిస్థితులు లేదా జియోఫెన్సింగ్ ఆంక్షల కారణంగా ఏ చేపల వేట ప్రాంతాలను నివారించాలి?",
    },
    "ml": {
        1: "ഇന്ന് ഏറ്റവും അടുത്തുള്ള സാധ്യതയുള്ള മത്സ്യബന്ധന മേഖല (PFZ) എവിടെയാണ്?",
        2: "നാളെ രാവിലെ കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ?",
        3: "എന്റെ മത്സ്യബന്ധന സ്ഥലത്തിനടുത്ത് വേലിയേറ്റം, കാലാവസ്ഥ, കടൽ അവസ്ഥകൾ എന്നിവ എന്തൊക്കെയാണ്?",
        4: "എന്റെ പ്രദേശത്ത് ഇടിമിന്നലോ ചുഴലിക്കാറ്റോ സംബന്ധിച്ച എന്തെങ്കിലും മുന്നറിയിപ്പുകൾ ഉണ്ടോ?",
        5: "ഏതൊക്കെ പ്രദേശങ്ങളിലാണ് ഉയർന്ന ഹരിതക സാന്ദ്രതയും അനുകൂലമായ കടൽ ഉപരിതല താപനിലയും ഉള്ളത്?",
        6: "കാലാവസ്ഥയും കടൽ അവസ്ഥയും പരിഗണിക്കുമ്പോൾ മത്സ്യബന്ധന ബോട്ടിനുള്ള ഏറ്റവും സുരക്ഷിതമായ പാത ഏതാണ്?",
        7: "ഒരു പ്രത്യേക തീരദേശ മേഖലയിൽ മത്സ്യ ഉത്പാദനക്ഷമത കുറഞ്ഞത് എന്തുകൊണ്ടാണ്?",
        8: "അപകടകരമായ കടൽ അവസ്ഥകളോ ജിയോഫെൻസിംഗ് നിയന്ത്രണങ്ങളോ കാരണം ഏതൊക്കെ മത്സ്യബന്ധന മേഖലകൾ ഒഴിവാക്കണം?",
    },
    "kn": {
        1: "ಇಂದು ಹತ್ತಿರದ ಸಂಭಾವ್ಯ ಮೀನುಗಾರಿಕೆ ವಲಯ (PFZ) ಎಲ್ಲಿದೆ?",
        2: "ನಾಳೆ ಬೆಳಿಗ್ಗೆ ಸಮುದ್ರಕ್ಕೆ ಇಳಿಯುವುದು ಸುರಕ್ಷಿತವೇ?",
        3: "ನನ್ನ ಮೀನುಗಾರಿಕೆ ಸ್ಥಳದ ಸಮೀಪದಲ್ಲಿ ಉಬ್ಬರವಿಳಿತ, ಹವಾಮಾನ ಮತ್ತು ಸಮುದ್ರದ ಪರಿಸ್ಥಿತಿಗಳು ಹೇಗಿವೆ?",
        4: "ನನ್ನ ಪ್ರದೇಶದಲ್ಲಿ ಸಿಡಿಲು ಅಥವಾ ಚಂಡಮಾರುತದ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳಿವೆಯೇ?",
        5: "ಯಾವ ಪ್ರದೇಶಗಳಲ್ಲಿ ಹೆಚ್ಚಿನ ಕ್ಲೋರೊಫಿಲ್ ಸಾಂದ್ರತೆ ಮತ್ತು ಅನುಕೂಲಕರ ಸಮುದ್ರದ ಮೇಲ್ಮೈ ತಾಪಮಾನ ಕಂಡುಬರುತ್ತದೆ?",
        6: "ಹವಾಮಾನ ಮತ್ತು ಸಮುದ್ರದ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಪರಿಗಣಿಸಿ ಮೀನುಗಾರಿಕೆ ದೋಣಿಗೆ ಅತ್ಯಂತ ಸುರಕ್ಷಿತ ಮಾರ್ಗ ಯಾವುದು?",
        7: "ನಿರ್ದಿಷ್ಟ ಕರಾವಳಿ ಪ್ರದೇಶದಲ್ಲಿ ಮೀನು ಉತ್ಪಾದಕತೆ ಏಕೆ ಕುಸಿದಿದೆ?",
        8: "ಅಪಾಯಕಾರಿ ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿಗಳು ಅಥವಾ ಜಿಯೋಫೆನ್ಸಿಂಗ್ ನಿರ್ಬಂಧಗಳ ಕಾರಣದಿಂದಾಗಿ ಯಾವ ಮೀನುಗಾರಿಕೆ ವಲಯಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು?",
    },
    "bn": {
        1: "আজ সবচেয়ে কাছের সম্ভাব্য মাছ ধরার অঞ্চল (PFZ) কোথায়?",
        2: "কাল সকালে সমুদ্রে যাওয়া কি নিরাপদ?",
        3: "আমার মাছ ধরার অবস্থানের কাছাকাছি জোয়ার, আবহাওয়া এবং সমুদ্রের অবস্থা কেমন?",
        4: "আমার এলাকায় কি কোনো বজ্রপাত বা ঘূর্ণিঝড়ের সতর্কতা আছে?",
        5: "কোন অঞ্চলগুলিতে উচ্চ ক্লোরোফিল ঘনত্ব এবং অনুকূল সমুদ্রপৃষ্ঠের তাপমাত্রা রয়েছে?",
        6: "আবহাওয়া এবং সমুদ্রের অবস্থা বিবেচনা করে মাছ ধরার নৌকার জন্য সবচেয়ে নিরাপদ পথ কোনটি?",
        7: "একটি নির্দিষ্ট উপকূলীয় অঞ্চলে মাছের উৎপাদনশীলতা হ্রাস পাওয়ার কারণ কী?",
        8: "বিপজ্জনক সামুদ্রিক অবস্থা বা জিওফেন্সিং বিধিনিষেধের কারণে কোন মাছ ধরার অঞ্চলগুলি এড়িয়ে চলা উচিত?",
    },
    "gu": {
        1: "આજે સૌથી નજીકનું સંભવિત માછીમારી ક્ષેત્ર (PFZ) ક્યાં છે?",
        2: "શું આવતીકાલે સવારે દરિયામાં જવું સલામત છે?",
        3: "મારા માછીમારીના સ્થળ નજીક ભરતી-ઓટ, હવામાન અને દરિયાઈ સ્થિતિ શું છે?",
        4: "શું મારા વિસ્તારમાં વીજળી પડવાની કે વાવાઝોડાની કોઈ ચેતવણી છે?",
        5: "કયા વિસ્તારોમાં ઊંચું ક્લોરોફિલ પ્રમાણ અને સાનુકૂળ દરિયાઈ સપાટીનું તાપમાન છે?",
        6: "હવામાન અને દરિયાઈ સ્થિતિને ધ્યાનમાં રાખીને માછીમારી બોટ માટે સૌથી સુરક્ષિત માર્ગ કયો છે?",
        7: "કોઈ ચોક્કસ દરિયાકાંઠાના વિસ્તારમાં માછલીની ઉત્પાદકતા કેમ ઘટી ગઈ છે?",
        8: "જોખમી દરિયાઈ પરિસ્થિતિઓ અથવા જીઓફેન્સિંગ પ્રતિબંધોને કારણે કયા માછીમારી ઝોનને ટાળવા જોઈએ?",
    },
    "mr": {
        1: "आज सर्वात जवळचे संभाव्य मासेमारी क्षेत्र (PFZ) कुठे आहे?",
        2: "उद्या सकाळी समुद्रात जाणे सुरक्षित आहे का?",
        3: "माझ्या मासेमारीच्या ठिकाणाजवळ भरती-ओहोटी, हवामान आणि समुद्राची स्थिती कशी आहे?",
        4: "माझ्या भागात वीज पडणे किंवा चक्रीवादळाचा काही इशारा आहे का?",
        5: "कोणत्या भागात जास्त क्लोरोफिल एकाग्रता आणि अनुकूल समुद्राच्या पृष्ठभागाचे तापमान दिसून येते?",
        6: "हवामान आणि समुद्राची परिस्थिती लक्षात घेऊन मासेमारीच्या बोटीसाठी सर्वात सुरक्षित मार्ग कोणता आहे?",
        7: "एखाद्या विशिष्ट किनारी भागात माशांची उत्पादकता का घटली आहे?",
        8: "धोकादायक सागरी परिस्थिती किंवा जिओफेन्सिंग निर्बंधांमुळे कोणते मासेमारी क्षेत्र टाळले पाहिजेत?",
    },
    "or": {
        1: "ଆଜି ସବୁଠାରୁ ନିକଟତମ ସମ୍ଭାବ୍ୟ ମତ୍ସ୍ୟ ଧରିବା କ୍ଷେତ୍ର (PFZ) କେଉଁଠାରେ ଅଛି?",
        2: "ଆସନ୍ତାକାଲି ସକାଳେ ସମୁଦ୍ରକୁ ଯିବା ନିରାପଦ କି?",
        3: "ମୋର ମତ୍ସ୍ୟ ଧରିବା ସ୍ଥାନ ନିକଟରେ ଜୁଆର-ଭଟ୍ଟା, ପାଣିପାଗ ଏବଂ ସମୁଦ୍ରର ଅବସ୍ଥା କ’ଣ?",
        4: "ମୋ ଅଞ୍ଚଳରେ କୌଣସି ବଜ୍ରପାତ କିମ୍ବା ବାତ୍ୟା ଚେତାବନୀ ଅଛି କି?",
        5: "କେଉଁ ଅଞ୍ଚଳରେ ଉଚ୍ଚ କ୍ଲୋରୋଫିଲ୍ ସାନ୍ଦ୍ରତା ଏବଂ ଅନୁକୂଳ ସମୁଦ୍ର ପୃଷ୍ଠ ତାପମାତ୍ରା ରହିଛି?",
        6: "ପାଣିପାଗ ଏବଂ ସମୁଦ୍ର ଅବସ୍ଥାକୁ ବିଚାର କରି ଏକ ମତ୍ସ୍ୟ ଧରିବା ଡଙ୍ଗା ପାଇଁ ସବୁଠାରୁ ନିରାପଦ ମାର୍ଗ କ’ଣ?",
        7: "ଏକ ନିର୍ଦ୍ଦିଷ୍ଟ ଉପକୂଳବର୍ତ୍ତୀ ଅଞ୍ଚଳରେ ମାଛ ଉତ୍ପାଦନ କାହିଁକି ହ୍ରାସ ପାଇଛି?",
        8: "ବିପଦପୂର୍ଣ୍ଣ ସାମୁଦ୍ରିକ ପରିସ୍ଥିତି କିମ୍ବା ଜିଓଫେନସିଂ ପ୍ରତିବନ୍ଧକ ହେତୁ କେଉଁ ମତ୍ସ୍ୟ ଧରିବା କ୍ଷେତ୍ରଗୁଡ଼ିକୁ ଏଡ଼ାଇବା ଉଚିତ୍?",
    },
}

# English fallback dictionary as standard IVR_QUESTIONS
IVR_QUESTIONS = IVR_QUESTIONS_MULTILINGUAL["en"]


def get_ivr_question(question_number: int, language: str = "en") -> str:
    """
    Returns the designated question query for the given IVR question number (1-8)
    translated in the caller's requested language.
    """
    lang_dict = IVR_QUESTIONS_MULTILINGUAL.get(language, IVR_QUESTIONS_MULTILINGUAL["en"])
    return lang_dict.get(
        question_number,
        IVR_QUESTIONS_MULTILINGUAL["en"].get(question_number, "Invalid IVR question.")
    )


# Regex to strip emojis that confuse TTS voice engines
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F700-\U0001F77F"  # alchemical
    "\U0001F780-\U0001F7FF"  # Geometric Shapes
    "\U0001F800-\U0001F8FF"  # Supplemental Arrows
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols
    "\U0001FA00-\U0001FA6F"  # Chess Symbols
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE
)


def clean_text_for_speech(text: str, language: str = "en") -> str:
    """
    Strips markdown formatting, citations, tables, and emojis
    to yield clean, natural spoken audio script.
    """
    if not text:
        return ""

    s = text.strip()

    # Remove code blocks & inline code
    s = re.sub(r"```[\s\S]*?```", " ", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)

    # Remove markdown tables (| col | col |)
    s = re.sub(r"^\|.*\|$", " ", s, flags=re.MULTILINE)

    # Remove markdown headers (### Header)
    s = re.sub(r"^#{1,6}\s+", "", s, flags=re.MULTILINE)

    # Remove links [text](url) -> text
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)

    # Remove images ![alt](url) -> empty
    s = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", s)

    # Remove markdown bold/italic asterisks & underscores
    s = re.sub(r"[*_]{1,3}", "", s)

    # Remove HTML tags (<...>)
    s = re.sub(r"<[^>]+>", "", s)

    # Remove horizontal rules (--- or ***)
    s = re.sub(r"^[-\*_]{3,}\s*$", "", s, flags=re.MULTILINE)

    # Remove citation blocks (Verified Operational Sources: ...)
    s = re.sub(r"(?:Verified Operational Sources|Evidence Citations|Sources):[\s\S]*$", "", s, flags=re.IGNORECASE)

    # Replace coordinate degrees with clean words (e.g. 13.08°N -> 13.08 North)
    s = re.sub(r"(\d+(?:\.\d+)?)\s*°\s*([NSEWnsew])", r"\1 \2", s)

    # Remove bullet symbols (- , * , > , •)
    s = re.sub(r"^[\s\-\*\>•]+\s*", "", s, flags=re.MULTILINE)

    # Remove emojis
    s = EMOJI_PATTERN.sub("", s)

    # Collapse multiple whitespace and empty lines
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)

    return s.strip()


def extract_ivr_short_answer(
    response_text: str,
    agent_pipeline: Optional[Dict[str, Any]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Extracts the concise 1-3 sentence short answer from the full response or agent pipeline.
    Suitable for IVR voice readout.
    """
    if not response_text and not agent_pipeline:
        fallback_msg = (
            "தகவல் தற்போது கிடைக்கவில்லை." if language == "ta"
            else "जानकारी वर्तमान में उपलब्ध नहीं है।" if language == "hi"
            else "Information is currently unavailable."
        )
        return {
            "short_answer": fallback_msg,
            "spoken_text": fallback_msg,
            "verdict": "SAFE",
            "confidence_pct": 90,
            "language": language
        }

    verdict = "SAFE"
    confidence_pct = 92
    short_answer = ""

    # 1. PRIMARY: Extract from Direct Answer Box (> **Direct Answer:** ... / > **நேரடி பதில்:** ...)
    if response_text:
        text = response_text.strip()

        # Regex A: Explicit Direct Answer inside blockquote or bold tag in any supported coastal language
        direct_box_match = re.search(
            r">\s*(?:\*\*\s*(?:Direct Answer|நேரடி பதில்|प्रत्यक्ष उत्तर|ప్రత్యక్ష సమాధానం|നേരിട്ടുള്ള ഉത്തരം|ನೇರ ಉತ್ತರ|সরাসரி উত্তর|પ્રત્યક્ષ ઉત્તર|थेट उत्तर|ପ୍ରତ୍ୟକ୍ଷ ଉତ୍ତର)[^*:]*[:]\s*\*\*|\*\*[^*:]+[:]\*\*)\s*([^\n\r#]+(?:\n\s*>[^\n\r#]+)*)",
            text,
            re.IGNORECASE
        )
        if direct_box_match:
            raw_box = direct_box_match.group(0)
            cleaned_box = re.sub(r"^>\s*", "", raw_box, flags=re.MULTILINE)
            cleaned_box = re.sub(r"^(?:\*\*[^*:]+[:]\*\*|\*[^*:]+[:]\*|[^:\n]+[:])\s*", "", cleaned_box).strip()
            if cleaned_box and len(cleaned_box) > 15:
                short_answer = clean_text_for_speech(cleaned_box, language)

        # Regex B: Any markdown blockquote (> ...) under Plain-Language Takeaway / நேரடி விளக்கம்
        if not short_answer:
            takeaway_section_match = re.search(
                r"(?:Plain-Language Takeaway|Takeaway|நேரடி விளக்கம்|சுருக்கம்|निष्कर्ष|తాత్పర్యము|സംഗ്രഹം)[\s\S]*?>\s*([^\n\r#]+(?:\n\s*>[^\n\r#]+)*)",
                text,
                re.IGNORECASE
            )
            if takeaway_section_match:
                raw_quote = takeaway_section_match.group(1)
                cleaned_quote = re.sub(r"^>\s*", "", raw_quote, flags=re.MULTILINE)
                cleaned_quote = re.sub(r"^(?:\*\*[^*:]+[:]\*\*|\*[^*:]+[:]\*|[^:\n]+[:])\s*", "", cleaned_quote).strip()
                if cleaned_quote and len(cleaned_quote) > 15:
                    short_answer = clean_text_for_speech(cleaned_quote, language)

        # Regex C: Generic first blockquote anywhere in the markdown
        if not short_answer:
            generic_quote = re.search(r"^>\s*(?:\*\*[^*:]+[:]\*\*\s*)?([^\n\r#]+(?:\n\s*>[^\n\r#]+)*)", text, re.MULTILINE)
            if generic_quote:
                raw_g = generic_quote.group(1)
                cleaned_g = re.sub(r"^>\s*", "", raw_g, flags=re.MULTILINE)
                cleaned_g = re.sub(r"^(?:\*\*[^*:]+[:]\*\*|\*[^*:]+[:]\*|[^:\n]+[:])\s*", "", cleaned_g).strip()
                if cleaned_g and len(cleaned_g) > 15:
                    short_answer = clean_text_for_speech(cleaned_g, language)

    # 2. Try extracting from Agent Pipeline if available
    if not short_answer and agent_pipeline:
        fusion = agent_pipeline.get("fusion") or {}
        if fusion:
            verdict = fusion.get("resolved_verdict") or fusion.get("verdict") or verdict
            confidence_pct = fusion.get("confidence_pct", confidence_pct)

        safety_dec = agent_pipeline.get("safety_decision") or {}
        if safety_dec:
            verdict = safety_dec.get("verdict", verdict)

        # Check for direct plain-language takeaway in pipeline
        takeaway = (
            agent_pipeline.get("takeaway")
            or agent_pipeline.get("summary")
            or (safety_dec.get("plain_language_takeaway") if safety_dec else None)
        )
        if takeaway:
            short_answer = clean_text_for_speech(str(takeaway), language)

    # 3. Fallback: Takeaway section header match
    if not short_answer and response_text:
        text = response_text.strip()
        takeaway_match = re.search(
            r"(?:Takeaway|Plain-Language Takeaway|சுருக்கம்|முக்கிய முடிவு|நேரடி விளக்கம்|निष्कर्ष|తాత్పర్యము|സംഗ്രഹം)[:\s*]+([^\n\r#|]+(?:\n[^\n\r#|]+)?)",
            text,
            re.IGNORECASE
        )
        if takeaway_match:
            candidate = takeaway_match.group(1).strip()
            short_answer = clean_text_for_speech(candidate, language)
        else:
            # Extract first 1-3 non-header sentences, filtering out technical dossier headers
            cleaned_full = clean_text_for_speech(text, language)
            lines = [l.strip() for l in cleaned_full.split("\n") if l.strip()]
            # Filter out lines starting with "Forecast evaluated" or "ORCA Recommendation"
            lines = [l for l in lines if not re.match(r"^(?:Forecast evaluated|ORCA Recommendation|Recommendation / Verdict)", l, re.IGNORECASE)]
            sentences = []
            for line in lines:
                parts = re.split(r"(?<=[.!?।])\s+", line)
                for p in parts:
                    if len(p.strip()) > 10:
                        sentences.append(p.strip())
                    if len(sentences) >= 3:
                        break
                if len(sentences) >= 3:
                    break

            if sentences:
                short_answer = " ".join(sentences[:3])
            else:
                short_answer = cleaned_full[:250]

    # Clean any residual artifacts
    short_answer = clean_text_for_speech(short_answer, language)

    # Detect verdict if still default
    if "DANGER" in response_text.upper() or "UNSAFE" in response_text.upper() or "ஆபத்தானது" in response_text or "खतरनाक" in response_text:
        verdict = "DANGEROUS"
    elif "CAUTION" in response_text.upper() or "WARNING" in response_text.upper() or "எச்சரிக்கை" in response_text or "सावधानी" in response_text:
        verdict = "CAUTION"
    elif "SAFE" in response_text.upper() or "பாதுகாப்பானது" in response_text or "सुरक्षित" in response_text:
        verdict = "SAFE"

    return {
        "short_answer": short_answer,
        "spoken_text": short_answer,
        "verdict": verdict,
        "confidence_pct": int(confidence_pct) if confidence_pct else 90,
        "language": language
    }


def update_latest_ivr_cache(
    user_id: str,
    query: str,
    short_data: Dict[str, Any],
    full_response: str = ""
):
    """
    Stores the latest short answer in memory keyed by user_id and globally.
    """
    entry = {
        "short_answer": short_data.get("short_answer", ""),
        "spoken_text": short_data.get("spoken_text", ""),
        "verdict": short_data.get("verdict", "SAFE"),
        "confidence_pct": short_data.get("confidence_pct", 90),
        "language": short_data.get("language", "en"),
        "query": query,
        "full_response": full_response,
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id or "anonymous"
    }

    key = str(user_id or "anonymous").strip()
    LATEST_IVR_STORE[key] = entry
    LATEST_IVR_STORE["__global__"] = entry


def get_latest_ivr_cache(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves the most recent IVR response for user_id or globally.
    """
    if user_id and user_id in LATEST_IVR_STORE:
        return LATEST_IVR_STORE[user_id]
    return LATEST_IVR_STORE.get("__global__", {
        "short_answer": "No recent queries found.",
        "spoken_text": "No recent queries found.",
        "verdict": "SAFE",
        "confidence_pct": 90,
        "language": "en",
        "timestamp": datetime.now().isoformat(),
        "user_id": "anonymous"
    })


def format_twiml_response(spoken_text: str, language: str = "en") -> str:
    """
    Formats the spoken text into standard TwiML XML for Twilio/Exotel IVR phone systems.
    """
    lang_tag = VOICE_LANG_TAGS.get(language, "en-IN")
    # Escape XML entities
    safe_text = (
        spoken_text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Response>\n'
        f'    <Say language="{lang_tag}" voice="Polly.Aditi">{safe_text}</Say>\n'
        f'</Response>'
    )


# Voice mapping for edge-tts native neural synthesis
IVR_VOICE_MAP: Dict[str, str] = {
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "hi": "hi-IN-MadhurNeural",
    "en": "en-US-AvaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "kn": "kn-IN-SapnaNeural",
    "bn": "bn-IN-TanishaaNeural",
    "gu": "gu-IN-DhwaniNeural",
    "mr": "mr-IN-AarohiNeural",
    "ur": "ur-IN-GulNeural",
    "or": "hi-IN-MadhurNeural",
}


async def generate_ivr_response_wav(
    text: str,
    language: str = "en",
    filename: str = "orca-response.wav"
) -> str:
    """
    Synthesizes the given spoken text using edge-tts with the respective
    native language neural voice and converts it to Asterisk-compatible WAV
    (PCM 16-bit, 8000Hz, mono).
    Replaces existing orca-response.wav if it already exists.
    """
    if not text or not text.strip():
        text = "Information is currently unavailable."

    clean_text = clean_text_for_speech(text, language=language)
    if not clean_text:
        clean_text = text.strip()

    voice = IVR_VOICE_MAP.get(language, "en-US-AvaNeural")

    # Priority 1: E:/sih/voice directory
    voice_dir = Path("E:/sih/voice")
    voice_dir.mkdir(parents=True, exist_ok=True)
    
    primary_wav = voice_dir / filename
    temp_mp3 = voice_dir / f"_temp_resp_{language}.mp3"

    try:
        communicate = edge_tts.Communicate(clean_text, voice)
        await communicate.save(str(temp_mp3))

        # Convert to Asterisk WAV (PCM 16-bit, 8000Hz, mono), overwriting with -y
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(temp_mp3),
                "-acodec", "pcm_s16le",
                "-ac", "1",
                "-ar", "8000",
                str(primary_wav)
            ],
            check=True,
            capture_output=True
        )

        # Also copy to current working directory so Asterisk can access it from either path
        try:
            cwd_wav = Path(filename)
            if cwd_wav.resolve() != primary_wav.resolve():
                shutil.copyfile(str(primary_wav), str(cwd_wav))
        except Exception:
            pass

        try:
            print(f"[IVR] Generated Asterisk WAV ({language} | {voice}): {primary_wav} ({os.path.getsize(primary_wav)} bytes)")
        except Exception:
            pass
        return str(primary_wav)
    except Exception as e:
        try:
            print(f"[IVR] Error generating IVR response WAV ({voice}): {e}")
        except Exception:
            pass
        return ""
    finally:
        if temp_mp3.exists():
            try:
                temp_mp3.unlink()
            except OSError:
                pass

