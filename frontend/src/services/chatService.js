import client from '../api/client'

/**
 * POST /api/chat
 * Polymorphic: accepts either sendChatMessage(message, opts) or sendChatMessage({ message, ...opts })
 * @param {string|object} messageOrPayload
 * @param {{ lat, lon, vessel, history, language, current_lat, current_lon, vessel_type }} [opts]
 * @returns {Promise<{ response, timestamp, user_id, agent_pipeline }>}
 */
export async function sendChatMessage(messageOrPayload, opts = {}) {
  let message = ''
  let lat = undefined
  let lon = undefined
  let vessel = 'fishing_trawler'
  let history = []
  let language = 'en'
  let userId = 'orca-frontend'

  if (typeof messageOrPayload === 'string') {
    message = messageOrPayload
    lat = opts.lat ?? opts.current_lat
    lon = opts.lon ?? opts.current_lon
    vessel = opts.vessel ?? opts.vessel_type ?? 'fishing_trawler'
    history = opts.history ?? []
    language = opts.language ?? 'en'
    userId = opts.user_id ?? opts.userId ?? 'orca-frontend'
  } else if (messageOrPayload && typeof messageOrPayload === 'object') {
    message = messageOrPayload.message || ''
    lat = messageOrPayload.lat ?? messageOrPayload.current_lat ?? opts.lat ?? opts.current_lat
    lon = messageOrPayload.lon ?? messageOrPayload.current_lon ?? opts.lon ?? opts.current_lon
    vessel = messageOrPayload.vessel ?? messageOrPayload.vessel_type ?? opts.vessel ?? opts.vessel_type ?? 'fishing_trawler'
    history = messageOrPayload.history ?? opts.history ?? []
    language = messageOrPayload.language ?? opts.language ?? 'en'
    userId = messageOrPayload.user_id ?? messageOrPayload.userId ?? opts.user_id ?? opts.userId ?? 'orca-frontend'
  }

  const cleanHistory = Array.isArray(history)
    ? history
        .filter(h => h && h.role && h.content)
        .map(h => ({
          role: String(h.role),
          content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
        }))
    : []

  const payload = {
    message: String(message || '').trim(),
    lat: lat != null && !isNaN(Number(lat)) ? Number(lat) : undefined,
    lon: lon != null && !isNaN(Number(lon)) ? Number(lon) : undefined,
    vessel_type: String(vessel || 'fishing_trawler'),
    user_id: String(userId || 'orca-frontend'),
    language: String(language || 'en'),
    history: cleanHistory,
  }

  const res = await client.post('/api/chat', payload)
  return res.data
}

/**
 * POST /api/chat/stream
 * Real-time Server-Sent Events (SSE) streaming of agent pipeline execution.
 * Streams live agent events (plan, agent_start, agent_complete, fusion, done).
 * @param {string|object} messageOrPayload
 * @param {Function} onEvent - Callback receiving each live event object
 * @param {object} [opts]
 * @returns {Promise<{ response, agent_pipeline }|null>}
 */
