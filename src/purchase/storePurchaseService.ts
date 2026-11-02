// The real purchase service (P3): StoreKit 2 through expo-iap, for development, TestFlight and App
// Store builds. Expo Go has no StoreKit module, so there the app keeps the mock (see
// createPurchaseService). Only the parent area calls buy/restore.
//
// - getProduct(): the localized price of 'unlock_all' (shown in the parent area only).
// - buy(): requests the purchase and waits for the result (purchased / cancelled / pending /
//   already owned). Every transaction is finished.
// - restore(): Apple's restore, then reads current purchases.
// - checkEntitlement(): at launch, reads current purchases and finishes unfinished ones. Offline or
//   on any error the cached entitlement in the save is kept, so a child never loses the unlock.
// The app makes no network calls of its own: StoreKit's traffic is Apple's, inside the native module.
import { saveStore } from '../storage/saveStore';
import { UNLOCK_PRODUCT_ID, UNLOCK_TITLE } from './product';
import type { Product, PurchaseResult, PurchaseService } from './purchaseService';

/** The parts of a StoreKit purchase we use. */
export interface IapPurchase {
  productId: string;
  purchaseState?: 'pending' | 'purchased' | 'unknown';
}

export interface IapError {
  code: string;
  message?: string;
}

/** The parts of expo-iap the service uses (injected, so tests can fake StoreKit). */
export interface IapApi {
  initConnection(): Promise<unknown>;
  fetchProducts(args: { skus: string[]; type: 'in-app' }): Promise<unknown>;
  requestPurchase(args: { request: { apple: { sku: string } }; type: 'in-app' }): Promise<unknown>;
  finishTransaction(args: { purchase: IapPurchase; isConsumable: boolean }): Promise<unknown>;
  getAvailablePurchases(): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  purchaseUpdatedListener(cb: (p: IapPurchase) => void): { remove(): void };
  purchaseErrorListener(cb: (e: IapError) => void): { remove(): void };
}

/** How long buy() waits for StoreKit before giving up quietly. */
export const BUY_TIMEOUT_MS = 120_000;

function unlock(): void {
  if (!saveStore.current.entitlement.unlocked) saveStore.update((s) => ({ ...s, entitlement: { unlocked: true } }));
}

function asPurchases(v: unknown): IapPurchase[] {
  return Array.isArray(v) ? (v.filter((p) => p && typeof p.productId === 'string') as IapPurchase[]) : [];
}

export class StorePurchaseService implements PurchaseService {
  private ready: Promise<boolean> | null = null;

  constructor(private readonly iap: IapApi) {}

  private connect(): Promise<boolean> {
    this.ready ??= this.iap
      .initConnection()
      .then(() => true)
      .catch(() => {
        this.ready = null;
        return false;
      });
    return this.ready;
  }

  async getProduct(): Promise<Product | null> {
    if (!(await this.connect())) return null;
    try {
      const list = (await this.iap.fetchProducts({ skus: [UNLOCK_PRODUCT_ID], type: 'in-app' })) as { id?: string; displayPrice?: string; title?: string }[] | null;
      const p = list?.find((x) => x.id === UNLOCK_PRODUCT_ID);
      return p?.displayPrice ? { id: UNLOCK_PRODUCT_ID, title: p.title || UNLOCK_TITLE, price: p.displayPrice } : null;
    } catch {
      return null;
    }
  }

  /** Reads current purchases: unlocks if 'unlock_all' is owned, and finishes every transaction. */
  async checkEntitlement(): Promise<boolean> {
    if (!(await this.connect())) return saveStore.current.entitlement.unlocked;
    try {
      const owned = asPurchases(await this.iap.getAvailablePurchases());
      let found = false;
      for (const p of owned) {
        if (p.productId === UNLOCK_PRODUCT_ID && p.purchaseState !== 'pending') found = true;
        if (p.purchaseState !== 'pending') await this.iap.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
      }
      if (found) unlock();
      return found || saveStore.current.entitlement.unlocked;
    } catch {
      // Offline or StoreKit busy: keep the cached entitlement.
      return saveStore.current.entitlement.unlocked;
    }
  }

  buy(): Promise<PurchaseResult> {
    return this.connect().then(
      (ok) =>
        new Promise<PurchaseResult>((resolve) => {
          if (!ok) {
            resolve('unavailable');
            return;
          }
          let settled = false;
          const subs: { remove(): void }[] = [];
          const done = (r: PurchaseResult) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            subs.forEach((s) => s.remove());
            resolve(r);
          };
          const timer = setTimeout(() => done('unavailable'), BUY_TIMEOUT_MS);
          subs.push(
            this.iap.purchaseUpdatedListener((p) => {
              if (p.productId !== UNLOCK_PRODUCT_ID) return;
              if (p.purchaseState === 'pending') {
                done('pending');
                return;
              }
              unlock();
              this.iap
                .finishTransaction({ purchase: p, isConsumable: false })
                .catch(() => {})
                .then(() => done('purchased'));
            }),
          );
          subs.push(
            this.iap.purchaseErrorListener((e) => {
              if (e.code === 'user-cancelled') done('cancelled');
              else if (e.code === 'pending' || e.code === 'deferred-payment') done('pending');
              else if (e.code === 'already-owned') {
                // Owned already (another device, or a reinstall): restore it.
                this.checkEntitlement().then((owned) => done(owned ? 'restored' : 'unavailable'));
              } else done('unavailable');
            }),
          );
          this.iap.requestPurchase({ request: { apple: { sku: UNLOCK_PRODUCT_ID } }, type: 'in-app' }).catch(() => done('unavailable'));
        }),
    );
  }

  async restore(): Promise<PurchaseResult> {
    if (!(await this.connect())) return 'unavailable';
    try {
      await this.iap.restorePurchases();
    } catch {
      // Still read what StoreKit already knows.
    }
    const owned = await this.checkEntitlement();
    return owned ? 'restored' : 'nothing';
  }
}
