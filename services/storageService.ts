
import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement } from '../types';
import { supabase } from './supabase';

export const StorageService = {
  // Expose supabase client for direct queries where a service method doesn't exist
  supabase,

  // Session
  saveSession: (user: UserProfile) => localStorage.setItem('churre_session', JSON.stringify(user)),
  getSession: (): UserProfile | null => {
    const s = localStorage.getItem('churre_session');
    try {
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  clearSession: () => localStorage.removeItem('churre_session'),

  // Products
  getProducts: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  },
  
  saveProduct: async (product: Product) => {
    const { data, error } = await supabase
      .from('menu_items')
      .upsert({
        id: product.id && product.id.length > 5 ? product.id : undefined,
        name: product.name,
        price: product.price,
        category: product.category,
        image: product.image,
        variants: product.variants || [],
        stock: product.stock,
        barcode: product.barcode
      })
      .select();
    if (error) throw error;
    return data ? data[0] : product;
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
  },

  // Orders / Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({
          ...d,
          date: d.created_at,
          items: d.items || [],
          paymentMethod: d.payment_method,
          shiftId: d.session_id ? d.session_id.toString() : undefined
      }));
    } catch {
      return [];
    }
  },

  saveTransaction: async (transaction: Transaction) => {
    const { error } = await supabase
      .from('orders')
      .insert({
        customer_name: 'POS Customer',
        total: transaction.total,
        modality: 'pickup',
        status: 'Completado',
        items: transaction.items,
        payment_method: transaction.paymentMethod,
        order_origin: 'POS',
        session_id: transaction.shiftId ? parseInt(transaction.shiftId) : null
      });
    if (error) throw error;
  },

  // Settings
  getSettings: async (): Promise<StoreSettings> => {
    const defaultSettings: StoreSettings = {
        name: 'Churre Malcriado POS',
        currency: 'S/',
        taxRate: 0.18,
        pricesIncludeTax: true,
        themeColor: '#e11d48'
    };
    try {
      const { data, error } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (error || !data) return defaultSettings;
      
      // Mapear de snake_case a camelCase
      return {
        name: data.name,
        currency: data.currency,
        taxRate: parseFloat(data.tax_rate),
        pricesIncludeTax: data.prices_include_tax,
        address: data.address,
        phone: data.phone,
        logo: data.logo,
        themeColor: data.theme_color,
        secondaryColor: data.secondary_color
      };
    } catch {
      return defaultSettings;
    }
  },

  saveSettings: async (settings: StoreSettings) => {
    // Mapear de camelCase a snake_case para coincidir con la tabla SQL
    const payload = {
      id: 1,
      name: settings.name,
      currency: settings.currency,
      tax_rate: settings.taxRate,
      prices_include_tax: settings.pricesIncludeTax,
      address: settings.address,
      phone: settings.phone,
      logo: settings.logo,
      theme_color: settings.themeColor,
      secondary_color: settings.secondaryColor
    };
    
    const { error } = await supabase
      .from('pos_settings')
      .upsert(payload);
    if (error) throw error;
  },

  // Cash Sessions
  getShifts: async (): Promise<CashShift[]> => {
    try {
      const { data, error } = await supabase.from('cash_sessions').select('*').order('id', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({
          id: d.id.toString(),
          startTime: d.opened_at,
          endTime: d.closed_at,
          startAmount: d.opening_balance,
          endAmount: d.closing_balance,
          status: d.status.toUpperCase() as 'OPEN' | 'CLOSED',
          totalSalesCash: d.total_sales || 0,
          totalSalesDigital: 0 
      }));
    } catch {
      return [];
    }
  },

  saveShift: async (shift: CashShift) => {
    const payload = {
        opened_at: shift.startTime,
        closed_at: shift.endTime,
        opening_balance: shift.startAmount,
        closing_balance: shift.endAmount,
        status: shift.status.toLowerCase()
    };
    let result;
    if (shift.id && !shift.id.includes('.')) {
        result = await supabase.from('cash_sessions').upsert({ id: parseInt(shift.id), ...payload }).select();
    } else {
        result = await supabase.from('cash_sessions').insert(payload).select();
    }
    if (result.error) throw result.error;
    const d = result.data[0];
    return {
        id: d.id.toString(),
        startTime: d.opened_at,
        endTime: d.closed_at,
        startAmount: d.opening_balance,
        endAmount: d.closing_balance,
        status: d.status.toUpperCase()
    };
  },

  // Cash Movements
  getMovements: async (): Promise<CashMovement[]> => {
    try {
      const { data, error } = await supabase.from('cash_transactions').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({
          id: d.id.toString(),
          shiftId: d.session_id ? d.session_id.toString() : '0',
          type: d.type.toUpperCase() as any,
          amount: d.amount,
          description: d.reason || '',
          timestamp: d.created_at
      }));
    } catch {
      return [];
    }
  },

  saveMovement: async (movement: CashMovement) => {
    const { error } = await supabase.from('cash_transactions').insert({
        session_id: movement.shiftId ? parseInt(movement.shiftId) : null,
        type: movement.type.toLowerCase(),
        amount: movement.amount,
        reason: movement.description,
        created_at: movement.timestamp
    });
    if (error) throw error;
  },

  getSuppliers: async () => {
    try {
      const { data, error } = await supabase.from('suppliers').select('*');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  saveSupplier: async (supplier: Supplier) => {
    const { error } = await supabase.from('suppliers').insert(supplier);
    if (error) throw error;
  },

  getPurchases: async () => {
    try {
      const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  savePurchase: async (purchase: Purchase) => {
    const { error } = await supabase.from('purchases').insert(purchase);
    if (error) throw error;
  }
};
