import asyncio
import os
import subprocess
import sys
import shutil
import edge_tts
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

VOICE_DIR = Path("E:/sih/voice")
VOICE_DIR.mkdir(parents=True, exist_ok=True)

# 1. Multi-lingual main menu components with native neural voices (10 languages)
MENU_SEGMENTS = [
    {"lang": "en", "voice": "en-IN-NeerjaNeural", "text": "Welcome to ORCA Marine Intelligence. Press 1 for English."},
    {"lang": "ta", "voice": "ta-IN-PallaviNeural", "text": "தமிழுக்கு இரண்டை அழுத்தவும்."},
    {"lang": "hi", "voice": "hi-IN-MadhurNeural", "text": "हिंदी के लिए 3 दबाएं।"},
    {"lang": "te", "voice": "te-IN-ShrutiNeural", "text": "తెలుగు కోసం 4 నొక్కండి."},
    {"lang": "ml", "voice": "ml-IN-SobhanaNeural", "text": "മലയാളത്തിനായി 5 അമർത്തുക."},
    {"lang": "kn", "voice": "kn-IN-SapnaNeural", "text": "ಕನ್ನಡಕ್ಕಾಗಿ 6 ಒತ್ತಿರಿ."},
    {"lang": "bn", "voice": "bn-IN-TanishaaNeural", "text": "বাংলার জন্য 7 টিপুন।"},
    {"lang": "gu", "voice": "gu-IN-DhwaniNeural", "text": "ગુજરાતી માટે 8 દબાવો."},
    {"lang": "mr", "voice": "mr-IN-AarohiNeural", "text": "मराठीसाठी 9 दाबा."},
    {"lang": "or", "voice": "hi-IN-MadhurNeural", "text": "ओडिया पाइँ शून्य दबान्तु।"},
]

# 2. Language selected confirmation prompts
INDIVIDUAL_PROMPTS = [
    {"name": "orca-english", "voice": "en-IN-NeerjaNeural", "text": "English selected. Please ask your marine question."},
    {"name": "orca-tamil", "voice": "ta-IN-PallaviNeural", "text": "தமிழ் தேர்ந்தெடுக்கப்பட்டது. உங்கள் கடல் தொடர்பான கேள்வியைக் கேளுங்கள்."},
    {"name": "orca-hindi", "voice": "hi-IN-MadhurNeural", "text": "हिंदी चुनी गई है। अपना समुद्री प्रश्न पूछिए।"},
    {"name": "orca-telugu", "voice": "te-IN-ShrutiNeural", "text": "తెలుగు ఎంచుకోబడింది. మీ సముద్ర సంబంధిత ప్రశ్నను అడగండి."},
    {"name": "orca-malayalam", "voice": "ml-IN-SobhanaNeural", "text": "മലയാളം തിരഞ്ഞെടുത്തു. നിങ്ങളുടെ സമുദ്ര സംബന്ധമായ ചോദ്യം ചോദിക്കുക."},
    {"name": "orca-kannada", "voice": "kn-IN-SapnaNeural", "text": "ಕನ್ನಡವನ್ನು ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ. ನಿಮ್ಮ ಸಮುದ್ರ ಸಂಬಂಧಿತ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ."},
    {"name": "orca-bengali", "voice": "bn-IN-TanishaaNeural", "text": "বাংলা নির্বাচিত হয়েছে। আপনার সামুদ্রিক প্রশ্ন জিজ্ঞাসা করুন।"},
    {"name": "orca-gujarati", "voice": "gu-IN-DhwaniNeural", "text": "ગુજરાતી પસંદ કરવામાં આવી છે. તમારો દરિયાઈ પ્રશ્ન પૂછો."},
    {"name": "orca-marathi", "voice": "mr-IN-AarohiNeural", "text": "मराठी निवडली आहे. आपला सागरी प्रश्न विचारा."},
    {"name": "orca-odia", "voice": "hi-IN-MadhurNeural", "text": "ओडिया चयन कराजाइछि। आपणङ्कर सामुद्रिक प्रश्न पचारन्तु।"},
]