export async function streamChatMessage(messageOrPayload, onEvent, opts = {}) {
  let message = ''
  let lat = undefined
  let lon = undefined
  let vessel = 'fishing_trawler'
  let history = []
  let language = 'en'
  let userId = 'orca-frontend'

  if (typeof messageOrPayload === 'string') {
    message = messageOrPayload
    lat = opts.lat ?? opts.current_lat
    lon = opts.lon ?? opts.current_lon
    vessel = opts.vessel ?? opts.vessel_type ?? 'fishing_trawler'
    history = opts.history ?? []
    language = opts.language ?? 'en'
    userId = opts.user_id ?? opts.userId ?? 'orca-frontend'
  } else if (messageOrPayload && typeof messageOrPayload === 'object') {
    message = messageOrPayload.message || ''
    lat = messageOrPayload.lat ?? messageOrPayload.current_lat ?? opts.lat ?? opts.current_lat
    lon = messageOrPayload.lon ?? messageOrPayload.current_lon ?? opts.lon ?? opts.current_lon
    vessel = messageOrPayload.vessel ?? messageOrPayload.vessel_type ?? opts.vessel ?? opts.vessel_type ?? 'fishing_trawler'
    history = messageOrPayload.history ?? opts.history ?? []
    language = messageOrPayload.language ?? opts.language ?? 'en'
    userId = messageOrPayload.user_id ?? messageOrPayload.userId ?? opts.user_id ?? opts.userId ?? 'orca-frontend'
  }

  const cleanHistory = Array.isArray(history)
    ? history
        .filter(h => h && h.role && h.content)
        .map(h => ({
          role: String(h.role),
          content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
        }))
    : []

  const payload = {
    message: String(message || '').trim(),
    lat: lat != null && !isNaN(Number(lat)) ? Number(lat) : undefined,
    lon: lon != null && !isNaN(Number(lon)) ? Number(lon) : undefined,
    vessel_type: String(vessel || 'fishing_trawler'),
    user_id: String(userId || 'orca-frontend'),
    language: String(language || 'en'),
    history: cleanHistory,
  }

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    throw new Error(`Streaming failed with HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalDoneData = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6))
          if (parsed?.event === 'done') {
            finalDoneData = parsed
          }
          if (onEvent) onEvent(parsed)
        } catch (e) {
          console.debug('SSE parse error:', e)
        }
      }
    }
  }

  return finalDoneData
}

/**
 * POST /api/orca/query
 * Unified ORCA Intelligence Single Endpoint (Item 36)
 * @param {{ query: string, location?: object|array, vessel_type?: string, conversation_id?: string, language?: string }} params
 * @returns {Promise<{ answer: string, verdict: string, confidence: number, risks: string[], agents_used: string[], sources: string[], map_layers: string[], route: object|null, timestamp: string }>}
 */
export async function queryOrcaIntelligence({ query, location, vessel_type = 'small_boat', conversation_id, language = 'auto' }) {
  const payload = {
    query: String(query || '').trim(),
    location: location || {},
    vessel_type: String(vessel_type || 'small_boat'),
    conversation_id: conversation_id || `conv_${Date.now()}`,
    language: String(language || 'auto'),
  }

  const res = await client.post('/api/orca/query', payload)
  return res.data
}

/**
 * POST /api/chat/ivr
 * Dedicated IVR short-answer endpoint for telephone / voice systems.
 * Accepts either question_number (1-8) or custom message text.
 * @param {{ question_number?: number, message?: string, language?: string, lat?: number, lon?: number, vessel_type?: string, user_id?: string, format?: 'json'|'text'|'twiml' }} params
 * @returns {Promise<{ question_number?: number, question: string, short_answer: string, spoken_text: string, verdict: string, confidence_pct: number, language: string, user_id: string, timestamp: string }>}
 */
export async function fetchIVRShortAnswer({ question_number, message, language = 'en', lat, lon, vessel_type = 'small_boat', user_id = 'ivr_caller', format = 'json' }) {
  const payload = {
    question_number: question_number != null ? Number(question_number) : undefined,
    message: message ? String(message).trim() : undefined,
    language: String(language || 'en'),
    lat: lat != null ? Number(lat) : 13.0827,
    lon: lon != null ? Number(lon) : 80.2707,
    vessel_type: String(vessel_type || 'small_boat'),
    user_id: String(user_id || 'ivr_caller'),
    format: String(format || 'json'),
  }

  const res = await client.post('/api/chat/ivr', payload)
  return res.data
}

/**
 * GET /api/chat/ivr/latest
 * Retrieves the latest generated short answer (or for a specific user/caller).
 * @param {string} [userId]
 * @param {'json'|'text'|'twiml'} [format]
 */
export async function fetchLatestIVRShortAnswer(userId, format = 'json') {
  const params = {}
  if (userId) params.user_id = userId
  if (format) params.format = format

  const res = await client.get('/api/chat/ivr/latest', { params })
  return res.data
}

/**
 * GET /api/ivr/questions
 * Fetches the standard IVR 1-8 question list in all 10 coastal languages,
 * or for a specific language.
 * @param {string} [language]
 */
export async function fetchIVRQuestions(language) {
  const params = {}
  if (language) params.language = language
  const res = await client.get('/api/ivr/questions', { params })
  return res.data
}



