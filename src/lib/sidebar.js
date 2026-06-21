/**
 * Tiny shared store for the sidebar collapsed/expanded state. Mirrors the
 * theme store: the AppLayout owns the shell element and the PageHeader hosts
 * the hamburger toggle, so the state is kept in localStorage and broadcast
 * via a window event to keep both in sync without prop drilling.
 */
import { useEffect, useState } from 'react';

const KEY = 'xops_sidebar_collapsed';
const EVENT = 'xops-sidebar-toggle';

export function getCollapsed() {
  return localStorage.getItem(KEY) === '1';
}

export function setCollapsed(value) {
  localStorage.setItem(KEY, value ? '1' : '0');
  window.dispatchEvent(new CustomEvent(EVENT, { detail: !!value }));
}

/** Reactive [collapsed, toggle] shared across components via a window event. */
export function useSidebar() {
  const [collapsed, setState] = useState(getCollapsed);
  useEffect(() => {
    const onChange = (e) => setState(e.detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  const toggle = () => setCollapsed(!getCollapsed());
  return [collapsed, toggle];
}
