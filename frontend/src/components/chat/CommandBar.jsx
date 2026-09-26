import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'
import { sendChatMessage } from '../../services/chatService'
import { parseORCAResponse } from '../../services/parseResponse'
import AgentLiveLoading from './AgentLiveLoading'
import { useSpeech, VOICE_LANGUAGES } from '../../hooks/useSpeech'
import {
  Search, Mic, MicOff, Send, X, Clock,
  Waves, Loader2, Info, Zap, RotateCcw, Copy, Check,
  BookOpen, Bot, Sparkles, Volume2, VolumeX, ChevronDown
} from 'lucide-react'

const LS_HISTORY = 'orca_cmd_history'
const MAX_HISTORY = 50

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || localStorage.getItem('ocra_cmd_history') || '[]') }
  catch { return [] }
}
function saveHistory(h) {
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(0, MAX_HISTORY))) }
  catch { /* ignore */ }
}

const HERO_PILL_KEYS = [
  { key: 'cmd.preset_safety', defaultText: 'Is it safe to go fishing today?' },
  { key: 'cmd.preset_cyclone', defaultText: 'Cyclone alert status' },
  { key: 'cmd.preset_pfz', defaultText: 'Nearest PFZ coordinates' },
  { key: 'cmd.preset_ban', defaultText: 'Check seasonal fishing ban' },
  { key: 'cmd.preset_route', defaultText: 'Route from Chennai to Tuticorin' },
]

// ── Verdict Badge ────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  if (!verdict) return null
  const s = verdict.style
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <span className="text-sm leading-none">{verdict.icon}</span>
      {verdict.label}
    </span>
  )
}

// ── Confidence Bar ────────────────────────────────────────────────
function ConfidenceBar({ confidence }) {
  const { t } = useGlobal()
  if (confidence === null || confidence === undefined) return null
  const color = confidence >= 75 ? 'bg-safeGreen'
              : confidence >= 50 ? 'bg-warningAmber'
              : 'bg-dangerRed'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-textMuted font-medium w-20 flex-shrink-0">{t ? t("Confidence") : "Confidence"}</span>
      <div className="flex-1 h-1.5 bg-surfaceMid rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-textSecond w-8 text-right">{confidence}%</span>
    </div>
  )
}

