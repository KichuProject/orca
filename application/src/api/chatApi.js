import client from './client';
import { ENDPOINTS, getEndpoint } from '../config/api';

/**
 * ORCA Marine Chat API Service
 * Directly interacts with existing FastAPI /api/chat endpoint.
 */

/**
 * Sends message to the existing ORCA Agentic Chat API.
 * @param {Object} params
 * @param {string} params.message - The natural language marine question
 * @param {number} [params.lat] - GPS latitude (optional)
 * @param {number} [params.lon] - GPS longitude (optional)
 * @param {string} [params.vessel_type] - Vessel classification (e.g. 'fishing_trawler')
 * @param {string} [params.user_id] - User identifier
 * @param {string} [params.language] - Two-letter language code (e.g. 'en', 'ta', 'hi')
 * @param {Array} [params.history] - Array of previous messages { role: 'user' | 'assistant', content: string }
 * @param {AbortSignal} [params.signal] - Optional cancellation signal
 * @returns {Promise<{ response: string, short_answer?: string, agent_pipeline?: object, timestamp?: string, user_id?: string }>}
 */
export async function sendChatMessage({
  message,
  lat,
  lon,
  vessel_type = 'fishing_trawler',
  user_id = '1001',
  language = 'en',
  history = [],
  signal,
}) {
  if (!message || !message.trim()) {
    throw new Error('Message content cannot be empty.');
  }

  // Format clean conversation history matching backend Pydantic ChatMessage schema
  const cleanHistory = Array.isArray(history)
    ? history
        .filter((item) => item && item.role && item.content)
        .map((item) => ({
          role: String(item.role),
          content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
        }))
    : [];

  const payload = {
    message: String(message).trim(),
    lat: lat != null && !isNaN(Number(lat)) ? Number(lat) : undefined,
    lon: lon != null && !isNaN(Number(lon)) ? Number(lon) : undefined,
    vessel_type: String(vessel_type || 'fishing_trawler'),
    user_id: String(user_id || '1001'),
    language: String(language || 'en'),
    history: cleanHistory,
  };

  const response = await client.post(ENDPOINTS.CHAT, payload, { signal });
  return response.data;
}

/**
 * Checks if the ORCA FastAPI backend server is accessible and online.
 * @returns {Promise<{ online: boolean, statusText?: string, latencyMs?: number }>}
 */
export async function checkBackendHealth() {
  const start = Date.now();
  try {
    const res = await client.get('/', { timeout: 8000 });
    return {
      online: true,
      statusText: res.data?.message || res.data?.status || 'ORCA Server Online',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      online: false,
      statusText: err.message || 'Server Offline',
      latencyMs: Date.now() - start,
    };
  }
}

export default {
  sendChatMessage,
  checkBackendHealth,
};
