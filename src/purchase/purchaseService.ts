// The purchase service: one non-consumable, "Unlock Everything" (unlock_all). Expo Go uses the
// mock, which just flips the saved entitlement; other builds use StoreKit (storePurchaseService).
// Only the parent area (behind the gate) ever calls buy/restore.
import Constants from 'expo-constants';

import { saveStore } from '../storage/saveStore';
import { UNLOCK_PRICE_FALLBACK, UNLOCK_PRODUCT_ID, UNLOCK_TITLE } from './product';
import { StorePurchaseService, type IapApi } from './storePurchaseService';

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

/** Loads expo-iap only when it's needed: in Expo Go its native module doesn't exist. */
function loadExpoIap(): IapApi {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-iap') as IapApi;
}

/**
 * Expo Go (the "store client") has no StoreKit module: it keeps the mock. Development, TestFlight
 * and App Store builds use StoreKit through expo-iap; if that module can't be found, the mock is
 * used so the app never crashes.
 */
export function createPurchaseService(env: { executionEnvironment?: string } = Constants, load: () => IapApi = loadExpoIap): PurchaseService {
  if (env.executionEnvironment === 'storeClient') return new MockPurchaseService();
  try {
    const iap = load();
    if (!iap || typeof iap.requestPurchase !== 'function') return new MockPurchaseService();
    return new StorePurchaseService(iap);
  } catch {
    return new MockPurchaseService();
  }
}

let service: PurchaseService | null = null;

export function purchaseService(): PurchaseService {
  service ??= createPurchaseService();
  return service;
}

/** At launch: StoreKit builds re-check the entitlement (offline keeps the cached one). */
export async function checkEntitlementAtLaunch(): Promise<void> {
  const s = purchaseService();
  if (s instanceof StorePurchaseService) await s.checkEntitlement();
}

/** Tests and P3: swap the service. */
export function setPurchaseService(next: PurchaseService): void {
  service = next;
}
