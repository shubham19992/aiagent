// ============================================================
// connectionsStore.js — local (localStorage) store for the connections
// created on the "Create Connect" page. There is no write endpoint for
// connections yet, so created connections are persisted in the browser,
// keyed by "<opCode>/<envCode>", and listed in a table on the env page.
// ============================================================

const KEY = 'xops_connections';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    /* quota exceeded — ignore */
  }
}

const keyOf = (opCode, envCode) => `${opCode}/${envCode}`;

/** Connections created for a given op + env (newest last). */
export function listConnections(opCode, envCode) {
  const list = readAll()[keyOf(opCode, envCode)];
  return Array.isArray(list) ? list : [];
}

/** Append a connection. `record` carries { name, fields: [{label,value,secret}] }. */
export function addConnection(opCode, envCode, record) {
  const all = readAll();
  const k = keyOf(opCode, envCode);
  const list = Array.isArray(all[k]) ? all[k] : [];
  const rec = {
    id: `conn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    status: 'Connected',
    ...record,
  };
  all[k] = [...list, rec];
  writeAll(all);
  return rec;
}

/** Remove a connection by id. */
export function removeConnection(opCode, envCode, id) {
  const all = readAll();
  const k = keyOf(opCode, envCode);
  all[k] = (all[k] || []).filter((c) => c.id !== id);
  writeAll(all);
}
