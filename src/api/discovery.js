// ============================================================
// discovery.js — runs cloud-discovery agents and returns their result.
// POST /api/v3/agents/execute on the agents service (8086); override
// with VITE_AGENTS_BASE_URL. Called after Save & Connect succeeds and
// from the connections list "Connect" action.
// ============================================================
import { tokenStore } from './client';

const RAW = import.meta.env.VITE_AGENTS_BASE_URL || 'http://10.1.151.228:8086';
export const AGENTS_BASE = RAW.replace(/\/+$/, '');

// body: { agentNames: [..], cloudProvider, userId, projectId }
export async function runDiscovery({ agentNames, cloudProvider, userId, projectId } = {}) {
  const token = tokenStore.get();
  const res = await fetch(`${AGENTS_BASE}/api/v3/agents/execute`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ agentNames, cloudProvider, userId, projectId }),
  });
  const text = await res.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch { json = text; } }
  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && json.error && json.error.message) ||
      (json && typeof json === 'object' && json.message) ||
      (typeof json === 'string' && json) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json?.data || {};
}

// Insights can come back either as plain strings or as a ```json fenced
// array. Normalise to a flat list of sentences.
export function parseInsights(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  arr.forEach((entry) => {
    if (typeof entry !== 'string') return;
    let s = entry.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) out.push(...parsed.filter((x) => typeof x === 'string'));
      else if (typeof parsed === 'string') out.push(parsed);
      else out.push(entry);
    } catch {
      out.push(entry);
    }
  });
  return out;
}
