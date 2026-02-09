// Example: Minimal feature store using Angular signals (code in English, user messages in pt-BR).

import { computed, inject, Injectable, signal } from '@angular/core';
import { ProductsApi } from './products.api';

export type LoadState = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class ProductsStore {
  private readonly api = inject(ProductsApi);

  private readonly _state = signal<LoadState>('idle');
  private readonly _items = signal<readonly Product[]>([]);
  private readonly _errorMessagePtBr = signal<string | null>(null);

  /** Exposes current loading state for the UI. */
  readonly state = computed(() => this._state());

  /** Exposes loaded products list for the UI. */
  readonly items = computed(() => this._items());

  /** Exposes a pt-BR user-facing error message when something goes wrong. */
  readonly errorMessagePtBr = computed(() => this._errorMessagePtBr());

  /** Loads products from API and updates state accordingly. */
  async load(): Promise<void> {
    this._state.set('loading');
    this._errorMessagePtBr.set(null);

    try {
      const items = await this.api.list();
      this._items.set(items);
      this._state.set('success');
    } catch {
      this._errorMessagePtBr.set('Não foi possível carregar os produtos. Tente novamente.');
      this._state.set('error');
    }
  }
}

export interface Product {
  id: string;
  name: string;
  salePrice: number;
}
