/**
 * Message Utilities for ORCA Marine Intelligence
 * Extracts structured maritime status pills without modifying or truncating the actual response.
 */

const VERDICT_PATTERNS = [
  { pattern: /verdict[:\s]+safe/i, verdict: 'SAFE', icon: 'check-circle', type: 'safe' },
  { pattern: /verdict[:\s]+unsafe/i, verdict: 'UNSAFE', icon: 'alert-octagon', type: 'danger' },
  { pattern: /verdict[:\s]+caution/i, verdict: 'CAUTION', icon: 'alert-triangle', type: 'warning' },
  { pattern: /verdict[:\s]+warning/i, verdict: 'WARNING', icon: 'alert-triangle', type: 'warning' },
  { pattern: /verdict[:\s]+danger/i, verdict: 'DANGER', icon: 'alert-octagon', type: 'danger' },
  { pattern: /✅\s*(safe|go ahead|proceed)/i, verdict: 'SAFE', icon: 'check-circle', type: 'safe' },
  { pattern: /⚠️\s*(caution|warning)/i, verdict: 'CAUTION', icon: 'alert-triangle', type: 'warning' },
  { pattern: /🚨\s*(danger|unsafe|avoid)/i, verdict: 'DANGER', icon: 'alert-octagon', type: 'danger' },
];

/**
 * Parses response text and metadata to extract operational indicators.
 * IMPORTANT: Strictly returns the unmodified text alongside detected badges.
 * @param {string} rawText
 * @param {Object} [metadata]
 * @returns {{ text: string, verdict: Object|null, confidence: number|null, riskScore: number|null, tools: Array }}
 */
export function parseResponseIndicators(rawText, metadata = {}) {
  const text = rawText || '';
  let verdict = null;
  let confidence = null;
  let riskScore = null;
  const tools = [];

  // 1. Check if metadata/agent_pipeline explicitly defines verdict
  if (metadata?.agent_pipeline) {
    const pipe = metadata.agent_pipeline;
    if (pipe.verdict) {
      const v = String(pipe.verdict).toUpperCase();
      if (v.includes('SAFE')) verdict = { label: 'SAFE', icon: 'check-circle', type: 'safe' };
      else if (v.includes('UNSAFE') || v.includes('DANGER')) verdict = { label: 'DANGER', icon: 'alert-octagon', type: 'danger' };
      else if (v.includes('CAUTION') || v.includes('WARNING')) verdict = { label: 'CAUTION', icon: 'alert-triangle', type: 'warning' };
    }

    if (pipe.confidence != null && !isNaN(pipe.confidence)) {
      confidence = Math.round(Number(pipe.confidence) <= 1 ? pipe.confidence * 100 : pipe.confidence);
    }

    if (pipe.risk_score != null && !isNaN(pipe.risk_score)) {
      riskScore = Math.round(Number(pipe.risk_score));
    }

    if (Array.isArray(pipe.tools_called)) {
      tools.push(...pipe.tools_called);
    }
  }

  // 2. Fallback text parsing if not found in metadata
  if (!verdict) {
    for (const item of VERDICT_PATTERNS) {
      if (item.pattern.test(text)) {
        verdict = { label: item.verdict, icon: item.icon, type: item.type };
        break;
      }
    }
  }

  if (confidence === null) {
    const match = text.match(/confidence[:\s]+(\d{1,3})\s*%/i) || text.match(/(\d{1,3})\s*%\s*confidence/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 0 && val <= 100) confidence = val;
    }
  }

  if (riskScore === null) {
    const riskMatch = text.match(/risk[:\s]+(\d{1,3})\s*(?:\/|\s*out of\s*)100/i) || text.match(/risk\s*(?:score|index)?[:\s]+(\d{1,3})/i);
    if (riskMatch) {
      const val = parseInt(riskMatch[1], 10);
      if (val >= 0 && val <= 100) riskScore = val;
    }
  }

  return {
    text, // Unmodified original message
    verdict,
    confidence,
    riskScore,
    tools,
  };
}

export default {
  parseResponseIndicators,
};
