// ============================================================
// discovery.js — kicks off cloud discovery after a connection is saved.
// Currently returns canned dummy data; swap runDiscovery's body for a
// real fetch when the discovery API is available.
// ============================================================
import { DISCOVERY_RESULT } from '../data/discoveryDummy';

// Run discovery for a connection. Returns the discovery response.
export async function runDiscovery({ cloudProvider, projectId } = {}) {
  // Deep clone so callers never mutate the shared dummy.
  const data = JSON.parse(JSON.stringify(DISCOVERY_RESULT));
  if (cloudProvider) {
    data.cloudProvider = cloudProvider;
    (data.results || []).forEach((r) => {
      if (r.data?.recommendations) r.data.recommendations.cloudProvider = cloudProvider;
    });
  }
  if (projectId) data.projectId = projectId;
  return data;
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
