
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
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        modality: 'pickup',
        status: 'Completado',
        items: transaction.items,
        payment_method: transaction.paymentMethod,
        order_origin: 'POS',
        session_id: transaction.shiftId ? parseInt(transaction.shiftId) : null
      });
    if (error) throw new Error(error.message);
  },

  // Función de actualización (Cambiado de upsert a update para evitar RLS de inserción)
  updateOrderStatus: async (orderId: string, newStatus: string, additionalData: any = {}) => {
    if (!orderId) return false;

    try {
      // Usamos UPDATE en lugar de UPSERT. 
      // Si el pedido no existe en la nube, fallará silenciosamente y se manejará en el App.tsx
      const { data, error } = await supabase
        .from('orders')
        .update({ 
            status: newStatus,
            ...additionalData
        })
        .eq('id', String(orderId).trim())
        .select();

      if (error) {
          // El error de "violates RLS policy" se captura aquí
          console.error("Error de Permisos Supabase (RLS):", error.message);
          return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error("Excepción al actualizar estado:", err);
      return false;
    }
  },

  updateWebOrderToKitchen: async (orderId: string, shiftId: string, method: string, transaction: Transaction) => {
    const methodMap: Record<string, string> = {
        'cash': 'Efectivo',
        'card': 'Tarjeta',
        'yape': 'Yape/Plin',
        'plin': 'Yape/Plin',
        'mixed': 'Mixto'
    };
    
    const formattedMethod = methodMap[method] || method;

    const payload = {
        session_id: parseInt(shiftId), 
        payment_method: formattedMethod,
        items: transaction.items,
        total: transaction.total,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        order_origin: 'Web', 
        customer_name: transaction.customerName || 'Cliente Web',
        modality: transaction.modality || 'pickup'
    };

    return await StorageService.updateOrderStatus(orderId, 'Preparando', payload);
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
        id: purchase.id,
        date: purchase.date,
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
      secondary_color: settings.secondaryColor
    };
    
    const { error } = await supabase
      .from('pos_settings')
      .upsert(payload);
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
  }
};
