/**
 * parseORCAResponse — extracts structured fields from the LLM markdown response.
 * The AI often embeds verdicts like:
 *   "VERDICT: SAFE", "CONFIDENCE: 87%", "⚠️ WARNING:", "✅ SAFE", "🚨 DANGER"
 * We parse these out to render styled verdict badges while keeping the clean markdown.
 */

const VERDICT_PATTERNS = [
  { pattern: /verdict[:\s]+safe/i,     verdict: 'SAFE',     icon: '✅' },
  { pattern: /verdict[:\s]+unsafe/i,   verdict: 'UNSAFE',   icon: '🚨' },
  { pattern: /verdict[:\s]+caution/i,  verdict: 'CAUTION',  icon: '⚠️' },
  { pattern: /verdict[:\s]+warning/i,  verdict: 'WARNING',  icon: '⚠️' },
  { pattern: /verdict[:\s]+danger/i,   verdict: 'DANGER',   icon: '🚨' },
  { pattern: /✅\s*(safe|go ahead|proceed)/i, verdict: 'SAFE',   icon: '✅' },
  { pattern: /⚠️\s*(caution|warning)/i,       verdict: 'CAUTION',icon: '⚠️' },
  { pattern: /🚨\s*(danger|unsafe|avoid)/i,   verdict: 'DANGER', icon: '🚨' },
]

const VERDICT_STYLES = {
  SAFE:    { bg: 'bg-safeLight',    text: 'text-safeGreen',    border: 'border-safeGreen/30' },
  CAUTION: { bg: 'bg-warningLight', text: 'text-warningAmber', border: 'border-warningAmber/30' },
  WARNING: { bg: 'bg-warningLight', text: 'text-warningAmber', border: 'border-warningAmber/30' },
  UNSAFE:  { bg: 'bg-dangerLight',  text: 'text-dangerRed',    border: 'border-dangerRed/30' },
  DANGER:  { bg: 'bg-dangerLight',  text: 'text-dangerRed',    border: 'border-dangerRed/30' },
}

export function parseORCAResponse(rawText) {
  if (!rawText) return { verdict: null, confidence: null, text: '' }

  let verdict = null
  let confidence = null

  // Extract verdict
  for (const { pattern, verdict: v, icon } of VERDICT_PATTERNS) {
    if (pattern.test(rawText)) {
      verdict = { label: v, icon, style: VERDICT_STYLES[v] || VERDICT_STYLES.CAUTION }
      break
    }
  }

  // Extract confidence %
  const confMatch = rawText.match(/confidence[:\s]+(\d{1,3})\s*%/i)
    || rawText.match(/(\d{1,3})\s*%\s*confidence/i)
  if (confMatch) {
    const val = parseInt(confMatch[1], 10)
    if (val >= 0 && val <= 100) confidence = val
  }

  return { verdict, confidence, text: rawText }
}

export const parseOCRAResponse = parseORCAResponse
export { VERDICT_STYLES }