// ── ORCA Response Renderer ────────────────────────────────────────
function ORCAResponse({ raw, timestamp, speech, language = 'en' }) {
  const { t } = useGlobal()
  const [copied, setCopied] = useState(false)
  const { verdict, confidence, text } = parseORCAResponse(raw)
  const isThisSpeaking = speech?.isSpeaking && speech?.activeSpeechId === 'cmdbar-response'

  function handleCopy() {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleToggleTTS() {
    if (!speech) return
    speech.speak(raw, { lang: language, id: 'cmdbar-response' })
  }

  return (
    <div className="space-y-3 p-4 bg-white rounded-2xl border border-borderLight shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center flex-shrink-0 shadow-sm">
            <Waves size={13} className="text-saffron" />
          </div>
          <div>
            <span className="text-sm font-bold text-navy">{t ? t("ORCA Intelligence") : "ORCA Intelligence"}</span>
            {timestamp && (
              <span className="text-[10px] text-textMuted ml-2">
                {new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {verdict && <VerdictBadge verdict={verdict} />}
          
          {/* Read Aloud Button */}
          {speech && (
            <button
              onClick={handleToggleTTS}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                isThisSpeaking
                  ? 'bg-oceanBlue text-white shadow-xs'
                  : 'hover:bg-surface text-textMuted hover:text-navy'
              }`}
              title={isThisSpeaking ? 'Stop reading' : 'Read answer aloud (Free Browser TTS)'}
            >
              {isThisSpeaking ? (
                <>
                  <VolumeX size={14} />
                  <span className="flex items-center gap-0.5 ml-0.5">
                    <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-0.5 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </>
              ) : (
                <Volume2 size={14} />
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-surface text-textMuted hover:text-navy transition-colors cursor-pointer"
            title="Copy response"
          >
            {copied ? <Check size={14} className="text-safeGreen" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {confidence !== null && <ConfidenceBar confidence={confidence} />}

      <div className="prose prose-sm max-w-none text-textSecond">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-base font-bold text-navy mt-3 mb-1">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-bold text-navy mt-3 mb-1">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-navy mt-2 mb-1">{children}</h3>,
            p:  ({ children }) => <p  className="text-sm text-textSecond leading-relaxed mb-2">{children}</p>,
            ul: ({ children }) => <ul className="space-y-1 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="space-y-1 mb-2 list-decimal list-inside">{children}</ol>,
            li: ({ children }) => (
              <li className="flex items-start gap-1.5 text-sm text-textSecond">
                <span className="text-oceanBlue mt-1 flex-shrink-0">›</span>
                <span>{children}</span>
              </li>
            ),
            strong: ({ children }) => <strong className="font-semibold text-navy">{children}</strong>,
            code:   ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-surfaceMid text-xs font-mono text-navy">{children}</code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-oceanBlue pl-3 py-1 bg-blue-50 rounded-r-lg my-2 text-sm text-textSecond italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default function CommandBar() {
  const { location, vessel, language = 'en', setLanguage, t } = useGlobal()
  const speech = useSpeech(language)
  const [showVoiceLangMenu, setShowVoiceLangMenu] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(loadHistory)
  const [chatHistory, setChatHistory] = useState([])
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = useCallback(async (textToSubmit) => {
    const q = (textToSubmit || query).trim()
    if (!q || loading) return

    setLoading(true)
    setError(null)
    setExpanded(true)

    // Save to history
    const newHistory = [q, ...history.filter(h => h !== q)]
    setHistory(newHistory)
    saveHistory(newHistory)

    try {
      const data = await sendChatMessage(q, {
        lat: location.lat,
        lon: location.lon,
        vessel,
        history: chatHistory,
        language,
      })
      setResponse({ raw: data.response, timestamp: data.timestamp })
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: q },
        { role: 'assistant', content: data.response },
      ].slice(-8))
      setQuery('')
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Connection failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [query, loading, location, vessel, history, chatHistory, language])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* ── Reference Hero Command Card ────────────────────────── */}
      <div className="bg-white rounded-3xl p-3.5 md:p-4 shadow-sm border border-borderLight flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 transition-all hover:shadow-md">

        {/* Friendly Robot Mascot Avatar (from Reference Image) */}
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 via-sky-50 to-white border border-blue-100 items-center justify-center flex-shrink-0 shadow-inner text-oceanBlue">
          <div className="relative">
            <Bot size={30} className="text-oceanBlue" />
            <Sparkles size={12} className="text-saffron absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>

        {/* Input & Quick Queries */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="relative flex items-center">
            <Search size={18} className="text-textMuted absolute left-2 pointer-events-none" />
            <input
              ref={inputRef}
              id="orca-command-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('Ask ORCA about sea conditions, cyclone path, PFZ, routes...')}
              className="w-full pl-9 pr-20 py-2 text-sm text-navy bg-transparent outline-none placeholder:text-textMuted font-medium"
              autoComplete="off"
              disabled={loading}
            />
            <div className="absolute right-2 hidden sm:flex items-center gap-1 text-[10px] text-textMuted font-mono bg-surface px-1.5 py-0.5 rounded border border-borderLight">
              Ctrl+K
            </div>
          </div>

          {/* Quick Query Pills */}
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar py-0.5">
            {HERO_PILL_KEYS.map((item, idx) => {
              const pill = t ? t(item.key, item.defaultText) : item.defaultText
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(pill)
                    handleSubmit(pill)
                  }}
                  className="px-3 py-1 rounded-full border border-borderLight text-xs text-textSecond hover:text-oceanBlue hover:border-oceanBlue/60 hover:bg-blue-50/50 transition-all font-medium whitespace-nowrap bg-surface cursor-pointer shadow-2xs"
                >
                  {pill}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions: Language Pill, Mic & Circular Send Button */}
        <div className="flex items-center justify-end gap-1.5 flex-shrink-0 self-end md:self-center">
          {/* Quick Voice Language Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVoiceLangMenu(prev => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-navy hover:text-oceanBlue bg-surface hover:bg-surfaceMid border border-borderLight transition-all cursor-pointer shadow-2xs"
              title="Change Speech Recognition Language"
            >
              <span className="text-xs">🗣️</span>
              <span>{VOICE_LANGUAGES.find(l => l.code === language)?.short || language.toUpperCase()}</span>
              <ChevronDown size={11} className={`text-textMuted transition-transform duration-150 ${showVoiceLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showVoiceLangMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-2xl shadow-xl border border-borderLight p-1.5 z-50 animate-slideIn">
                <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider px-2 py-1 border-b border-borderLight/60 mb-1">
                  {t("Speech Language")}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 no-scrollbar">
                  {VOICE_LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code)
                        setShowVoiceLangMenu(false)
                        if (speech.isListening) {
                          speech.stopListening()
                        }
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        language === l.code
                          ? 'bg-oceanBlue text-white shadow-2xs'
                          : 'hover:bg-surface text-textSecond'
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className={`text-[10px] font-mono uppercase ${language === l.code ? 'text-white/80' : 'text-textMuted'}`}>
                        {l.code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            id="orca-voice-btn"
            onClick={() => {
              if (language === 'auto') {
                if (speech.isAiRecording) {
                  speech.stopAiRecording({
                    onTranscribed: (data) => {
                      if (data?.text) setQuery(data.text)
                      if (data?.language && data.language !== 'auto') {
                        setLanguage(data.language)
                      }
                    }
                  })
                } else {
                  speech.startAiRecording()
                }
              } else {
                speech.toggleListening({
                  lang: language,
                  onResult: (text) => setQuery(text),
                  onFinal: (finalText) => {
                    setQuery(finalText)
                  },
                })
              }
            }}
            disabled={speech.isAiTranscribing}
            className={`p-2.5 rounded-full transition-all cursor-pointer ${
              speech.isAiRecording
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white ring-4 ring-purple-300 animate-pulse shadow-md'
                : speech.isListening
                ? 'bg-dangerRed text-white ring-4 ring-dangerRed/25 animate-pulse shadow-md'
                : speech.isAiTranscribing
                ? 'bg-surfaceMid text-oceanBlue cursor-wait animate-spin'
                : 'hover:bg-surface text-textSecond hover:text-oceanBlue'
            }`}
            title={
              speech.isAiRecording
                ? 'Listening with Whisper AI... Click to transcribe'
                : speech.isListening
                ? `Listening (${(VOICE_LANGUAGES.find(l => l.code === language)?.label || language)})... Click to finish`
                : speech.isAiTranscribing
                ? 'Whisper AI is transcribing...'
                : language === 'auto'
                ? 'Voice Query with Whisper Auto AI (Speaks Tamil, English, etc.)'
                : `Voice Query in ${VOICE_LANGUAGES.find(l => l.code === language)?.label || language} (Free Speech-to-Text)`
            }
          >
            {speech.isAiTranscribing ? (
              <Loader2 size={19} className="animate-spin text-purple-600" />
            ) : speech.isAiRecording || speech.isListening ? (
              <MicOff size={19} />
            ) : (
              <Mic size={19} />
            )}
          </button>

          <button
            id="orca-send-btn"
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
              query.trim() && !loading
                ? 'bg-oceanBlue hover:bg-blue-700 text-white active:scale-95'
                : 'bg-surfaceMid text-textMuted cursor-not-allowed'
            }`}
            title="Send query"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-oceanBlue" />
            ) : (
              <Send size={18} className="translate-x-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Active AI Whisper Recording Banner ───────────────────── */}
      {speech.isAiRecording && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-navy animate-pulse shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping flex-shrink-0" />
            <span className="font-bold text-purple-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
              {t("Whisper Auto-AI:")}
            </span>
            <span className="text-textSecond italic truncate">
              {t("Speak now in Tamil, English, Hindi, etc... Whisper will auto-detect your language!")}
            </span>
          </div>
          <button
            onClick={() => {
              speech.stopAiRecording({
                onTranscribed: (data) => {
                  if (data?.text) setQuery(data.text)
                  if (data?.language && data.language !== 'auto') {
                    setLanguage(data.language)
                  }
                }
              })
            }}
            className="text-[11px] font-bold text-purple-700 underline hover:opacity-80 cursor-pointer flex-shrink-0"
          >
            Stop &amp; Transcribe
          </button>
        </div>
      )}

      {/* ── AI Transcribing Spinner Banner ───────────────────────── */}
      {speech.isAiTranscribing && (
        <div className="px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-xs text-purple-800 shadow-sm">
          <Loader2 size={15} className="animate-spin text-purple-600 flex-shrink-0" />
          <span className="font-semibold">
            Faster-Whisper AI analyzing voice, detecting language &amp; transcribing...
          </span>
        </div>
      )}

      {/* ── Active Browser Voice Listening Banner ────────────────── */}
      {speech.isListening && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-red-50 via-amber-50 to-blue-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-navy animate-pulse shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-dangerRed animate-ping flex-shrink-0" />
            <span className="font-bold text-dangerRed uppercase tracking-wider text-[11px] whitespace-nowrap">
              Listening ({VOICE_LANGUAGES.find(l => l.code === language)?.short || language}):
            </span>
            <span className="text-textSecond italic truncate">
              {speech.interimTranscript || VOICE_LANGUAGES.find(l => l.code === language)?.prompt || 'Speak now in your chosen language...'}
            </span>
          </div>
          <button
            onClick={speech.stopListening}
            className="text-[11px] font-bold text-dangerRed underline hover:opacity-80 cursor-pointer flex-shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {/* ── Voice Error Notification ─────────────────────────────── */}
      {speech.speechError && (
        <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{speech.speechError}</span>
          </div>
          <button
            onClick={() => speech.setSpeechError(null)}
            className="text-[11px] font-bold text-amber-900 hover:opacity-75 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Expanded Intelligence Panel (When active) ──────────── */}
      {expanded && (loading || response || error) && (
        <div className="space-y-3 animate-slideIn">
          {/* Dismiss button */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Zap size={13} className="text-saffron" />
              Agent Intelligence Feed
            </span>
            <button
              onClick={() => {
                setExpanded(false)
                setResponse(null)
                setError(null)
              }}
              className="text-xs text-textMuted hover:text-navy flex items-center gap-1 cursor-pointer"
            >
              <X size={13} /> Close
            </button>
          </div>

          {/* Live Dynamic 100% Loading Indicator */}
          {loading && <AgentLiveLoading />}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-4 bg-dangerLight/60 border border-dangerRed/30 rounded-2xl flex items-start gap-3">
              <div className="p-1 rounded-full bg-dangerRed text-white">
                <X size={14} />
              </div>
              <div>
                <p className="text-sm font-bold text-dangerRed">Agent Communication Issue</p>
                <p className="text-xs text-dangerRed/90 mt-0.5">{error}</p>
                <button
                  onClick={() => handleSubmit(query)}
                  className="mt-2 text-xs font-bold text-dangerRed underline hover:opacity-80 cursor-pointer"
                >
                  Retry Query
                </button>
              </div>
            </div>
          )}

          {/* Live Response */}
          {response && !loading && (
            <ORCAResponse
              raw={response.raw}
              timestamp={response.timestamp}
              speech={speech}
              language={language}
            />
          )}
        </div>
      )}
    </div>
  )
}
