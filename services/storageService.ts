
import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement } from '../types';
import { supabase } from './supabase';

export const StorageService = {
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
    
    if (error) throw new Error(error.message);
    return data ? data[0] : product;
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
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
          shiftId: d.session_id ? d.session_id.toString() : undefined,
          orderOrigin: d.order_origin
      }));
    } catch {
      return [];
    }
  },

  saveTransaction: async (transaction: Transaction) => {
    const validModality = (transaction.modality === 'delivery' || transaction.modality === 'pickup') 
        ? transaction.modality 
        : 'pickup';

    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: transaction.customerName || 'Cliente POS',
        total: Number(transaction.total),
        subtotal: Number(transaction.subtotal || 0),
        tax: Number(transaction.tax || 0),
        discount: Number(transaction.discount || 0),
        modality: validModality,
        status: transaction.status || 'Preparando', 
        items: transaction.items,
        payment_method: transaction.paymentMethod,
        order_origin: transaction.orderOrigin || 'POS',
        session_id: transaction.shiftId ? parseInt(transaction.shiftId) : null
      })
      .select();
    
    if (error) {
        console.error("Error saving transaction:", error);
        throw new Error(error.message);
    }
    return data ? data[0] : null;
  },

  updateOrderStatus: async (orderId: string, newStatus: string, additionalData: any = {}) => {
    if (!orderId) return { success: false, error: 'ID de orden no válido' };
    
    const allowedFields = ['status', 'session_id', 'payment_method', 'total', 'subtotal', 'tax', 'discount', 'modality', 'items', 'order_origin'];
    const cleanPayload: any = { status: newStatus };
    
    Object.keys(additionalData).forEach(key => {
        if (allowedFields.includes(key)) cleanPayload[key] = additionalData[key];
    });

    try {
      const { error } = await supabase.from('orders').update(cleanPayload).eq('id', orderId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateWebOrderToKitchen: async (orderId: string, shiftId: string, method: string, transaction: Transaction) => {
    try {
        const methodMap: Record<string, string> = {
            'cash': 'Efectivo', 'card': 'Tarjeta', 'yape': 'Yape/Plin', 'plin': 'Yape/Plin', 'mixed': 'Mixto'
        };
        const formattedMethod = methodMap[method] || method;

        // 1. Insertar el pedido nuevo primero para asegurar que la cocina lo vea
        const newTransaction: Transaction = {
            ...transaction,
            id: undefined as any, // Dejar que Supabase genere un ID nuevo
            status: 'Preparando',
            orderOrigin: 'Web',
            shiftId: shiftId,
            paymentMethod: formattedMethod,
            modality: (transaction.modality === 'delivery' || transaction.modality === 'pickup') ? transaction.modality : 'pickup'
        };

        await StorageService.saveTransaction(newTransaction);

        // 2. Borrar el pedido original INMEDIATAMENTE después
        const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);

        if (deleteError) console.error("Error al borrar original:", deleteError);

        return { success: true };
    } catch (err: any) {
        console.error("Error en transformación de pedido:", err);
        return { success: false, error: err.message };
    }
  },

  getPurchases: async (): Promise<Purchase[]> => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('date', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({
        ...d,
        supplierId: d.supplier_id
      }));
    } catch {
      return [];
    }
  },

  savePurchase: async (purchase: Purchase) => {
    const { error } = await supabase
      .from('purchases')
      .insert({
        supplier_id: purchase.supplierId,
        total: purchase.total,
        items: purchase.items
      });
    if (error) throw new Error(error.message);
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  saveSupplier: async (supplier: Supplier) => {
    const { data, error } = await supabase
      .from('suppliers')
      .upsert({
        id: supplier.id && supplier.id.length > 5 ? supplier.id : undefined,
        name: supplier.name,
        contact: supplier.contact
      })
      .select();
    if (error) throw new Error(error.message);
    return data ? data[0] : supplier;
  },

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
      // Fix: Use correct camelCase property name secondaryColor from StoreSettings interface
      secondary_color: settings.secondaryColor
    };
    const { error } = await supabase.from('pos_settings').upsert(payload);
    if (error) throw new Error(error.message);
  },

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
    if (result.error) throw new Error(result.error.message);
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
    if (error) throw new Error(error.message);
  }
};
