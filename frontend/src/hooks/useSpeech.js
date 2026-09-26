import { useState, useEffect, useRef, useCallback } from 'react'
import { endpoints } from '../api'

// ── BCP-47 Speech Recognition & Synthesis Language Map ────────────
export const SPEECH_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  or: 'or-IN',
}

export const VOICE_LANGUAGES = [
  { code: 'auto', label: '✨ Auto (AI Detect)', short: 'Auto AI', prompt: 'Speak in any language (Tamil, English, Hindi)... Whisper will auto-detect!' },
  { code: 'ta', label: 'தமிழ் (Tamil)', short: 'தமிழ்', prompt: 'பேசுங்கள்... தமிழில் தட்டச்சு செய்யப்படும்' },
  { code: 'en', label: 'English', short: 'EN', prompt: 'Speak now... typing in English' },
  { code: 'hi', label: 'हिंदी (Hindi)', short: 'हिंदी', prompt: 'बोलिए... हिंदी में टाइप हो रहा है' },
  { code: 'te', label: 'తెలుగు (Telugu)', short: 'తెలుగు', prompt: 'మాట్లాడండి... తెలుగులో టైప్ అవుతుంది' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', short: 'മലയാളം', prompt: 'സംസാരിക്കൂ... മലയാളത്തിൽ ടൈപ്പ് ചെയ്യുന്നു' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', short: 'ಕನ್ನಡ', prompt: 'ಮಾತನಾಡಿ... ಕನ್ನಡದಲ್ಲಿ ಟೈಪ್ ಆಗುತ್ತದೆ' },
  { code: 'bn', label: 'বাংলা (Bengali)', short: 'বাংলা', prompt: 'বলুন... বাংলায় টাইপ হচ্ছে' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', short: 'ગુજરાતી', prompt: 'બોલો... ગુજરાતીમાં ટાઈપ થઈ રહ્યું છે' },
  { code: 'mr', label: 'मराठी (Marathi)', short: 'मराठी', prompt: 'बोला... मराठीत टाईप होत आहे' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)', short: 'ଓଡ଼ିଆ', prompt: 'କୁହନ୍ତୁ... ଓଡ଼ିଆରେ ଟାଇପ୍ ହେଉଛି' },
]

/**
 * Automatically detects the language script from text content
 */
export function detectLanguageFromText(text) {
  if (!text) return 'en'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta' // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te' // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml' // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn' // Kannada
  if (/[\u0980-\u09FF]/.test(text)) return 'bn' // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu' // Gujarati
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or' // Odia
  if (/[\u0900-\u097F]/.test(text)) return 'hi' // Hindi / Marathi
  return 'en'
}

/**
 * Strips markdown markup, links, tables and technical syntax
 * to generate smooth, natural-sounding voice output.
 */
export function cleanMarkdownForSpeech(text) {
  if (!text) return ''

  let clean = text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove tables: lines with pipes
    .replace(/^\|.*\|$/gm, ' ')
    // Remove markdown headers (# Title)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url) -> ''
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Replace coordinate degree notations like 10.94°N, 76.96°E with natural words
    .replace(/(\d+(?:\.\d+)?)\s*°\s*([NSEWnsew])/g, (m, num, dir) => {
      const dirMap = { n: 'North', s: 'South', e: 'East', w: 'West' }
      return `${num} degrees ${dirMap[dir.toLowerCase()] || dir}`
    })
    .replace(/°/g, ' degrees ')
    // Remove markdown symbols (*, _, ~, #) directly so no text is ever swallowed or deleted across lines
    .replace(/[*_~#]/g, '')
    // Remove list markers and arrows
    .replace(/^[\s+-›•]+\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Remove blockquote markers
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove emoji clusters, variation selectors (\ufe00-\ufe0f), and special symbols
    .replace(/[\ufe00-\ufe0f\u200d\u2600-\u27ff\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/gu, '')
    .replace(/[⚡🚨⚠️✓❌★☆•›►▶]/g, '')
    // Clean parentheses around coordinates and text
    .replace(/[()]/g, ' ')
    // Collapse excess whitespaces and linebreaks
    .replace(/\s+/g, ' ')
    .trim()

  return clean
}

/**
 * Custom hook for native browser Speech Recognition (STT) and Speech Synthesis (TTS)
 */
export function useSpeech(defaultLang = 'en') {
  // ── Speech Recognition State ──
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechError, setSpeechError] = useState(null)
  const recognitionRef = useRef(null)

  // ── Speech Synthesis State ──
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [activeSpeechId, setActiveSpeechId] = useState(null)
  const isSpeakingRef = useRef(false)
  const activeSpeechIdRef = useRef(null)
  const audioPlayerRef = useRef(null)
  const utteranceRef = useRef(null)

  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    activeSpeechIdRef.current = activeSpeechId
  }, [activeSpeechId])

  // Feature detection
  const isRecognitionSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const isSynthesisSupported = typeof window !== 'undefined' &&
    'speechSynthesis' in window

  // ── 1. Speech Recognition Setup & Controls ──────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const startListening = useCallback(({ lang = defaultLang, onResult, onFinal, onError } = {}) => {
    if (!isRecognitionSupported) {
      const msg = 'Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      setSpeechError(msg)
      if (onError) onError(msg)
      return
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
    }

    // Also stop any speaking TTS so mic doesn't catch own voice
    if (isSynthesisSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause()
        audioPlayerRef.current = null
      } catch {}
    }
    setIsSpeaking(false)
    setActiveSpeechId(null)

    setSpeechError(null)
    setInterimTranscript('')

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRec()
    recognitionRef.current = recognition

    const langKey = (lang || defaultLang || 'en').toLowerCase()
    const bcp47 = SPEECH_LANG_MAP[langKey] || lang || 'en-IN'
    recognition.lang = bcp47
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setSpeechError(null)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      // Iterate through all results to prevent losing earlier finalized words
      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i]
        const transcriptText = item[0]?.transcript || ''
        if (item.isFinal) {
          finalTranscript += transcriptText + ' '
        } else {
          interimTranscript += transcriptText
        }
      }

      const currentText = (finalTranscript + interimTranscript).trim()
      setInterimTranscript(currentText)

      if (onResult && currentText) {
        onResult(currentText, false)
      }

      if (finalTranscript.trim() && onFinal) {
        onFinal(finalTranscript.trim())
      }
    }

    recognition.onerror = (event) => {
      let errMessage = 'Voice recognition error.'
      if (event.error === 'not-allowed') {
        errMessage = 'Microphone access was denied. Please allow microphone permissions in your browser.'
      } else if (event.error === 'no-speech') {
        errMessage = 'No speech detected. Please speak clearly into your microphone.'
      } else if (event.error === 'network') {
        errMessage = 'Network connection required for speech recognition.'
      } else if (event.error !== 'aborted') {
        errMessage = `Speech error: ${event.error}`
      }

      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setSpeechError(errMessage)
        if (onError) onError(errMessage)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch (e) {
      console.warn('Speech recognition start failed:', e)
      setIsListening(false)
    }
  }, [isRecognitionSupported, defaultLang, isSynthesisSupported])

  const toggleListening = useCallback((options = {}) => {
    if (isListening) {
      stopListening()
    } else {
      startListening(options)
    }
  }, [isListening, startListening, stopListening])

  // ── 2. Speech Synthesis Setup & Controls ────────────────────────
  const stopSpeaking = useCallback(() => {
    if (isSynthesisSupported) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.currentTime = 0
        audioPlayerRef.current = null
      } catch {}
    }
    utteranceRef.current = null
    if (typeof window !== 'undefined') {
      window._activeSpeechUtterance = null
    }
    setIsSpeaking(false)
    setActiveSpeechId(null)
  }, [isSynthesisSupported])

  const speak = useCallback((text, { lang = defaultLang, id = 'default', onStart, onEnd } = {}) => {
    // If already speaking this specific id, toggle to stop
    if (isSpeakingRef.current && activeSpeechIdRef.current === id) {
      stopSpeaking()
      return
    }

    // Stop any ongoing speech or audio
    stopSpeaking()

    const cleanText = cleanMarkdownForSpeech(text)
    if (!cleanText) return

    // Auto-detect script if language is generic or mismatched
    const detectedLang = detectLanguageFromText(cleanText)
    const effectiveLang = (lang && lang !== 'en' && lang !== 'auto') ? lang : (detectedLang !== 'en' ? detectedLang : (lang || 'en'))
    const targetLangCode = SPEECH_LANG_MAP[effectiveLang] || effectiveLang || 'en-IN'

    // Fallback: WebSpeech sequential sentence chunker
    const playWebSpeechFallback = () => {
      if (!isSynthesisSupported) {
        setIsSpeaking(false)
        setActiveSpeechId(null)
        return
      }

      try {
        window.speechSynthesis.cancel()
      } catch {}

      const voices = window.speechSynthesis.getVoices() || []
      const match = voices.find(v => {
        const vl = (v.lang || '').toLowerCase().replace('_', '-')
        return vl.startsWith(targetLangCode.toLowerCase()) || vl.startsWith(effectiveLang)
      }) || voices.find(v => (v.lang || '').toLowerCase().startsWith('en'))

      // Split text into natural sentence/clause chunks to prevent Chrome utterance timeouts
      const rawSentences = cleanText.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [cleanText]
      const sentences = rawSentences.map(s => s.trim()).filter(Boolean)
      let currentIndex = 0

      const speakNextChunk = () => {
        if (currentIndex >= sentences.length) {
          setIsSpeaking(false)
          setActiveSpeechId(null)
          utteranceRef.current = null
          if (typeof window !== 'undefined') window._activeSpeechUtterance = null
          if (onEnd) onEnd()
          return
        }

        const sentenceText = sentences[currentIndex]
        const utterance = new SpeechSynthesisUtterance(sentenceText)
        utterance.lang = targetLangCode
        utterance.rate = 1.0
        utterance.pitch = 1.0
        if (match) utterance.voice = match

        utteranceRef.current = utterance
        if (typeof window !== 'undefined') window._activeSpeechUtterance = utterance

        utterance.onstart = () => {
          if (currentIndex === 0) {
            setIsSpeaking(true)
            setActiveSpeechId(id)
            if (onStart) onStart()
          }
        }

        utterance.onend = () => {
          currentIndex++
          speakNextChunk()
        }

        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            console.warn('WebSpeech chunk error:', e)
          }
          currentIndex++
          if (currentIndex < sentences.length && e.error !== 'canceled') {
            speakNextChunk()
          } else {
            setIsSpeaking(false)
            setActiveSpeechId(null)
            utteranceRef.current = null
            if (typeof window !== 'undefined') window._activeSpeechUtterance = null
          }
        }

        window.speechSynthesis.speak(utterance)
      }

      speakNextChunk()
    }

    // Primary: High-Definition Streaming Neural TTS via backend (handles English and all Indian languages cleanly without cutting off)
    try {
      const audioUrl = `/api/voice/tts?text=${encodeURIComponent(cleanText.slice(0, 2500))}&lang=${effectiveLang}`
      const audio = new Audio(audioUrl)
      audioPlayerRef.current = audio

      audio.onplay = () => {
        setIsSpeaking(true)
        setActiveSpeechId(id)
        if (onStart) onStart()
      }

      audio.onended = () => {
        setIsSpeaking(false)
        setActiveSpeechId(null)
        audioPlayerRef.current = null
        if (onEnd) onEnd()
      }

      audio.onerror = (e) => {
        console.warn('Streaming TTS error, falling back to WebSpeech:', e)
        audioPlayerRef.current = null
        playWebSpeechFallback()
      }

      audio.play().catch(e => {
        console.warn('Streaming TTS play failed, falling back to WebSpeech:', e)
        audioPlayerRef.current = null
        playWebSpeechFallback()
      })
    } catch (err) {
      console.warn('Audio construction failed, falling back to WebSpeech:', err)
      playWebSpeechFallback()
    }
  }, [defaultLang, isSynthesisSupported, stopSpeaking])

  // ── 3. AI Whisper Auto-Language Recording Setup & Controls ──────
  const [isAiRecording, setIsAiRecording] = useState(false)
  const [isAiTranscribing, setIsAiTranscribing] = useState(false)
  const [aiDetectedLang, setAiDetectedLang] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const startAiRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.')
      }

      setSpeechError(null)
      audioChunksRef.current = []
      setAiDetectedLang(null)

      if (isSynthesisSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        setActiveSpeechId(null)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstart = () => {
        setIsAiRecording(true)
      }

      recorder.start(250)
    } catch (err) {
      console.warn('AI Mic recorder error:', err)
      setSpeechError(err.message || 'Microphone access denied.')
      setIsAiRecording(false)
    }
  }, [isSynthesisSupported])

  const stopAiRecording = useCallback(async ({ onTranscribed } = {}) => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        setIsAiRecording(false)
        resolve(null)
        return
      }

      recorder.onstop = async () => {
        setIsAiRecording(false)
        setIsAiTranscribing(true)

        if (recorder.stream) {
          recorder.stream.getTracks().forEach(track => track.stop())
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        audioChunksRef.current = []

        try {
          const formData = new FormData()
          formData.append('file', audioBlob, 'audio.webm')

          const res = await endpoints.transcribeVoice(formData)
          const data = res.data
          setIsAiTranscribing(false)
          setAiDetectedLang(data.language)

          if (onTranscribed) {
            onTranscribed(data)
          }
          resolve(data)
        } catch (err) {
          console.warn('Whisper transcription error:', err)
          setIsAiTranscribing(false)
          const errDetail = err.response?.data?.detail || err.message || 'Whisper transcription failed.'
          setSpeechError(errDetail)
          resolve(null)
        }
      }

      recorder.stop()
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          }
        } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel() } catch {}
      }
    }
  }, [])

  return {
    // Recognition
    isListening,
    interimTranscript,
    speechError,
    setSpeechError,
    startListening,
    stopListening,
    toggleListening,
    isRecognitionSupported,

    // Synthesis
    isSpeaking,
    activeSpeechId,
    speak,
    stopSpeaking,
    isSynthesisSupported,

    // AI Whisper Auto-Detection
    isAiRecording,
    isAiTranscribing,
    aiDetectedLang,
    startAiRecording,
    stopAiRecording,
  }
}

export default useSpeech
