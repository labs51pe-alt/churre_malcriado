import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Product, CartItem, Transaction, StoreSettings, Purchase, CashShift, CashMovement, UserProfile, Customer, Supplier } from './types';
import { StorageService } from './services/storageService';
import { Layout } from './components/Layout';
import { Cart } from './components/Cart';
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
import { Plus, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.POS);

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
  
  // Product Form State
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('');

  // Initial Load
  useEffect(() => {
    const savedUser = StorageService.getSession();
    if (savedUser) { 
        setUser(savedUser); 
        setView(ViewState.POS); 
    }
    setProducts(StorageService.getProducts());
    setTransactions(StorageService.getTransactions());
    setPurchases(StorageService.getPurchases());
    setSettings(StorageService.getSettings());
    setCustomers(StorageService.getCustomers());
    setSuppliers(StorageService.getSuppliers());
    setShifts(StorageService.getShifts());
    setMovements(StorageService.getMovements());
    setActiveShiftId(StorageService.getActiveShiftId());
  }, []);

  const activeShift = useMemo(() => shifts.find(s => s.id === activeShiftId), [shifts, activeShiftId]);

  // Handlers
  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser); 
    StorageService.saveSession(loggedInUser);
    setView(ViewState.POS);
  };

  const handleLogout = () => { 
      setUser(null); 
      StorageService.clearSession(); 
      setView(ViewState.POS); 
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
  
  const handleCheckout = (method: any, payments: any[]) => {
      if(!activeShift) {
        alert("Debes abrir un turno para realizar ventas.");
        return;
      }
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
      
      const newTransactions = [transaction, ...transactions]; 
      setTransactions(newTransactions); 
      StorageService.saveTransaction(transaction);
      
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
          return { ...p, stock: newStock, variants: newVariants }; 
      }); 
      
      setProducts(newProducts); 
      StorageService.saveProducts(newProducts);
      setCart([]); 
      setTicketType('SALE'); 
      setTicketData(transaction); 
      setShowTicket(true);
  };

  const handleCashAction = (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      if (action === 'OPEN') {
          const newShift: CashShift = { 
              id: Date.now().toString(), 
              startTime: new Date().toISOString(), 
              startAmount: amount, 
              status: 'OPEN', 
              totalSalesCash: 0, 
              totalSalesDigital: 0 
          };
          StorageService.saveShift(newShift); 
          StorageService.setActiveShiftId(newShift.id); 
          setShifts([newShift, ...shifts]); 
          setActiveShiftId(newShift.id);
      } else if (action === 'CLOSE' && activeShift) {
          const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
          StorageService.saveShift(closedShift); 
          StorageService.setActiveShiftId(null); 
          setShifts(shifts.map(s => s.id === activeShift.id ? closedShift : s)); 
          setActiveShiftId(null);
          setTicketType('REPORT'); 
          setTicketData({ 
              shift: closedShift, 
              movements: movements.filter(m => m.shiftId === activeShift.id), 
              transactions: transactions.filter(t => t.shiftId === activeShift.id) 
          }); 
          setShowTicket(true);
      }
      
      if (activeShift || action === 'OPEN') {
          const currentId = activeShift ? activeShift.id : (action === 'OPEN' ? (shifts[0]?.id || Date.now().toString()) : ''); 
          const actualId = action === 'OPEN' ? shifts[0]?.id || Date.now().toString() : currentId;
          
          if(actualId) { 
              const move: CashMovement = { 
                  id: Date.now().toString(), 
                  shiftId: actualId, 
                  type: action, 
                  amount, 
                  description, 
                  timestamp: new Date().toISOString() 
              }; 
              StorageService.saveMovement(move); 
              setMovements([...movements, move]); 
          }
      }
  };

  const handleSaveProduct = () => {
      if (!currentProduct?.name) return;
      let pToSave = { ...currentProduct };
      if (pToSave.hasVariants && pToSave.variants) pToSave.stock = pToSave.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      let updated; 
      if (products.find(p => p.id === pToSave.id)) updated = products.map(p => p.id === pToSave.id ? pToSave : p); 
      else updated = [...products, { ...pToSave, id: Date.now().toString() }];
      setProducts(updated); 
      StorageService.saveProducts(updated); 
      setIsProductModalOpen(false);
  };
  
  const handleProcessPurchase = (purchase: Purchase, updatedProducts: Product[]) => {
      setPurchases([purchase, ...purchases]);
      setProducts(updatedProducts);
      StorageService.savePurchase(purchase);
      StorageService.saveProducts(updatedProducts);
  };
  
  const handleAddSupplier = (supplier: Supplier) => {
      setSuppliers([...suppliers, supplier]);
      StorageService.saveSupplier(supplier);
  };

  const handleUpdateSettings = (newSettings: StoreSettings) => {
      setSettings(newSettings);
      StorageService.saveSettings(newSettings);
  };
  
  const handleGoToPurchase = (productName: string) => {
      setInitialPurchaseSearch(productName);
      setView(ViewState.PURCHASES);
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <Layout currentView={view} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
        {view === ViewState.POS && (
            <POSView 
                products={products} 
                cart={cart} 
                activeShift={activeShift} 
                settings={settings} 
                customers={customers} 
                onAddToCart={handleAddToCart} 
                onUpdateCart={handleUpdateCartQuantity} 
                onRemoveFromCart={handleRemoveFromCart} 
                onUpdateDiscount={handleUpdateDiscount} 
                onCheckout={handleCheckout} 
                onClearCart={() => setCart([])} 
                onOpenCashControl={(action: 'OPEN'|'IN'|'OUT'|'CLOSE') => setShowCashControl(true)} 
            />
        )}

        {view === ViewState.INVENTORY && (
            <InventoryView 
                products={products} 
                settings={settings} 
                transactions={transactions}
                purchases={purchases}
                onNewProduct={() => { 
                    setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [] }); 
                    setIsProductModalOpen(true); 
                }} 
                onEditProduct={(p) => { 
                    setCurrentProduct(p); 
                    setIsProductModalOpen(true); 
                }} 
                onDeleteProduct={(id) => { 
                    if(window.confirm('¿Estás seguro de eliminar este producto?')) { 
                        const up = products.filter(p => p.id !== id); 
                        setProducts(up); 
                        StorageService.saveProducts(up); 
                    } 
                }} 
                onGoToPurchase={handleGoToPurchase}
            />
        )}
        
        {view === ViewState.PURCHASES && (
            <PurchasesView 
                products={products}
                suppliers={suppliers}
                purchases={purchases}
                settings={settings}
                onProcessPurchase={handleProcessPurchase}
                onAddSupplier={handleAddSupplier}
                onRequestNewProduct={(barcode) => {
                    setCurrentProduct({ 
                        id: '', 
                        name: '', 
                        price: 0, 
                        category: CATEGORIES[0], 
                        stock: 0, 
                        variants: [], 
                        barcode: barcode || '' 
                    });
                    setIsProductModalOpen(true);
                }}
                initialSearchTerm={initialPurchaseSearch}
                onClearInitialSearch={() => setInitialPurchaseSearch('')}
            />
        )}

        {view === ViewState.ADMIN && (
            <AdminView 
              transactions={transactions} 
              products={products} 
              shifts={shifts} 
              movements={movements} 
            />
        )}

        {view === ViewState.REPORTS && (
            <ReportsView 
                transactions={transactions}
                settings={settings}
            />
        )}

        {view === ViewState.SETTINGS && (
            <SettingsView 
                settings={settings}
                onSaveSettings={handleUpdateSettings}
            />
        )}

        <CashControlModal 
            isOpen={showCashControl} 
            onClose={() => setShowCashControl(false)} 
            activeShift={activeShift} 
            movements={movements} 
            transactions={transactions} 
            onCashAction={handleCashAction} 
            currency={settings.currency} 
        />
        
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
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold text-lg outline-none transition-all" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct!, name: e.target.value})} placeholder="Ej. Coca Cola 600ml"/>
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Código de Barras</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct!, barcode: e.target.value})} placeholder="Escanear o escribir..." autoFocus={!currentProduct.id}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Precio Venta</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct!, price: parseFloat(e.target.value)})} placeholder="0.00"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stock Actual</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none disabled:opacity-50" value={currentProduct.stock || ''} onChange={e => setCurrentProduct({...currentProduct!, stock: parseFloat(e.target.value)})} placeholder="0" disabled={currentProduct.hasVariants}/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct!, category: e.target.value})}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.hasVariants ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                        {currentProduct.hasVariants && <Plus className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct!, hasVariants: e.target.checked})} /> 
                                    <span className="font-bold text-slate-700">Este producto tiene variantes</span>
                                </label>
                            </div>
                            
                            {currentProduct.hasVariants && (
                                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-4 text-sm">Gestionar Variantes</h4>
                                    <div className="flex gap-2 mb-4">
                                        <input className="flex-[2] p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Ej. Grande" value={variantName} onChange={e => setVariantName(e.target.value)}/>
                                        <input className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Precio" type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)}/>
                                        <input className="w-20 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Cant." type="number" value={variantStock} onChange={e => setVariantStock(e.target.value)}/>
                                        <button onClick={() => { 
                                            if(!currentProduct) return; 
                                            const newVar = { id: Date.now().toString(), name: variantName, price: parseFloat(variantPrice) || 0, stock: parseFloat(variantStock) || 0 }; 
                                            const newVars = [...(currentProduct.variants || []), newVar]; 
                                            setCurrentProduct({ ...currentProduct, variants: newVars, stock: newVars.reduce((s,v)=>s+v.stock,0) }); 
                                            setVariantName(''); setVariantPrice(''); setVariantStock(''); 
                                        }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus className="w-5 h-5"/></button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {currentProduct.variants?.map((v, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                                                <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">
                                                    {v.stock} un. • ${v.price}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveProduct} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">Guardar Producto</button>
                    </div>
                </div>
            </div>
        )}
        
        {showTicket && ticketData && (
            <Ticket 
                type={ticketType} 
                data={ticketData} 
                settings={settings} 
                onClose={() => setShowTicket(false)} 
            />
        )}
    </Layout>
  );
};

export default App;