# 3. Processing / Waiting prompts while AI generates intelligence
PROCESSING_PROMPTS = [
    {"name": "orca-processing-en", "lang": "en", "voice": "en-IN-NeerjaNeural", "text": "Please wait. We are collecting the information for your request."},
    {"name": "orca-processing-ta", "lang": "ta", "voice": "ta-IN-PallaviNeural", "text": "தயவுசெய்து காத்திருக்கவும். உங்கள் கோரிக்கைக்கான தகவல்களை நாங்கள் சேகரித்து வருகிறோம்."},
    {"name": "orca-processing-hi", "lang": "hi", "voice": "hi-IN-MadhurNeural", "text": "कृपया प्रतीक्षा करें। हम आपके अनुरोध के लिए जानकारी एकत्र कर रहे हैं।"},
    {"name": "orca-processing-te", "lang": "te", "voice": "te-IN-ShrutiNeural", "text": "దయచేసి వేచి ఉండండి. మీ అభ్యర్థన కోసం మేము సమాచారాన్ని సేకరిస్తున్నాము."},
    {"name": "orca-processing-ml", "lang": "ml", "voice": "ml-IN-SobhanaNeural", "text": "ദയവായി കാത്തിരിക്കുക. നിങ്ങളുടെ അഭ്യർത്ഥനയ്ക്കുള്ള വിവരങ്ങൾ ഞങ്ങൾ ശേഖരിക്കുകയാണ്."},
    {"name": "orca-processing-kn", "lang": "kn", "voice": "kn-IN-SapnaNeural", "text": "ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ. ನಿಮ್ಮ ವಿನಂತಿಗಾಗಿ ನಾವು ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುತ್ತಿದ್ದೇವೆ."},
    {"name": "orca-processing-bn", "lang": "bn", "voice": "bn-IN-TanishaaNeural", "text": "অনুগ্রহ করে অপেক্ষা করুন। আমরা আপনার অনুরোধের জন্য তথ্য সংগ্রহ করছি।"},
    {"name": "orca-processing-gu", "lang": "gu", "voice": "gu-IN-DhwaniNeural", "text": "કૃપા કરીને રાહ જુઓ. અમે તમારી વિનંતી માટે માહિતી એકત્રિત કરી રહ્યા છીએ."},
    {"name": "orca-processing-mr", "lang": "mr", "voice": "mr-IN-AarohiNeural", "text": "कृपया प्रतीक्षा करा. आम्ही आपल्या विनंतीसाठी माहिती गोळा करत आहोत."},
    {"name": "orca-processing-or", "lang": "or", "voice": "hi-IN-MadhurNeural", "text": "दयाकरि अपेक्षा करन्तु। आमे आपणङ्क अनुरोध पाइँ सूचना संग्रह करुछु।"},
]

# 4. Speak Question Prompts for Option 9 (Direct voice question)
SPEAK_PROMPTS = [
    {"name": "orca-speak-prompt-en", "lang": "en", "voice": "en-IN-NeerjaNeural", "text": "Please speak your question clearly after the beep."},
    {"name": "orca-speak-prompt-ta", "lang": "ta", "voice": "ta-IN-PallaviNeural", "text": "பீப் ஒலிக்குப் பிறகு உங்கள் கேள்வியைத் தெளிவாகப் பேசவும்."},
    {"name": "orca-speak-prompt-hi", "lang": "hi", "voice": "hi-IN-MadhurNeural", "text": "बीप के बाद अपना प्रश्न स्पष्ट रूप से बोलें।"},
    {"name": "orca-speak-prompt-te", "lang": "te", "voice": "te-IN-ShrutiNeural", "text": "బీప్ తర్వాత మీ ప్రశ్నను స్పష్టంగా మాట్లాడండి."},
    {"name": "orca-speak-prompt-ml", "lang": "ml", "voice": "ml-IN-SobhanaNeural", "text": "ബീപ് ശബ്ദത്തിന് ശേഷം നിങ്ങളുടെ ചോദ്യം വ്യക്തമായി പറയുക."},
    {"name": "orca-speak-prompt-kn", "lang": "kn", "voice": "kn-IN-SapnaNeural", "text": "ಬೀಪ್ ನಂತರ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ."},
    {"name": "orca-speak-prompt-bn", "lang": "bn", "voice": "bn-IN-TanishaaNeural", "text": "বিপ শব্দের পর আপনার প্রশ্নটি স্পষ্টভাবে বলুন।"},
    {"name": "orca-speak-prompt-gu", "lang": "gu", "voice": "gu-IN-DhwaniNeural", "text": "બીપ પછી તમારો પ્રશ્ન સ્પષ્ટ રીતે બોલો."},
    {"name": "orca-speak-prompt-mr", "lang": "mr", "voice": "mr-IN-AarohiNeural", "text": "बीप नंतर आपला प्रश्न स्पष्टपणे बोला."},
    {"name": "orca-speak-prompt-or", "lang": "or", "voice": "hi-IN-MadhurNeural", "text": "बीप शब्द परे आपणङ्क प्रश्न स्पष्ट भावरे कुहन्तु।"},
]

