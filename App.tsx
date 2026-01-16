
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
import { RefreshCw, X, Package, Tag, DollarSign, Layers, ImageIcon, Save, AlertCircle } from 'lucide-react';

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
          
          setTicketType('SALE'); 
          setTicketData(transaction); 
          setShowTicket(true);
          setCart([]); 
          setPendingWebOrder(null);
          
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
          loadData();
          setToastMessage("Producto guardado correctamente");
          setToastType('SUCCESS');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
      } catch (e: any) { 
        alert(`Error al guardar: ${e.message}\nVerifica que la columna 'stock' exista en Supabase.`); 
      }
  };

  if (isInitializing) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fef2f2]">
        <RefreshCw className="w-12 h-12 text-rose-600 animate-spin" />
        <p className="mt-4 font-bold text-rose-600 uppercase text-[10px] tracking-widest">Sincronizando Sistema v14...</p>
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
              <OnlineOrdersView settings={settings} activeShift={activeShift} onImportToPOS={handleImportWebOrder} onOrderCompleted={handleOnlineOrderCompleted} />
          )}
          {view === ViewState.INVENTORY && <InventoryView products={products} settings={settings} transactions={transactions} purchases={purchases} onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], image: '' }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} onDeleteProduct={async (id) => { if(confirm('¿Eliminar?')) { await StorageService.deleteProduct(id); loadData(); } }} onGoToPurchase={(name) => { setInitialPurchaseSearch(name); setView(ViewState.PURCHASES); }} />}
          {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={async (p) => { await StorageService.savePurchase(p); loadData(); }} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); loadData(); }} onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], barcode: barcode || '', image: '' }); setIsProductModalOpen(true); }} initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')} />}
          {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} settings={settings} />}
          {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
          {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); loadData(); }} />}

          <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
          
          {showToast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl text-white font-black z-[200] animate-fade-in-up uppercase text-xs tracking-widest ${toastType === 'SUCCESS' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toastMessage}</div>}
          
          {/* MODAL DE PRODUCTO MEJORADO */}
          {isProductModalOpen && currentProduct && (
              <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                  <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-fade-in-up border border-white/20 my-auto">
                      <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-brand">
                                <Package className="w-8 h-8"/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">{currentProduct.id ? 'Editar' : 'Nuevo'} Producto</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronización Supabase Cloud</p>
                            </div>
                        </div>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-brand transition-all"><X className="w-7 h-7"/></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Columna Izquierda: Datos Principales */}
                          <div className="space-y-6">
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Layers className="w-3 h-3"/> Nombre del Ítem</label>
                                  <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-brand transition-all" 
                                    placeholder="Nombre" 
                                    value={currentProduct.name} 
                                    onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} 
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign className="w-3 h-3"/> Precio</label>
                                      <input 
                                        type="number" 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all" 
                                        placeholder="0.00" 
                                        value={currentProduct.price || ''} 
                                        onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} 
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Package className="w-3 h-3"/> Stock</label>
                                      <input 
                                        type="number" 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all" 
                                        placeholder="0" 
                                        value={currentProduct.stock || '0'} 
                                        onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value) || 0})} 
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Categoría</label>
                                  <select 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand transition-all"
                                    value={currentProduct.category}
                                    onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}
                                  >
                                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                              </div>

                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Tag className="w-3 h-3"/> Código de Barras</label>
                                  <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-600 outline-none focus:border-brand transition-all" 
                                    placeholder="Opcional" 
                                    value={currentProduct.barcode || ''} 
                                    onChange={e => setCurrentProduct({...currentProduct, barcode: e.target.value})} 
                                  />
                              </div>
                          </div>

                          {/* Columna Derecha: Imagen */}
                          <div className="space-y-6">
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ImageIcon className="w-3 h-3"/> URL de la Imagen</label>
                                  <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-500 outline-none focus:border-brand transition-all text-xs" 
                                    placeholder="https://..." 
                                    value={currentProduct.image || ''} 
                                    onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})} 
                                  />
                              </div>

                              <div className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-100 flex items-center justify-center overflow-hidden relative group">
                                  {currentProduct.image ? (
                                      <img src={currentProduct.image} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                  ) : (
                                      <div className="text-center p-6">
                                          <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-2"/>
                                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Pega una URL arriba para previsualizar</p>
                                      </div>
                                  )}
                              </div>

                              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0"/>
                                <p className="text-[10px] font-bold text-amber-700 leading-tight uppercase italic">Asegúrate de que la URL termine en .jpg, .png o .webp para que se vea correctamente.</p>
                              </div>
                          </div>
                      </div>

                      <div className="mt-10 flex gap-4">
                          <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-200 transition-all">Cancelar</button>
                          <button onClick={handleSaveProduct} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
                            <Save className="w-5 h-5 text-brand"/> Guardar Cambios
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </Layout>

      {showTicket && ticketData && (
          <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />
      )}
    </>
  );
};

export default App;
