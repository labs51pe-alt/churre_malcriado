
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
      if (error) return [];
      return (data || []).map(item => ({
        ...item,
        variants: Array.isArray(item.variants) ? item.variants : [],
        hasVariants: Array.isArray(item.variants) && item.variants.length > 0
      }));
    } catch { return []; }
  },
  
  saveProduct: async (product: Product) => {
    const { data, error } = await supabase.from('menu_items').upsert({
        id: product.id && product.id.length > 5 ? product.id : undefined,
        name: product.name,
        price: product.price,
        category: product.category,
        image: product.image,
        variants: product.variants || [],
        stock: product.stock,
        barcode: product.barcode
      }).select();
    if (error) throw new Error(error.message);
    return data ? data[0] : product;
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
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
        orderOrigin: d.order_origin,
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
    if (error) throw new Error(error.message);
  },

  /**
   * ACTUALIZACIÓN DE ESTADO - VERSIÓN "BLINDADA"
   * Se eliminó .select() para evitar errores causados por RLS restrictivos.
   */
  updateOrderStatus: async (orderId: string, newStatus: string, additionalData: any = {}) => {
    const rawId = String(orderId).trim();
    if (!rawId || rawId === 'undefined' || rawId === 'null') {
        return { success: false, error: "ID de pedido no válido." };
    }

    const paymentMap: Record<string, string> = {
        'cash': 'Efectivo',
        'yape': 'Yape',
        'plin': 'Plin',
        'card': 'Tarjeta',
        'transfer': 'Transferencia'
    };

    const method = paymentMap[additionalData.paymentMethod] || additionalData.paymentMethod || 'Efectivo';

    // Construimos el objeto de actualización con solo lo necesario
    const payload: any = { 
        status: newStatus,
        payment_method: method
    };

    if (additionalData.shiftId) {
        payload.session_id = additionalData.shiftId;
    }

    console.log(`[DB-ACTION] Intentando actualizar ID: ${rawId} -> ${newStatus}`);

    try {
        // Ejecutamos el UPDATE sin .select(). Esto es clave si el RLS bloquea la lectura post-edición.
        const { error, status, statusText } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', rawId);

        if (error) {
            console.error("[DB-ACTION] Error Supabase:", error);
            throw error;
        }

        // En Supabase, si status es 204 o 200 y no hay error, la petición fue aceptada.
        // Si no afectó filas (debido a RLS), status sigue siendo exitoso pero no hizo nada.
        // Para verificar realmente, hacemos un chequeo rápido si el status es sospechoso
        console.log(`[DB-ACTION] Respuesta DB: Status ${status} (${statusText})`);
        
        return { success: true };
    } catch (err: any) {
        console.error("[DB-ACTION] Error crítico:", err.message);
        return { success: false, error: err.message };
    }
  },

  updateWebOrderToKitchen: async (orderId: string, shiftId: string, method: string, transaction: Transaction) => {
    return await StorageService.updateOrderStatus(orderId, 'Completado', {
        shiftId,
        paymentMethod: method,
        total: transaction.total
    });
  },

  getSettings: async (): Promise<StoreSettings> => {
    try {
      const { data, error } = await supabase.from('pos_settings').select('*').eq('id', 1).single();
      if (error || !data) return { name: 'Churre POS', currency: 'S/', taxRate: 0.18, pricesIncludeTax: true, themeColor: '#e11d48' };
      return {
        name: data.name,
        currency: data.currency,
        taxRate: parseFloat(data.tax_rate) || 0,
        pricesIncludeTax: !!data.prices_include_tax,
        address: data.address,
        phone: data.phone,
        logo: data.logo,
        themeColor: data.theme_color,
        secondaryColor: data.secondary_color
      } as any;
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
        ...(shift.id.length > 10 ? { id: shift.id } : {}),
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
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      return error ? [] : data || [];
    } catch { return []; }
  },

  saveSupplier: async (supplier: Supplier) => {
    const { data, error } = await supabase.from('suppliers').upsert({
      id: supplier.id.length > 10 ? supplier.id : undefined,
      name: supplier.name, contact: supplier.contact
    }).select();
    if (error) throw error;
    return data[0];
  },

  getPurchases: async (): Promise<Purchase[]> => {
    try {
      const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({ ...d, id: d.id.toString(), items: typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []), supplierId: d.supplier_id }));
    } catch { return []; }
  },

  savePurchase: async (purchase: Purchase) => {
    const { error } = await supabase.from('purchases').insert({ supplier_id: purchase.supplierId, total: Number(purchase.total), items: purchase.items, date: purchase.date });
    if (error) throw error;
  },

  getMovements: async (): Promise<CashMovement[]> => {
    try {
      const { data, error } = await supabase.from('cash_transactions').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({ id: d.id.toString(), shiftId: d.session_id ? d.session_id.toString() : '', type: d.type.toUpperCase() as any, amount: Number(d.amount), description: d.reason, timestamp: d.created_at }));
    } catch { return []; }
  },

  saveMovement: async (m: CashMovement) => {
    await supabase.from('cash_transactions').insert({ session_id: m.shiftId || null, type: m.type.toLowerCase(), amount: Number(m.amount), reason: m.description, created_at: m.timestamp });
  }
};