# 5. Question service menus for all 10 languages (Options 1 to 8 + Option 9 for direct voice question)
QUESTION_MENUS = [
    {
        "name": "orca-question-menu",
        "lang": "en",
        "voice": "en-IN-NeerjaNeural",
        "text": (
            "Select a marine service. "
            "Press 1 for the nearest Potential Fishing Zone. "
            "Press 2 to check whether it is safe to venture into the sea tomorrow morning. "
            "Press 3 for tide, weather and sea conditions. "
            "Press 4 for lightning or cyclone alerts. "
            "Press 5 for high chlorophyll and favourable sea surface temperature regions. "
            "Press 6 for the safest route for your fishing vessel. "
            "Press 7 to understand fish productivity decline. "
            "Press 8 for zones to avoid due to hazards or restrictions. "
            "Press 9 to ask your own voice question directly to ORCA."
        ),
    },
    {
        "name": "orca-question-menu-tamil",
        "lang": "ta",
        "voice": "ta-IN-PallaviNeural",
        "text": (
            "கடல்சார் சேவையைத் தேர்ந்தெடுக்கவும். "
            "அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலத்தை அறிய ஒன்றை அழுத்தவும். "
            "நாளை காலை கடலுக்குச் செல்வது பாதுகாப்பானதா என்பதை அறிய இரண்டை அழுத்தவும். "
            "அலைகள், வானிலை மற்றும் கடல் நிலவரங்களை அறிய மூன்றை அழுத்தவும். "
            "இடிமின்னல் அல்லது புயல் எச்சரிக்கைகளுக்கு நான்கை அழுத்தவும். "
            "அதிக குளோரோபில் மற்றும் சாதகமான கடல் வெப்பநிலை பகுதிகளை அறிய ஐந்தை அழுத்தவும். "
            "உங்கள் மீன்பிடி படகுக்கான பாதுகாப்பான வழித்தடத்தை அறிய ஆறே அழுத்தவும். "
            "மீன் உற்பத்தித்திறன் குறைவு குறித்து அறிய ஏழை அழுத்தவும். "
            "ஆபத்து அல்லது கட்டுப்பாடுகள் காரணமாக தவிர்க்க வேண்டிய பகுதிகளை அறிய எட்டே அழுத்தவும். "
            "நீங்கள் நேரடியாகப் பேசி உங்கள் கேள்வியைக் கேட்க ஒன்பதே அழுத்தவும்."
        ),
    },
    {
        "name": "orca-question-menu-hindi",
        "lang": "hi",
        "voice": "hi-IN-MadhurNeural",
        "text": (
            "समुद्री सेवा का चयन करें। "
            "निकटतम संभावित मछली पकड़ने के क्षेत्र के लिए 1 दबाएं। "
            "कल सुबह समुद्र में जाना सुरक्षित है या नहीं, यह जानने के लिए 2 दबाएं। "
            "ज्वार-भाटा, मौसम और समुद्र की स्थिति के लिए 3 दबाएं। "
            "बिजली गिरने या चक्रवात की चेतावनी के लिए 4 दबाएं। "
            "उच्च क्लोरोफिल और अनुकूल समुद्री सतह तापमान वाले क्षेत्रों के लिए 5 दबाएं। "
            "अपनी नाव के लिए सबसे सुरक्षित मार्ग जानने के लिए 6 दबाएं। "
            "मछली उत्पादन में गिरावट को समझने के लिए 7 दबाएं। "
            "खतरे या प्रतिबंधों के कारण बचने वाले क्षेत्रों की जानकारी के लिए 8 दबाएं। "
            "सीधे बोलकर अपना प्रश्न पूछने के लिए 9 दबाएं।"
        ),
    },
    {
        "name": "orca-question-menu-telugu",
        "lang": "te",
        "voice": "te-IN-ShrutiNeural",
        "text": (
            "సముద్ర సేవను ఎంచుకోండి. "
            "సమీప సంభావ్య చేపల వేట ప్రాంతం కోసం 1 నొక్కండి. "
            "రేపు ఉదయం సముద్రంలోకి వెళ్లడం సురక్షితమేనా అని తెలుసుకోవడానికి 2 నొక్కండి. "
            "అలలు, వాతావరణం మరియు సముద్ర పరిస్థితుల కోసం 3 నొక్కండి. "
            "పిడుగుపాటు లేదా తుఫాను హెచ్చరికల కోసం 4 నొక్కండి. "
            "అధిక క్లోరోఫిల్ మరియు అనుకూలమైన సముద్ర ఉపరితల ఉష్ణోగ్రత ప్రాంతాల కోసం 5 నొక్కండి. "
            "మీ చేపల వేట పడవ కోసం అత్యంత సురక్షితమైన మార్గం కోసం 6 నొక్కండి. "
            "చేపల ఉత్పాదకత తగ్గుదల గురించి తెలుసుకోవడానికి 7 నొక్కండి. "
            "ప్రమాదాలు లేదా ఆంక్షల కారణంగా నివారించాల్సిన ప్రాంతాల కోసం 8 నొక్కండి. "
            "మీరు స్వయంగా మాట్లాడి మీ ప్రశ్నను అడగడానికి 9 నొక్కండి."
        ),
    },
    {
        "name": "orca-question-menu-malayalam",
        "lang": "ml",
        "voice": "ml-IN-SobhanaNeural",
        "text": (
            "സമുദ്ര സേവനം തിരഞ്ഞെടുക്കുക. "
            "ഏറ്റവും അടുത്തുള്ള ഫിഷിംഗ് സോൺ അറിയാൻ 1 അമർത്തുക. "
            "നാളെ രാവിലെ കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ എന്നറിയാൻ 2 അമർത്തുക. "
            "വേലിയേറ്റം, കാലാവസ്ഥ, കടൽ അവസ്ഥകൾ എന്നിവ അറിയാൻ 3 അമർത്തുക. "
            "മിന്നൽ അല്ലെങ്കിൽ ചുഴലിക്കാറ്റ് മുന്നറിയിപ്പുകൾക്ക് 4 അമർത്തുക. "
            "ഉയർന്ന ക്ലോറോഫിൽ ഉള്ള സമുദ്ര മേഖലകൾക്ക് 5 അമർത്തുക. "
            "നിങ്ങളുടെ ബോട്ടിനുള്ള ഏറ്റവും സുരക്ഷിതമായ വഴിക്ക് 6 അമർത്തുക. "
            "മത്സ്യ ലഭ്യത കുറവ് മനസ്സിലാക്കാൻ 7 അമർത്തുക. "
            "ഒഴിവാക്കേണ്ട അപകട മേഖലകൾക്ക് 8 അമർത്തുക. "
            "നിങ്ങൾക്ക് സംസാരിച്ച് ചോദ്യം ചോദിക്കുന്നതിനായി 9 അമർത്തുക."
        ),
    },
    {
        "name": "orca-question-menu-kannada",
        "lang": "kn",
        "voice": "kn-IN-SapnaNeural",
        "text": (
            "ಸಮುದ್ರ ಸೇವೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ. "
            "ಹತ್ತಿರದ ಮೀನುಗಾರಿಕೆ ವಲಯಕ್ಕಾಗಿ 1 ಒತ್ತಿರಿ. "
            "ನಾಳೆ ಮುಂಜಾನೆ ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವುದು ಸುರಕ್ಷಿತವೇ ಎಂದು ತಿಳಿಯಲು 2 ಒತ್ತಿರಿ. "
            "ಉಬ್ಬರವಿಳಿತ, ಹವಾಮಾನ ಮತ್ತು ಸಮುದ್ರದ ಪರಿಸ್ಥಿತಿಗಾಗಿ 3 ಒತ್ತಿರಿ. "
            "ಮಿಂಚು ಅಥವಾ ಚಂಡಮಾರುತದ ಎಚ್ಚರಿಕೆಗಾಗಿ 4 ಒತ್ತಿರಿ. "
            "ಹೆಚ್ಚಿನ ಕ್ಲೋರೊಫಿಲ್ ಸಮುದ್ರ ಪ್ರದೇಶಗಳಿಗಾಗಿ 5 ಒತ್ತಿರಿ. "
            "ನಿಮ್ಮ ದೋಣಿಯ ಸುರಕ್ಷಿತ ಮಾರ್ಗಕ್ಕಾಗಿ 6 ಒತ್ತಿರಿ. "
            "ಮೀನು ಉತ್ಪಾದಕತೆ ಕುಸಿತದ ಬಗ್ಗೆ ತಿಳಿಯಲು 7 ಒತ್ತಿರಿ. "
            "ಅಪಾಯಕಾರಿ ಪ್ರದೇಶಗಳ ಮಾಹಿತಿಗಾಗಿ 8 ಒತ್ತಿರಿ. "
            "ನೀವು ನೇರವಾಗಿ ಮಾತನಾಡಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಲು 9 ಒತ್ತಿರಿ."
        ),
    },
    {
        "name": "orca-question-menu-bengali",
        "lang": "bn",
        "voice": "bn-IN-TanishaaNeural",
        "text": (
            "সামুদ্রিক সেবা নির্বাচন করুন। "
            "নিকটতম সম্ভাব্য মাছ ধরার এলাকার জন্য 1 টিপুন। "
            "আগামীকাল সকালে সমুদ্রে যাওয়া নিরাপদ কিনা তা জানতে 2 টিপুন। "
            "জোয়ার-ভাটা, আবহাওয়া এবং সমুদ্রের অবস্থার জন্য 3 টিপুন। "
            "বজ্রপাত বা ঘূর্ণিঝড় সতর্কতার জন্য 4 টিপুন। "
            "উচ্চ ক্লোরোফিলযুক্ত সমুদ্র অঞ্চলের জন্য 5 টিপুন। "
            "আপনার নৌকার সবচেয়ে নিরাপদ পথের জন্য 6 টিপুন। "
            "মাছের উৎপাদন হ্রাস বুঝতে 7 টিপুন। "
            "বিপজ্জনক এলাকা এড়াতে 8 টিপুন। "
            "আপনি সরাসরি কথা বলে নিজের প্রশ্ন জিজ্ঞাসা করতে 9 টিপুন।"
        ),
    },
    {
        "name": "orca-question-menu-gujarati",
        "lang": "gu",
        "voice": "gu-IN-DhwaniNeural",
        "text": (
            "દરિયાઈ સેવા પસંદ કરો. "
            "નજીકના સંભવિત માછીમારી ક્ષેત્ર માટે 1 દબાવો. "
            "આવતીકાલે સવારે દરિયામાં જવું સલામત છે કે નહીં તે જાણવા 2 દબાવો. "
            "ભરતી, હવામાન અને દરિયાની સ્થિતિ માટે 3 દબાવો. "
            "વીજળી અથવા વાવાઝોડાની ચેતવણી માટે 4 દબાવો. "
            "ઉચ્ચ ક્લોરોફિલ ધરાવતા દરિયાઈ વિસ્તારો માટે 5 દબાવો. "
            "તમારી બોટ માટે સૌથી સુરક્ષિત માર્ગ માટે 6 દબાવો. "
            "માછલીના ઉત્પાદનમાં ઘટાડો સમજવા 7 દબાવો. "
            "જોખમી વિસ્તારો ટાળવા માટે 8 દબાવો. "
            "તમે સીધા બોલીને તમારો પ્રશ્ન પૂછવા માટે 9 દબાવો."
        ),
    },
    {
        "name": "orca-question-menu-marathi",
        "lang": "mr",
        "voice": "mr-IN-AarohiNeural",
        "text": (
            "सागरी सेवा निवडा. "
            "जवळच्या संभाव्य मासेमारी क्षेत्रासाठी 1 दाबा. "
            "उद्या सकाळी समुद्रात जाणे सुरक्षित आहे का हे जाणून घेण्यासाठी 2 दाबा. "
            "भरती-ओहोटी, हवामान आणि समुद्राच्या स्थितीसाठी 3 दाबा. "
            "वीज पडणे किंवा चक्रीवादळाच्या इशाऱ्यासाठी 4 दाबा. "
            "उच्च क्लोरोफिल असलेल्या सागरी क्षेत्रांसाठी 5 दाबा. "
            "आपल्या बोटीसाठी सर्वात सुरक्षित मार्गासाठी 6 दाबा. "
            "मासे उत्पादन घट समजून घेण्यासाठी 7 दाबा. "
            "धोकादायक क्षेत्रे टाळण्यासाठी 8 दाबा. "
            "तुम्ही थेट बोलून आपला प्रश्न विचारण्यासाठी 9 दाबा."
        ),
    },
    {
        "name": "orca-question-menu-odia",
        "lang": "or",
        "voice": "hi-IN-MadhurNeural",
        "text": (
            "सामुद्रिक सेवा चयन करन्तु। "
            "निकटतम सम्भाव्य माछ धरिबा अञ्चल पाइँ 1 दबान्तु। "
            "आसन्ताकालि सकाळे समुद्रकु ज़िबा सुरक्षित कि नुहें जाणिबा पाइँ 2 दबान्तु। "
            "जुआर-भट्टा, पाणीपाग एवं समुद्र अवस्था पाइँ 3 दबान्तु। "
            "बज्रपात किंवा बात्या चेतावनी पाइँ 4 दबान्तु। "
            "उच्च क्लोरोफिल समुद्र अञ्चल पाइँ 5 दबान्तु। "
            "आपणङ्क डङ्गा पाइँ सबुठारु सुरक्षित रास्ता पाइँ 6 दबान्तु। "
            "माछ उत्पादन ह्रास बुझिबा पाइँ 7 दबान्तु। "
            "विपदपूर्ण अञ्चल एड़ाइबा पाइँ 8 दबान्तु। "
            "सीधासळख निज प्रश्न कहिबा पाइँ 9 दबान्तु।"
        ),
    },
]


