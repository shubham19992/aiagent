/**
 * Theme registry + tiny store for the xOps dashboard shell.
 *
 * Each theme is just a `data-theme` value applied to the `.xd-shell` element;
 * the actual colors live in Dashboard.css as `.xd-shell[data-theme="…"]` blocks
 * that override the CSS custom properties. The choice is persisted in
 * localStorage and broadcast via a window event so the AppLayout (which owns
 * the shell element) and the PageHeader switcher stay in sync without prop
 * drilling or a context provider.
 */
import { useEffect, useState } from 'react';

export const THEMES = [
  { id: 'grafana-dark', name: 'Dark',  swatch: '#f5701c', bg: '#0a0b10' },
  { id: 'light',        name: 'Light', swatch: '#e2620e', bg: '#f3f4f6' },
];

const KEY = 'xops_theme';
const DEFAULT = 'grafana-dark';
const EVENT = 'xops-theme-change';

export function getTheme() {
  const saved = localStorage.getItem(KEY);
  return THEMES.some((t) => t.id === saved) ? saved : DEFAULT;
}

export function setTheme(id) {
  localStorage.setItem(KEY, id);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** Reactive theme state shared across components via a window event. */
export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);
  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return [theme, setTheme];
}
