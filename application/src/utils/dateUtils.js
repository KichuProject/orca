/**
 * Date and Time formatting utilities for chat and conversation history
 */

export function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return formatDate(isoString);
  } catch {
    return '';
  }
}

/**
 * Groups an array of conversations into ChatGPT/Claude-style time buckets
 * @param {Array} conversations
 * @returns {Array<{ title: string, data: Array }>}
 */
export function groupConversationsByDate(conversations = []) {
  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysAgo = todayStart - 7 * 86400000;

  conversations.forEach((item) => {
    const time = new Date(item.updatedAt || item.createdAt).getTime();
    if (time >= todayStart) {
      groups.today.push(item);
    } else if (time >= yesterdayStart) {
      groups.yesterday.push(item);
    } else if (time >= sevenDaysAgo) {
      groups.previous7Days.push(item);
    } else {
      groups.older.push(item);
    }
  });

  const sections = [];
  if (groups.today.length > 0) sections.push({ title: 'Today', data: groups.today });
  if (groups.yesterday.length > 0) sections.push({ title: 'Yesterday', data: groups.yesterday });
  if (groups.previous7Days.length > 0) sections.push({ title: 'Previous 7 Days', data: groups.previous7Days });
  if (groups.older.length > 0) sections.push({ title: 'Older', data: groups.older });

  return sections;
}

export default {
  formatTime,
  formatDate,
  formatRelativeTime,
  groupConversationsByDate,
};
