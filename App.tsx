
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
import { RefreshCw, X, Package, Tag, DollarSign, Layers, ImageIcon, Save, AlertCircle, Copy, Check, Database, Trash2 } from 'lucide-react';

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
  const [sqlFixScript, setSqlFixScript] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'SUCCESS' | 'ERROR'>('SUCCESS');

  const [pendingWebOrder, setPendingWebOrder] = useState<Transaction | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'PRODUCT' | 'ORDER' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        
    } catch (error: any) {
        console.error("Error al cargar datos:", error);
        if (error.message && error.message.includes('SQL_FIX_REQUIRED')) {
            setSqlFixScript(error.message.split('|')[1]);
        }
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
  
  const handleCheckout = async (method: any, payments: any[]) => {
      if(!activeShift) { alert("Abre un turno primero."); throw new Error("No active shift"); }
      
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
          setTicketType('SALE'); setTicketData(transaction); setShowTicket(true); setCart([]); setPendingWebOrder(null);
          await loadData(); 
          setToastType('SUCCESS'); setToastMessage("Venta Registrada"); setShowToast(true); setTimeout(() => setShowToast(false), 3000);
      } catch (err: any) {
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
              setTicketType('REPORT'); setTicketData({ shift: closed, movements: movements.filter(m => m.shiftId === activeShift.id), transactions: transactions.filter(t => t.shiftId === activeShift.id) }); setShowTicket(true);
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
          setToastMessage("Guardado"); setToastType('SUCCESS'); setShowToast(true); setTimeout(() => setShowToast(false), 3000);
      } catch (e: any) { 
        if (e.message && e.message.includes('SQL_FIX_REQUIRED')) {
            setSqlFixScript(e.message.split('|')[1]);
        } else {
            const finalMsg = typeof e === 'object' ? (e.message || JSON.stringify(e)) : e;
            alert(`Error al guardar: ${finalMsg}`); 
        }
      }
  };

  const copySqlToClipboard = () => {
    if (sqlFixScript) {
      navigator.clipboard.writeText(sqlFixScript);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'PRODUCT') {
        await StorageService.deleteProduct(itemToDelete.id);
        setToastMessage("Producto eliminado");
      }
      setToastType('SUCCESS');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      loadData();
    } catch (e: any) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  if (isInitializing) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fef2f2]">
        <RefreshCw className="w-12 h-12 text-rose-600 animate-spin" />
        <p className="mt-4 font-bold text-rose-600 uppercase text-[10px] tracking-widest">Sincronizando Sistema...</p>
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
              <OnlineOrdersView settings={settings} activeShift={activeShift} onOrderCompleted={(t) => { setTicketType('SALE'); setTicketData(t); setShowTicket(true); loadData(); }} />
          )}
          {view === ViewState.INVENTORY && (
              <InventoryView 
                  products={products} 
                  settings={settings} 
                  transactions={transactions} 
                  purchases={purchases} 
                  onNewProduct={() => { 
                      setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], image: '' }); 
                      setIsProductModalOpen(true); 
                  }} 
                  onEditProduct={(p) => { 
                      setCurrentProduct(p); 
                      setIsProductModalOpen(true); 
                  }} 
                  onDeleteProduct={(id) => {
                      setItemToDelete({ id, type: 'PRODUCT' });
                  }} 
                  onGoToPurchase={(name) => { 
                      setInitialPurchaseSearch(name); 
                      setView(ViewState.PURCHASES); 
                  }} 
              />
          )}
          {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={async (p) => { await StorageService.savePurchase(p); loadData(); }} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); loadData(); }} onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], barcode: barcode || '', image: '' }); setIsProductModalOpen(true); }} initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')} />}
          {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} settings={settings} />}
          {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
          {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); loadData(); }} />}

          <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
          
          {showToast && <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl text-white font-black z-[200] animate-fade-in-up uppercase text-xs tracking-widest ${toastType === 'SUCCESS' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toastMessage}</div>}
          
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
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronización Cloud</p>
                            </div>
                        </div>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-brand transition-all"><X className="w-7 h-7"/></button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Nombre del Ítem</label>
                                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-brand transition-all" placeholder="Nombre" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Precio</label>
                                      <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all" placeholder="0.00" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Stock</label>
                                      <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all" placeholder="0" value={currentProduct.stock || '0'} onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value) || 0})} />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Categoría</label>
                                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-brand transition-all" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} >
                                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Código de Barras</label>
                                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-600 outline-none focus:border-brand transition-all" placeholder="Opcional" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct, barcode: e.target.value})} />
                              </div>
                          </div>

                          <div className="space-y-6">
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">Imagen URL</label>
                                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-500 outline-none focus:border-brand transition-all text-xs" placeholder="https://..." value={currentProduct.image || ''} onChange={e => setCurrentProduct({...currentProduct, image: e.target.value})} />
                              </div>
                              <div className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-100 flex items-center justify-center overflow-hidden relative group">
                                  {currentProduct.image ? (
                                      <img src={currentProduct.image} alt="Preview" className="w-full h-full object-cover" />
                                  ) : (
                                      <ImageIcon className="w-12 h-12 text-slate-200" />
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="mt-10 flex gap-4">
                          <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-200 transition-all">Cancelar</button>
                          <button onClick={handleSaveProduct} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
                            <Save className="w-5 h-5 text-brand"/> Guardar Producto
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </Layout>

      {/* MODAL DE REPARACIÓN SQL */}
      {sqlFixScript && (
          <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in-up border border-white">
                  <div className="p-10 bg-rose-600 text-white flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6">
                          <Database className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight mb-2 uppercase italic">Reparación Necesaria</h2>
                      <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Base de Datos Desactualizada</p>
                  </div>
                  
                  <div className="p-10">
                      <p className="text-slate-600 font-medium text-sm leading-relaxed mb-8">
                          Para que el sistema pueda guardar productos, necesitas actualizar la estructura de tu tabla <span className="font-black text-slate-800">menu_items</span> en Supabase.
                      </p>
                      
                      <div className="bg-slate-900 rounded-3xl p-6 mb-8 relative group">
                          <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                                {sqlFixScript}
                            </pre>
                          </div>
                          <button 
                            onClick={copySqlToClipboard}
                            className={`absolute top-4 right-4 p-3 rounded-xl transition-all shadow-lg ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          >
                            {isCopied ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                          </button>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="w-8 h-8 bg-brand-soft text-brand rounded-lg flex items-center justify-center shrink-0 font-black text-sm">1</div>
                              <p className="text-xs font-bold text-slate-600">Copia el código de arriba con el botón blanco.</p>
                          </div>
                          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="w-8 h-8 bg-brand-soft text-brand rounded-lg flex items-center justify-center shrink-0 font-black text-sm">2</div>
                              <p className="text-xs font-bold text-slate-600">Ve a <span className="text-indigo-600">Supabase &gt; SQL Editor</span>, pégalo y presiona <span className="font-black">Run</span>.</p>
                          </div>
                      </div>

                      <button 
                        onClick={() => { setSqlFixScript(null); loadData(); }} 
                        className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl"
                      >
                          Ya lo hice, Reintentar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showTicket && ticketData && (
          <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />
      )}

      {/* MODAL DE CONFIRMACIÓN GLOBAL */}
      {itemToDelete && (
          <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-fade-in-up border border-rose-100">
                  <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                      <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">¿Confirmar Eliminación?</h3>
                  <p className="text-sm text-slate-500 text-center mb-8 font-medium">Esta acción no se puede deshacer.</p>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => setItemToDelete(null)}
                          disabled={isDeleting}
                          className="py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={confirmDelete}
                          disabled={isDeleting}
                          className="py-4 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Eliminar'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default App;
