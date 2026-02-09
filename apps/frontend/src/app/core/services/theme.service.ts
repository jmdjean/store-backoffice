import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';
  private readonly root = typeof document !== 'undefined' ? document.documentElement : null;

  currentTheme = signal<Theme>(this.loadTheme());

  constructor() {
    effect(() => {
      const theme = this.currentTheme();
      if (this.root) {
        this.root.setAttribute('data-theme', theme);
        try {
          localStorage.setItem(this.storageKey, theme);
        } catch {}
      }
    });
  }

  private loadTheme(): Theme {
    if (typeof window === 'undefined') return 'dark';
    try {
      const saved = localStorage.getItem(this.storageKey) as Theme | null;
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'dark';
  }

  toggle(): void {
    this.currentTheme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this.currentTheme.set(theme);
  }
}
