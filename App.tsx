
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Product, CartItem, Transaction, StoreSettings, Purchase, CashShift, CashMovement, UserProfile, Customer, Supplier } from './types';
import { StorageService } from './services/storageService';
import { Layout } from './components/Layout';
import { Ticket } from './components/Ticket';
import { Auth } from './components/Auth';
import { AdminView } from './components/AdminView';
import { InventoryView } from './components/InventoryView';
import { PurchasesView } from './components/PurchasesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { OnlineOrdersView } from './components/OnlineOrdersView';
import { CashControlModal } from './components/CashControlModal';
import { POSView } from './components/POSView';
import { DEFAULT_SETTINGS, CATEGORIES } from './constants';
import { RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.POS);
  const [isInitializing, setIsInitializing] = useState(true);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [showCashControl, setShowCashControl] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketType, setTicketType] = useState<'SALE' | 'REPORT'>('SALE');
  const [ticketData, setTicketData] = useState<any>(null);
  const [initialPurchaseSearch, setInitialPurchaseSearch] = useState('');
  
  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'SUCCESS' | 'ERROR'>('SUCCESS');

  const [pendingWebOrder, setPendingWebOrder] = useState<Transaction | null>(null);

  useEffect(() => {
    const brand = typeof settings.themeColor === 'string' ? settings.themeColor : '#e11d48';
    document.documentElement.style.setProperty('--brand-primary', brand);
    document.documentElement.style.setProperty('--brand-soft', `${brand}15`);
    document.documentElement.style.setProperty('--brand-medium', `${brand}44`);
  }, [settings.themeColor]);

  const loadData = async () => {
    try {
        const [p, t, pur, s, sh, mv, setts] = await Promise.all([
            StorageService.getProducts(),
            StorageService.getTransactions(),
            StorageService.getPurchases(),
            StorageService.getSuppliers(),
            StorageService.getShifts(),
            StorageService.getMovements(),
            StorageService.getSettings()
        ]);
        setProducts(p || []);
        setTransactions(t || []);
        setPurchases(pur || []);
        setSuppliers(s || []);
        setShifts(sh || []);
        setMovements(mv || []);
        setSettings(setts || DEFAULT_SETTINGS);
        
        const openShift = (sh || []).find(s => s.status === 'OPEN');
        if (openShift) setActiveShiftId(openShift.id);
        
    } catch (error) {
        console.error("Error al cargar datos:", error);
    } finally {
        setIsInitializing(false);
    }
  };

  useEffect(() => {
    const savedUser = StorageService.getSession();
    if (savedUser) setUser(savedUser);
    loadData();
  }, []);

  const activeShift = useMemo(() => shifts.find(s => s.id === activeShiftId), [shifts, activeShiftId]);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser); 
    StorageService.saveSession(loggedInUser);
  };

  const handleLogout = () => { setUser(null); StorageService.clearSession(); setCart([]); };

  const handleAddToCart = (product: Product, variantId?: string) => { 
      setCart(prev => { 
          const existing = prev.find(item => item.id === product.id && item.selectedVariantId === variantId); 
          if (existing) return prev.map(item => (item.id === product.id && item.selectedVariantId === variantId) ? { ...item, quantity: item.quantity + 1 } : item); 
          let finalPrice = product.price; 
          let selectedVariantName = undefined; 
          if (variantId && product.variants) { 
              const variant = product.variants.find(v => v.id === variantId); 
              if (variant) { finalPrice = variant.price; selectedVariantName = variant.name; } 
          } 
          return [...prev, { ...product, price: finalPrice, quantity: 1, selectedVariantId: variantId, selectedVariantName }]; 
      }); 
  };

  const handleUpdateCartQuantity = (id: string, delta: number, variantId?: string) => { 
      setCart(prev => prev.map(item => (item.id === id && item.selectedVariantId === variantId) ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)); 
  };

  const handleRemoveFromCart = (id: string, variantId?: string) => { setCart(prev => prev.filter(item => !(item.id === id && item.selectedVariantId === variantId))); };
  const handleUpdateDiscount = (id: string, discount: number, variantId?: string) => { setCart(prev => prev.map(item => (item.id === id && item.selectedVariantId === variantId) ? { ...item, discount } : item)); };
  
  const handleImportWebOrder = (order: Transaction) => {
      if (!activeShift) return alert("Debes abrir la caja antes de procesar pagos.");
      setCart(order.items);
      setPendingWebOrder(order);
      setView(ViewState.POS);
  };

  const handleOnlineOrderCompleted = (transaction: Transaction) => {
      setTicketType('SALE');
      setTicketData(transaction);
      setShowTicket(true);
      
      setToastType('SUCCESS'); 
      setToastMessage("Venta Web Cobrada");
      setShowToast(true); 
      setTimeout(() => setShowToast(false), 3000);
      
      // Actualizar datos de caja
      loadData();
  };

  const handleCheckout = async (method: any, payments: any[]) => {
      if(!activeShift) {
          alert("Abre un turno primero.");
          throw new Error("No active shift");
      }
      
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = cart.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
      const total = Math.max(0, subtotal - totalDiscount);
      let tax = settings.pricesIncludeTax ? (total - (total / (1 + settings.taxRate))) : (total * settings.taxRate);
      
      const transaction: Transaction = { 
          id: pendingWebOrder?.id || `TKT-${Date.now()}`, 
          date: new Date().toISOString(), 
          items: [...cart], 
          subtotal: settings.pricesIncludeTax ? (total - tax) : total, 
          tax, 
          discount: totalDiscount, 
          total: total, 
          paymentMethod: typeof method === 'string' ? method : (payments[0]?.method || 'mixed'), 
          payments: payments, 
          profit: 0, 
          shiftId: activeShift.id,
          onlineOrderId: pendingWebOrder?.id || undefined,
          modality: pendingWebOrder?.modality || 'pickup'
      };
      
      try {
          if (pendingWebOrder) {
              const result = await StorageService.updateWebOrderToKitchen(pendingWebOrder.id, activeShift.id, transaction.paymentMethod, transaction);
              if (!result.success) throw new Error(result.error);
          } else {
              await StorageService.saveTransaction(transaction);
          }
          
          // ACTIVAR TICKET Y LIMPIAR
          setTicketType('SALE'); 
          setTicketData(transaction); 
          setShowTicket(true);
          setCart([]); 
          setPendingWebOrder(null);
          
          // REFRESCAR DATOS PARA CAJA
          await loadData(); 
          
          setToastType('SUCCESS'); 
          setToastMessage("Venta Registrada Exitosamente");
          setShowToast(true); 
          setTimeout(() => setShowToast(false), 3000);
      } catch (err: any) {
          console.error("Error en checkout:", err);
          alert(`Error al registrar venta: ${err.message}`);
          throw err;
      }
  };

  const handleCashAction = async (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      try {
          if (action === 'OPEN') {
              const savedShift = await StorageService.saveShift({ id: Date.now().toString(), startTime: new Date().toISOString(), startAmount: amount, status: 'OPEN', totalSalesCash: 0, totalSalesDigital: 0 });
              setActiveShiftId(savedShift.id);
              await StorageService.saveMovement({ id: Date.now().toString(), shiftId: savedShift.id, type: 'OPEN', amount, description: 'Apertura de Caja', timestamp: new Date().toISOString() });
          } else if (action === 'CLOSE' && activeShift) {
              const closed = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
              await StorageService.saveShift(closed);
              setActiveShiftId(null);
              await StorageService.saveMovement({ id: Date.now().toString(), shiftId: activeShift.id, type: 'CLOSE', amount, description: 'Cierre de Caja', timestamp: new Date().toISOString() });
              
              setTicketType('REPORT'); 
              setTicketData({ 
                  shift: closed, 
                  movements: movements.filter(m => m.shiftId === activeShift.id), 
                  transactions: transactions.filter(t => t.shiftId === activeShift.id) 
              }); 
              setShowTicket(true);
          } else if (activeShift) {
              await StorageService.saveMovement({ id: Date.now().toString(), shiftId: activeShift.id, type: action, amount, description, timestamp: new Date().toISOString() });
          }
          await loadData();
      } catch (e: any) { alert(e.message); }
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name) return;
      try {
          await StorageService.saveProduct(currentProduct);
          setIsProductModalOpen(false);
          await loadData();
      } catch (e: any) { alert(e.message); }
  };

  if (isInitializing) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fef2f2]">
        <RefreshCw className="w-12 h-12 text-rose-600 animate-spin" />
        <p className="mt-4 font-bold text-rose-600">Sincronizando con Supabase...</p>
    </div>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <>
      <Layout currentView={view} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
          {view === ViewState.POS && (
              <POSView products={products} cart={cart} activeShift={activeShift} settings={settings} onAddToCart={handleAddToCart} onUpdateCart={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onUpdateDiscount={handleUpdateDiscount} onCheckout={handleCheckout} onClearCart={() => { setCart([]); setPendingWebOrder(null); }} onOpenCashControl={() => setShowCashControl(true)} />
          )}
          {view === ViewState.ONLINE_ORDERS && (
              <OnlineOrdersView 
                settings={settings} 
                activeShift={activeShift} 
                onImportToPOS={handleImportWebOrder} 
                onOrderCompleted={handleOnlineOrderCompleted}
              />
          )}
          {view === ViewState.INVENTORY && <InventoryView products={products} settings={settings} transactions={transactions} purchases={purchases} onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [] }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} onDeleteProduct={async (id) => { if(confirm('¿Eliminar?')) { await StorageService.deleteProduct(id); loadData(); } }} onGoToPurchase={(name) => { setInitialPurchaseSearch(name); setView(ViewState.PURCHASES); }} />}
          {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={async (p) => { await StorageService.savePurchase(p); loadData(); }} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); loadData(); }} onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], barcode: barcode || '' }); setIsProductModalOpen(true); }} initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')} />}
          {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} settings={settings} />}
          {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
          {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); loadData(); }} />}

          <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
          
          {showToast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl text-white font-bold z-[100] ${toastType === 'SUCCESS' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toastMessage}</div>}
          
          {isProductModalOpen && currentProduct && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl w-full max-w-lg p-6">
                      <h2 className="text-xl font-bold mb-4 tracking-tight">{currentProduct.id ? 'Editar' : 'Nuevo'} Producto</h2>
                      <div className="space-y-4">
                          <input className="w-full p-3 border rounded-xl" placeholder="Nombre" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                          <input type="number" className="w-full p-3 border rounded-xl" placeholder="Precio" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} />
                          <button onClick={handleSaveProduct} className="w-full py-4 bg-brand text-white rounded-xl font-bold shadow-lg">Guardar Producto</button>
                          <button onClick={() => setIsProductModalOpen(false)} className="w-full py-3 text-slate-400 font-bold">Cancelar</button>
                      </div>
                  </div>
              </div>
          )}
      </Layout>

      {/* TICKET EN CAPA SUPERIOR (Z-999) */}
      {showTicket && ticketData && (
          <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />
      )}
    </>
  );
};

export default App;
