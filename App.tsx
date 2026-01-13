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
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  // Inyectar variables de color dinámicas basadas en Settings
  useEffect(() => {
    const brand = settings.themeColor || '#e11d48';
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
        setProducts(p);
        setTransactions(t);
        setPurchases(pur);
        setSuppliers(s);
        setShifts(sh);
        setMovements(mv);
        setSettings(setts);
        
        const openShift = sh.find(s => s.status === 'OPEN');
        if (openShift) setActiveShiftId(openShift.id);
        
        setIsInitializing(false);
    } catch (error) {
        console.error("Error loading data from Supabase:", error);
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

  const handleLogout = () => { 
      setUser(null); 
      StorageService.clearSession(); 
      setCart([]); 
  };

  const handleAddToCart = (product: Product, variantId?: string) => { 
      setCart(prev => { 
          const existing = prev.find(item => item.id === product.id && item.selectedVariantId === variantId); 
          if (existing) { 
              return prev.map(item => (item.id === product.id && item.selectedVariantId === variantId) ? { ...item, quantity: item.quantity + 1 } : item); 
          } 
          let finalPrice = product.price; 
          let selectedVariantName = undefined; 
          if (variantId && product.variants) { 
              const variant = product.variants.find(v => v.id === variantId); 
              if (variant) { 
                  finalPrice = variant.price; 
                  selectedVariantName = variant.name; 
              } 
          } 
          return [...prev, { ...product, price: finalPrice, quantity: 1, selectedVariantId: variantId, selectedVariantName }]; 
      }); 
  };

  const handleUpdateCartQuantity = (id: string, delta: number, variantId?: string) => { 
      setCart(prev => prev.map(item => { 
          if (item.id === id && item.selectedVariantId === variantId) return { ...item, quantity: Math.max(1, item.quantity + delta) }; 
          return item; 
      })); 
  };

  const handleRemoveFromCart = (id: string, variantId?: string) => { 
      setCart(prev => prev.filter(item => !(item.id === id && item.selectedVariantId === variantId))); 
  };

  const handleUpdateDiscount = (id: string, discount: number, variantId?: string) => { 
      setCart(prev => prev.map(item => (item.id === id && item.selectedVariantId === variantId) ? { ...item, discount } : item)); 
  };
  
  const handleCheckout = async (method: any, payments: any[]) => {
      if(!activeShift) return alert("Abre un turno primero.");
      
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = cart.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
      const total = Math.max(0, subtotal - totalDiscount);
      let tax = settings.pricesIncludeTax ? (total - (total / (1 + settings.taxRate))) : (total * settings.taxRate);
      
      const transaction: Transaction = { 
          id: Date.now().toString(), 
          date: new Date().toISOString(), 
          items: [...cart], 
          subtotal: settings.pricesIncludeTax ? (total - tax) : total, 
          tax, 
          discount: totalDiscount, 
          total: settings.pricesIncludeTax ? total : (total + tax), 
          paymentMethod: method, 
          payments, 
          profit: 0, 
          shiftId: activeShift.id 
      };
      
      await StorageService.saveTransaction(transaction);
      
      const newProducts = products.map(p => { 
          const cartItems = cart.filter(c => c.id === p.id); 
          if (cartItems.length === 0) return p; 
          let newStock = p.stock; 
          let newVariants = p.variants ? [...p.variants] : []; 
          cartItems.forEach(c => { 
              if (c.selectedVariantId && newVariants.length) { 
                  newVariants = newVariants.map(v => v.id === c.selectedVariantId ? { ...v, stock: v.stock - c.quantity } : v); 
              } else { 
                  newStock -= c.quantity; 
              } 
          }); 
          if (p.hasVariants) newStock = newVariants.reduce((sum,v) => sum + v.stock, 0); 
          const updatedP = { ...p, stock: newStock, variants: newVariants };
          StorageService.saveProduct(updatedP);
          return updatedP;
      }); 
      
      setProducts(newProducts);
      setTransactions([transaction, ...transactions]);
      setCart([]); 
      setTicketType('SALE'); 
      setTicketData(transaction); 
      setShowTicket(true);
  };

  const handleCashAction = async (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      if (action === 'OPEN') {
          const newShiftObj: CashShift = { 
              id: Date.now().toString(), 
              startTime: new Date().toISOString(), 
              startAmount: amount, 
              status: 'OPEN', 
              totalSalesCash: 0, 
              totalSalesDigital: 0 
          };
          const savedShift = await StorageService.saveShift(newShiftObj);
          const shiftId = savedShift.id.toString();
          setActiveShiftId(shiftId); 
          setShifts([{ ...newShiftObj, id: shiftId }, ...shifts]); 
          
          const move: CashMovement = { id: Date.now().toString(), shiftId, type: 'OPEN', amount, description: 'Apertura de Caja', timestamp: new Date().toISOString() };
          await StorageService.saveMovement(move);
          setMovements([move, ...movements]);

      } else if (action === 'CLOSE' && activeShift) {
          const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
          await StorageService.saveShift(closedShift); 
          setShifts(shifts.map(s => s.id === activeShift.id ? closedShift : s)); 
          setActiveShiftId(null);
          
          const move: CashMovement = { id: Date.now().toString(), shiftId: activeShift.id, type: 'CLOSE', amount, description: 'Cierre de Caja', timestamp: new Date().toISOString() };
          await StorageService.saveMovement(move);
          setMovements([move, ...movements]);

          setTicketType('REPORT'); 
          setTicketData({ 
              shift: closedShift, 
              movements: movements.filter(m => m.shiftId === activeShift.id), 
              transactions: transactions.filter(t => t.shiftId === activeShift.id) 
          }); 
          setShowTicket(true);
      } else if (activeShift) {
          const move: CashMovement = { id: Date.now().toString(), shiftId: activeShift.id, type: action, amount, description, timestamp: new Date().toISOString() };
          await StorageService.saveMovement(move);
          setMovements([move, ...movements]);
      }
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name) return;
      const savedP = await StorageService.saveProduct(currentProduct);
      const updated = products.find(p => p.id === savedP.id) 
        ? products.map(p => p.id === savedP.id ? savedP : p) 
        : [...products, savedP];
      setProducts(updated); 
      setIsProductModalOpen(false);
  };
  
  const handleUpdateSettings = async (newSettings: StoreSettings) => {
      await StorageService.saveSettings(newSettings);
      setSettings(newSettings);
  };

  if (isInitializing) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fef2f2] animate-fade-in">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center animate-bounce shadow-2xl" style={{ backgroundColor: 'var(--brand-primary)' }}>
            <RefreshCw className="w-10 h-10 text-white animate-spin" />
        </div>
        <p className="mt-6 font-black uppercase tracking-widest text-xs" style={{ color: 'var(--brand-primary)' }}>Conectando con Churre Cloud...</p>
    </div>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="pos-app">
        <style>{`
            :root {
                --brand-primary: ${settings.themeColor || '#e11d48'};
                --brand-soft: ${(settings.themeColor || '#e11d48')}15;
                --brand-medium: ${(settings.themeColor || '#e11d48')}44;
            }
            .text-brand { color: var(--brand-primary); }
            .bg-brand { background-color: var(--brand-primary); }
            .bg-brand-soft { background-color: var(--brand-soft); }
            .border-brand { border-color: var(--brand-primary); }
            .ring-brand { --tw-ring-color: var(--brand-soft); }
        `}</style>
        
        <Layout currentView={view} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
            {view === ViewState.POS && (
                <POSView 
                    products={products} cart={cart} activeShift={activeShift} settings={settings} customers={customers} 
                    onAddToCart={handleAddToCart} onUpdateCart={handleUpdateCartQuantity} onRemoveFromCart={handleRemoveFromCart} 
                    onUpdateDiscount={handleUpdateDiscount} onCheckout={handleCheckout} onClearCart={() => setCart([])} 
                    onOpenCashControl={(action: any) => setShowCashControl(true)} 
                />
            )}
            {view === ViewState.INVENTORY && (
                <InventoryView 
                    products={products} settings={settings} transactions={transactions} purchases={purchases}
                    onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [] }); setIsProductModalOpen(true); }} 
                    onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} 
                    onDeleteProduct={async (id) => { if(confirm('¿Eliminar?')) { await StorageService.deleteProduct(id); setProducts(products.filter(p => p.id !== id)); } }} 
                    onGoToPurchase={(name) => { setInitialPurchaseSearch(name); setView(ViewState.PURCHASES); }}
                />
            )}
            {view === ViewState.PURCHASES && (
                <PurchasesView 
                    products={products} suppliers={suppliers} purchases={purchases} settings={settings}
                    onProcessPurchase={async (p, up) => { await StorageService.savePurchase(p); setPurchases([p, ...purchases]); setProducts(up); }}
                    onAddSupplier={async (s) => { await StorageService.saveSupplier(s); setSuppliers([...suppliers, s]); }}
                    onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], barcode: barcode || '' }); setIsProductModalOpen(true); }}
                    initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')}
                />
            )}
            {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} settings={settings} />}
            {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={handleUpdateSettings} />}

            <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
            
            {isProductModalOpen && currentProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">✕</button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del Producto</label>
                                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg outline-none focus:border-brand" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct!, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Precio Venta</label>
                                        <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-brand" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct!, price: parseFloat(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stock</label>
                                        <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:border-brand" value={currentProduct.stock || ''} onChange={e => setCurrentProduct({...currentProduct!, stock: parseFloat(e.target.value)})} disabled={currentProduct.hasVariants} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={handleSaveProduct} className="px-8 py-3 bg-brand text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">Guardar en la Nube</button>
                        </div>
                    </div>
                </div>
            )}
            {showTicket && ticketData && <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />}
        </Layout>
    </div>
  );
};

export default App;