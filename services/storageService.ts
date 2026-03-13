
import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement } from '../types';
import { supabase } from './supabase';

export const StorageService = {
  supabase,

  // --- Session Management ---
  saveSession: (user: UserProfile) => localStorage.setItem('churre_session', JSON.stringify(user)),
  getSession: (): UserProfile | null => {
    const s = localStorage.getItem('churre_session');
    try {
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },
  clearSession: () => localStorage.removeItem('churre_session'),

  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from('menu_items').select('*').order('name');
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        variants: Array.isArray(item.variants) ? item.variants : [],
        hasVariants: Array.isArray(item.variants) && item.variants.length > 0,
        stock: Number(item.stock || 0)
      }));
    } catch (e: any) {
      console.error("Error fetching products:", e);
      return [];
    }
  },
  
  saveProduct: async (product: Product) => {
    const payload: any = {
        name: product.name,
        price: Number(product.price),
        category: product.category,
        image: product.image || '',
        variants: product.variants || [],
        stock: Number(product.stock || 0),
        barcode: product.barcode || null
    };

    // Si es edición, enviamos el ID. Si es nuevo, dejamos que Supabase lo genere o enviamos uno.
    if (product.id && product.id.length > 5) {
        payload.id = product.id;
    }

    try {
        const { data, error } = await supabase
          .from('menu_items')
          .upsert(payload)
          .select();

        if (error) {
            const errorMsg = error.message || JSON.stringify(error);
            const isColumnError = errorMsg.toLowerCase().includes('column') || error.code === 'PGRST204' || error.code === '42703' || error.code === '42P01';
            
            if (isColumnError) {
                throw new Error(`SQL_FIX_REQUIRED|ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS id text PRIMARY KEY DEFAULT gen_random_uuid()::text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock numeric DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;`);
            }
            throw new Error(errorMsg);
        }
        return data ? data[0] : product;
    } catch (err: any) {
        throw err;
    }
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({
        ...d,
        id: d.id.toString(),
        date: d.created_at,
        items: typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []),
        total: Number(d.total || 0),
        paymentMethod: d.payment_method || 'cash',
        shiftId: d.session_id ? d.session_id.toString() : undefined,
        orderOrigin: d.order_origin || 'POS',
        customerName: d.customer_name,
        status: d.status,
        address: d.address
      }));
    } catch { return []; }
  },

  saveTransaction: async (transaction: Transaction) => {
    const { error } = await supabase.from('orders').insert({
        customer_name: transaction.customerName || 'Cliente POS',
        total: Number(transaction.total),
        modality: transaction.modality || 'pickup',
        status: 'Completado', 
        items: transaction.items,
        payment_method: transaction.paymentMethod,
        order_origin: 'POS',
        session_id: transaction.shiftId || null
      });
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  getSettings: async (): Promise<StoreSettings> => {
    try {
      const { data } = await supabase.from('pos_settings').select('*').eq('id', 1).single();
      if (!data) return { name: 'Churre POS', currency: 'S/', taxRate: 0.18, pricesIncludeTax: true, themeColor: '#e11d48' };
      return {
        name: data.name, currency: data.currency, taxRate: parseFloat(data.tax_rate) || 0,
        pricesIncludeTax: !!data.prices_include_tax, address: data.address, phone: data.phone,
        logo: data.logo, themeColor: data.theme_color, secondaryColor: data.secondary_color
      };
    } catch { return { name: 'Churre POS', currency: 'S/', taxRate: 0.18, pricesIncludeTax: true, themeColor: '#e11d48' }; }
  },

  saveSettings: async (settings: StoreSettings) => {
    await supabase.from('pos_settings').upsert({
      id: 1, name: settings.name, currency: settings.currency, tax_rate: settings.taxRate,
      prices_include_tax: settings.pricesIncludeTax, address: settings.address, phone: settings.phone,
      logo: settings.logo, theme_color: settings.themeColor, secondary_color: settings.secondaryColor
    });
  },

  getShifts: async (): Promise<CashShift[]> => {
    try {
      const { data } = await supabase.from('cash_sessions').select('*').order('id', { ascending: false });
      return (data || []).map(d => ({
          id: d.id.toString(), startTime: d.opened_at, endTime: d.closed_at,
          startAmount: Number(d.opening_balance || 0), endAmount: Number(d.closing_balance || 0),
          status: d.status.toUpperCase() as any, totalSalesCash: 0, totalSalesDigital: 0
      }));
    } catch { return []; }
  },

  saveShift: async (shift: CashShift) => {
    const { data, error } = await supabase.from('cash_sessions').upsert({
        opened_at: shift.startTime, closed_at: shift.endTime,
        opening_balance: shift.startAmount, closing_balance: shift.endAmount,
        status: shift.status.toLowerCase()
    }).select();
    if (error) throw error;
    const d = data[0];
    return { id: d.id.toString(), startTime: d.opened_at, endTime: d.closed_at, startAmount: d.opening_balance, endAmount: d.closing_balance, status: d.status.toUpperCase() };
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    try {
      const { data } = await supabase.from('suppliers').select('*').order('name');
      return data || [];
    } catch { return []; }
  },

  saveSupplier: async (supplier: Supplier) => {
    const { data, error } = await supabase.from('suppliers').upsert({
      name: supplier.name, contact: supplier.contact
    }).select();
    if (error) throw error;
    return data[0];
  },

  getPurchases: async (): Promise<Purchase[]> => {
    try {
      const { data } = await supabase.from('purchases').select('*').order('date', { ascending: false });
      return (data || []).map(d => ({ ...d, id: d.id.toString(), items: typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []), supplierId: d.supplier_id }));
    } catch { return []; }
  },

  savePurchase: async (purchase: Purchase) => {
    await supabase.from('purchases').insert({ supplier_id: purchase.supplierId, total: Number(purchase.total), items: purchase.items, date: purchase.date });
  },

  getMovements: async (): Promise<CashMovement[]> => {
    try {
      const { data } = await supabase.from('cash_transactions').select('*').order('created_at', { ascending: false });
      return (data || []).map(d => ({ id: d.id.toString(), shiftId: d.session_id ? d.session_id.toString() : '', type: d.type.toUpperCase() as any, amount: Number(d.amount), description: d.reason, timestamp: d.created_at }));
    } catch { return []; }
  },

  saveMovement: async (m: CashMovement) => {
    await supabase.from('cash_transactions').insert({ session_id: m.shiftId || null, type: m.type.toLowerCase(), amount: Number(m.amount), reason: m.description, created_at: m.timestamp });
  },

  updateWebOrderToKitchen: async (id: string, shiftId: string, paymentMethod: string, transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'En Cocina',
          session_id: shiftId,
          payment_method: paymentMethod,
          items: transaction.items,
          total: Number(transaction.total)
        })
        .eq('id', id);
      
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateOrderStatus: async (orderId: string, status: string, metadata?: any) => {
    try {
      const updateData: any = { status };
      if (metadata?.shiftId) updateData.session_id = metadata.shiftId;
      if (metadata?.paymentMethod) updateData.payment_method = metadata.paymentMethod;
      if (metadata?.total) updateData.total = Number(metadata.total);

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
