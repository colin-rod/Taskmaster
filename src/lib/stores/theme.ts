import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'taskmaster-theme';

/** Resolve the initial theme: stored preference, else the OS preference.
 *  The inline script in app.html applies the `.dark` class before first paint
 *  to avoid a flash; this store keeps Svelte state in sync with that. */
function initialTheme(): Theme {
  if (!browser) return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = writable<Theme>(initialTheme());

if (browser) {
  theme.subscribe((value) => {
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.classList.toggle('dark', value === 'dark');
  });
}

export function toggleTheme() {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}
