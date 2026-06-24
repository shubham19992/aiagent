// ============================================================
// loading.js — global in-flight request tracker. Wraps window.fetch
// once so EVERY API call increments/decrements a counter; the
// GlobalLoader overlay shows whenever the counter is > 0.
// ============================================================

let count = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(count));
}

export function startLoading() {
  count += 1;
  emit();
}

export function stopLoading() {
  count = Math.max(0, count - 1);
  emit();
}

export function subscribeLoading(fn) {
  listeners.add(fn);
  fn(count);
  return () => listeners.delete(fn);
}

// Patch the global fetch a single time so all API requests — regardless of
// which service client makes them — drive the full-screen loader.
if (typeof window !== 'undefined' && typeof window.fetch === 'function' && !window.__xdFetchLoading) {
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    // Opt-out: callers can pass { skipGlobalLoader: true } to run without
    // the full-screen overlay (e.g. discovery, which has its own in-page
    // loader). Strip the flag so it isn't forwarded to fetch.
    if (init && init.skipGlobalLoader) {
      const { skipGlobalLoader, ...rest } = init;
      return orig(input, rest);
    }
    startLoading();
    return orig(input, init).finally(stopLoading);
  };
  window.__xdFetchLoading = true;
}