async def convert_text_to_wav(text: str, voice: str, output_wav: Path, force: bool = False):
    """Generates audio via edge-tts and converts to 8kHz 16-bit mono PCM WAV."""
    if not force and output_wav.exists() and output_wav.stat().st_size > 1000:
        print(f"  ⚡ Already exists: {output_wav.name} ({output_wav.stat().st_size} bytes)")
        return

    temp_mp3 = output_wav.parent / f"_{output_wav.stem}.mp3"
    max_retries = 4
    for attempt in range(1, max_retries + 1):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(temp_mp3))
            break
        except Exception as e:
            if attempt < max_retries:
                print(f"    ⚠️ Warning on {output_wav.name} (attempt {attempt}/{max_retries}): {e}. Retrying in 2s...")
                await asyncio.sleep(2 * attempt)
            else:
                raise e

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(temp_mp3),
            "-acodec", "pcm_s16le",
            "-ac", "1",
            "-ar", "8000",
            str(output_wav)
        ],
        check=True,
        capture_output=True
    )
    if temp_mp3.exists():
        temp_mp3.unlink(missing_ok=True)
    print(f"  ✅ Generated: {output_wav.name} ({output_wav.stat().st_size} bytes)")


async def create_main_menu():
    print("🎙️ Generating Multilingual Main Language Menu (10 Languages)...")
    temp_wavs = []
    
    silence_wav = VOICE_DIR / "_silence.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.35", "-acodec", "pcm_s16le", str(silence_wav)],
        check=True,
        capture_output=True
    )

    for seg in MENU_SEGMENTS:
        seg_wav = VOICE_DIR / f"_seg_{seg['lang']}.wav"
        print(f"   [{seg['lang'].upper()}] {seg['voice']}: \"{seg['text']}\"")
        await convert_text_to_wav(seg["text"], seg["voice"], seg_wav, force=True)
        temp_wavs.append(seg_wav)

    inputs = []
    for w in temp_wavs:
        inputs.extend(["-i", str(w)])
    inputs.extend(["-i", str(silence_wav)])
    silence_idx = len(temp_wavs)

    filter_parts = []
    for i in range(len(temp_wavs)):
        filter_parts.append(f"[{i}:a]")
        if i < len(temp_wavs) - 1:
            filter_parts.append(f"[{silence_idx}:a]")
    
    total_chunks = len(temp_wavs) + (len(temp_wavs) - 1)
    filter_str = "".join(filter_parts) + f"concat=n={total_chunks}:v=0:a=1[out]"

    wav_output = VOICE_DIR / "orca-language-menu.wav"
    cmd_wav = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_str,
        "-map", "[out]",
        "-acodec", "pcm_s16le",
        "-ar", "8000",
        "-ac", "1",
        str(wav_output)
    ]
    subprocess.run(cmd_wav, check=True, capture_output=True)
    print(f"  🎉 Created Master Language Menu: {wav_output.name} ({wav_output.stat().st_size} bytes)")

    for w in temp_wavs:
        w.unlink(missing_ok=True)
    silence_wav.unlink(missing_ok=True)


