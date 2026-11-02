// P3-A acceptance: the StoreKit service against a faked native module: buy success, cancel,
// pending, restore, already owned; the Expo Go mock fallback; and restore keeping the unlock
// offline after a relaunch (the cached entitlement).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPurchaseService, MockPurchaseService } from '../src/purchase/purchaseService';
import { StorePurchaseService, type IapApi, type IapError, type IapPurchase } from '../src/purchase/storePurchaseService';
import { SaveStore } from '../src/storage/saveStore';
import { defaultSave } from '../src/storage/schema';
import { saveStore } from '../src/storage/useSave';

type Outcome = { kind: 'purchased' } | { kind: 'pending' } | { kind: 'error'; code: string };

class FakeIap implements IapApi {
  owned: IapPurchase[] = [];
  finished: IapPurchase[] = [];
  outcome: Outcome = { kind: 'purchased' };
  online = true;
  restoreCalls = 0;
  private onPurchase: ((p: IapPurchase) => void)[] = [];
  private onError: ((e: IapError) => void)[] = [];
  async initConnection() {
    if (!this.online) throw new Error('offline');
    return true;
  }
  async fetchProducts() {
    return [{ id: 'unlock_all', displayPrice: '$5.99', title: 'Unlock Everything' }];
  }
  async requestPurchase() {
    setTimeout(() => {
      const o = this.outcome;
      if (o.kind === 'purchased') {
        const p: IapPurchase = { productId: 'unlock_all', purchaseState: 'purchased' };
        this.owned.push(p);
        this.onPurchase.forEach((cb) => cb(p));
      } else if (o.kind === 'pending') this.onPurchase.forEach((cb) => cb({ productId: 'unlock_all', purchaseState: 'pending' }));
      else this.onError.forEach((cb) => cb({ code: o.code }));
    }, 0);
    return null;
  }
  async finishTransaction({ purchase }: { purchase: IapPurchase }) {
    this.finished.push(purchase);
    return null;
  }
  async getAvailablePurchases() {
    if (!this.online) throw new Error('offline');
    return this.owned;
  }
  async restorePurchases() {
    this.restoreCalls++;
    if (!this.online) throw new Error('offline');
  }
  purchaseUpdatedListener(cb: (p: IapPurchase) => void) {
    this.onPurchase.push(cb);
    return { remove: () => (this.onPurchase = this.onPurchase.filter((x) => x !== cb)) };
  }
  purchaseErrorListener(cb: (e: IapError) => void) {
    this.onError.push(cb);
    return { remove: () => (this.onError = this.onError.filter((x) => x !== cb)) };
  }
}

beforeEach(() => saveStore.update(() => defaultSave()));

describe('StorePurchaseService', () => {
  it('shows the localized price', async () => {
    expect(await new StorePurchaseService(new FakeIap()).getProduct()).toEqual({ id: 'unlock_all', title: 'Unlock Everything', price: '$5.99' });
  });

  it('buy success unlocks and finishes the transaction', async () => {
    const iap = new FakeIap();
    const svc = new StorePurchaseService(iap);
    expect(await svc.buy()).toBe('purchased');
    expect(saveStore.current.entitlement.unlocked).toBe(true);
    expect(iap.finished.map((p) => p.productId)).toEqual(['unlock_all']);
  });

  it('cancel leaves it locked', async () => {
    const iap = new FakeIap();
    iap.outcome = { kind: 'error', code: 'user-cancelled' };
    expect(await new StorePurchaseService(iap).buy()).toBe('cancelled');
    expect(saveStore.current.entitlement.unlocked).toBe(false);
  });

  it('pending (Ask to Buy) waits without unlocking', async () => {
    const iap = new FakeIap();
    iap.outcome = { kind: 'pending' };
    expect(await new StorePurchaseService(iap).buy()).toBe('pending');
    expect(saveStore.current.entitlement.unlocked).toBe(false);
  });

  it('already owned restores it', async () => {
    const iap = new FakeIap();
    iap.owned = [{ productId: 'unlock_all', purchaseState: 'purchased' }];
    iap.outcome = { kind: 'error', code: 'already-owned' };
    expect(await new StorePurchaseService(iap).buy()).toBe('restored');
    expect(saveStore.current.entitlement.unlocked).toBe(true);
  });

  it('restore finds an earlier purchase, or reports nothing', async () => {
    const iap = new FakeIap();
    const svc = new StorePurchaseService(iap);
    expect(await svc.restore()).toBe('nothing');
    iap.owned = [{ productId: 'unlock_all', purchaseState: 'purchased' }];
    expect(await svc.restore()).toBe('restored');
    expect(iap.restoreCalls).toBe(2);
    expect(saveStore.current.entitlement.unlocked).toBe(true);
  });

  it('checks the entitlement at launch and finishes unfinished transactions', async () => {
    const iap = new FakeIap();
    iap.owned = [{ productId: 'unlock_all', purchaseState: 'purchased' }];
    expect(await new StorePurchaseService(iap).checkEntitlement()).toBe(true);
    expect(iap.finished).toHaveLength(1);
  });

  it('restore keeps the unlock offline after a relaunch (cached entitlement)', async () => {
    await AsyncStorage.clear();
    const first = new SaveStore();
    await first.load();
    first.update((s) => ({ ...s, entitlement: { unlocked: true } }));
    await first.flush();
    // Relaunch with no network: StoreKit can't be reached.
    const relaunched = new SaveStore();
    const loaded = await relaunched.load();
    expect(loaded.entitlement.unlocked).toBe(true);
    saveStore.update(() => loaded);
    const iap = new FakeIap();
    iap.online = false;
    const svc = new StorePurchaseService(iap);
    expect(await svc.checkEntitlement()).toBe(true);
    expect(saveStore.current.entitlement.unlocked).toBe(true);
  });
});

describe('Expo Go fallback', () => {
  it('Expo Go (storeClient) uses the mock', () => {
    expect(createPurchaseService({ executionEnvironment: 'storeClient' }, () => new FakeIap())).toBeInstanceOf(MockPurchaseService);
  });

  it('a build with StoreKit uses the real service', () => {
    expect(createPurchaseService({ executionEnvironment: 'standalone' }, () => new FakeIap())).toBeInstanceOf(StorePurchaseService);
  });

  it('a missing native module falls back to the mock instead of crashing', () => {
    expect(
      createPurchaseService({ executionEnvironment: 'bare' }, () => {
        throw new Error("Cannot find native module 'ExpoIap'");
      }),
    ).toBeInstanceOf(MockPurchaseService);
  });
});
