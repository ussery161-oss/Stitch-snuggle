// The purchase service: one non-consumable, "Unlock Everything" (unlock_all). P2 uses the mock,
// which just flips the saved entitlement; P3 adds the real StoreKit service for builds outside
// Expo Go. Only the parent area (behind the gate) ever calls this.
import { saveStore } from '../storage/saveStore';
import { UNLOCK_PRICE_FALLBACK, UNLOCK_PRODUCT_ID, UNLOCK_TITLE } from './product';

export interface Product {
  id: string;
  title: string;
  /** Localized price text, shown only in the parent area. */
  price: string;
}

export type PurchaseResult = 'purchased' | 'restored' | 'cancelled' | 'pending' | 'nothing' | 'unavailable';

export interface PurchaseService {
  getProduct(): Promise<Product | null>;
  buy(): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult>;
}

function setUnlocked(unlocked: boolean): void {
  saveStore.update((s) => ({ ...s, entitlement: { unlocked } }));
}

/** Expo Go and development: the unlock is a saved flag. */
export class MockPurchaseService implements PurchaseService {
  async getProduct(): Promise<Product> {
    return { id: UNLOCK_PRODUCT_ID, title: UNLOCK_TITLE, price: UNLOCK_PRICE_FALLBACK };
  }

  async buy(): Promise<PurchaseResult> {
    setUnlocked(true);
    return 'purchased';
  }

  async restore(): Promise<PurchaseResult> {
    // The mock "store" remembers a purchase as the saved flag.
    return saveStore.current.entitlement.unlocked ? 'restored' : 'nothing';
  }

  /** Dev only: lock again, to test the demo. */
  relock(): void {
    setUnlocked(false);
  }
}

let service: PurchaseService = new MockPurchaseService();

export function purchaseService(): PurchaseService {
  return service;
}

/** Tests and P3: swap the service. */
export function setPurchaseService(next: PurchaseService): void {
  service = next;
}