async def create_all_prompts(force_menus: bool = True):
    print("\n🎙️ Generating Confirmation Prompts...")
    for item in INDIVIDUAL_PROMPTS:
        wav_path = VOICE_DIR / f"{item['name']}.wav"
        await convert_text_to_wav(item["text"], item["voice"], wav_path)

    print("\n🎙️ Generating Processing Prompts...")
    for item in PROCESSING_PROMPTS:
        wav_path = VOICE_DIR / f"{item['name']}.wav"
        await convert_text_to_wav(item["text"], item["voice"], wav_path)

    print("\n🎙️ Generating Speak Question Prompts (Option 9)...")
    for item in SPEAK_PROMPTS:
        wav_path = VOICE_DIR / f"{item['name']}.wav"
        await convert_text_to_wav(item["text"], item["voice"], wav_path)

    print("\n🎙️ Generating Question Menus (Options 1-9)...")
    for item in QUESTION_MENUS:
        wav_path = VOICE_DIR / f"{item['name']}.wav"
        await convert_text_to_wav(item["text"], item["voice"], wav_path, force=force_menus)


def copy_to_asterisk():
    print("\n📦 Copying all WAV files to Asterisk sound directories...")
    cmd = (
        "cp -f /mnt/e/sih/voice/orca-*.wav /usr/share/asterisk/sounds/ && "
        "cp -f /mnt/e/sih/voice/orca-*.wav /var/lib/asterisk/sounds/ && "
        "chown asterisk:asterisk /usr/share/asterisk/sounds/orca-*.wav /var/lib/asterisk/sounds/orca-*.wav && "
        "chmod 664 /usr/share/asterisk/sounds/orca-*.wav /var/lib/asterisk/sounds/orca-*.wav"
    )
    res = subprocess.run(["wsl", "-u", "root", "sh", "-c", cmd], capture_output=True, text=True)
    if res.returncode == 0:
        print("  🎉 Successfully copied all audio prompts and set permissions on Asterisk sound files!")
    else:
        print(f"  ❌ Error copying to Asterisk: {res.stderr}")


async def main():
    print("============================================================")
    print("🚀 ORCA IVR 10-Language Audio Prompt Generator")
    print("============================================================\n")
    # Regenerate all question menus to guarantee Option 9 is spoken in every single language!
    await create_all_prompts(force_menus=True)
    copy_to_asterisk()
    print("\n============================================================")
    print("🎉 All 10-Language audio files regenerated and deployed to Asterisk!")
    print("============================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
