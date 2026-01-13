import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement } from '../types';
import { MOCK_PRODUCTS, DEFAULT_SETTINGS } from '../constants';

const KEYS = {
  SESSION: 'lumina_session',
  PRODUCTS: 'lumina_products',
  TRANSACTIONS: 'lumina_transactions',
  PURCHASES: 'lumina_purchases',
  SETTINGS: 'lumina_settings',
  CUSTOMERS: 'lumina_customers',
  SUPPLIERS: 'lumina_suppliers',
  SHIFTS: 'lumina_shifts',
  MOVEMENTS: 'lumina_movements',
  ACTIVE_SHIFT_ID: 'lumina_active_shift'
};

export const StorageService = {
  saveSession: (user: UserProfile) => localStorage.setItem(KEYS.SESSION, JSON.stringify(user)),
  getSession: (): UserProfile | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },
  clearSession: () => localStorage.removeItem(KEYS.SESSION),

  getProducts: (): Product[] => {
    const s = localStorage.getItem(KEYS.PRODUCTS);
    return s ? JSON.parse(s) : MOCK_PRODUCTS;
  },
  saveProducts: (products: Product[]) => localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products)),

  getTransactions: (): Transaction[] => {
    const s = localStorage.getItem(KEYS.TRANSACTIONS);
    return s ? JSON.parse(s) : [];
  },
  saveTransaction: (transaction: Transaction) => {
    const current = StorageService.getTransactions();
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([transaction, ...current]));
  },

  getPurchases: (): Purchase[] => {
    const s = localStorage.getItem(KEYS.PURCHASES);
    return s ? JSON.parse(s) : [];
  },
  savePurchase: (purchase: Purchase) => {
    const current = StorageService.getPurchases();
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify([purchase, ...current]));
  },

  getSettings: (): StoreSettings => {
    const s = localStorage.getItem(KEYS.SETTINGS);
    return s ? JSON.parse(s) : DEFAULT_SETTINGS;
  },
  saveSettings: (settings: StoreSettings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings)),

  getCustomers: (): Customer[] => {
    const s = localStorage.getItem(KEYS.CUSTOMERS);
    return s ? JSON.parse(s) : [];
  },
  
  getSuppliers: (): Supplier[] => {
    const s = localStorage.getItem(KEYS.SUPPLIERS);
    return s ? JSON.parse(s) : [];
  },
  saveSupplier: (supplier: Supplier) => {
    const current = StorageService.getSuppliers();
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([...current, supplier]));
  },

  getShifts: (): CashShift[] => {
    const s = localStorage.getItem(KEYS.SHIFTS);
    return s ? JSON.parse(s) : [];
  },
  saveShift: (shift: CashShift) => {
      const shifts = StorageService.getShifts();
      // If updating existing
      const idx = shifts.findIndex(s => s.id === shift.id);
      if (idx >= 0) {
          shifts[idx] = shift;
          localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
      } else {
          localStorage.setItem(KEYS.SHIFTS, JSON.stringify([shift, ...shifts]));
      }
  },
  
  getMovements: (): CashMovement[] => {
      const s = localStorage.getItem(KEYS.MOVEMENTS);
      return s ? JSON.parse(s) : [];
  },
  saveMovement: (movement: CashMovement) => {
      const moves = StorageService.getMovements();
      localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify([...moves, movement]));
  },

  getActiveShiftId: (): string | null => {
      return localStorage.getItem(KEYS.ACTIVE_SHIFT_ID);
  },
  setActiveShiftId: (id: string | null) => {
      if(id) localStorage.setItem(KEYS.ACTIVE_SHIFT_ID, id);
      else localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
  }
};