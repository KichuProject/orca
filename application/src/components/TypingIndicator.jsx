import React from 'react';
import AgentLiveLoading from './AgentLiveLoading';

/**
 * TypingIndicator
 * Upgraded to render the full web-parity Multi-Agent Swarm Activity Stream (AgentLiveLoading).
 * Maintains backwards compatibility for any existing invocation across the mobile app.
 */
export function TypingIndicator({
  statusText,
  message,
  language = 'en',
  onCancel,
  queryText = '',
  plannedAgents = [],
  activeAction = '',
  progressPct = 0,
  style,
  ...props
}) {
  return (
    <AgentLiveLoading
      queryText={queryText}
      statusText={statusText || message}
      language={language}
      onCancel={onCancel}
      plannedAgents={plannedAgents}
      activeAction={activeAction}
      progressPct={progressPct}
      style={style}
      {...props}
    />
  );
}

export { AgentLiveLoading };
export default TypingIndicator;
