
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Supplier, Purchase, PurchaseItem, StoreSettings } from '../types';
import { Search, Plus, ScanBarcode, Save, Trash2, History, User, FileText, Package, Truck, Calendar, ChevronRight, Hash, DollarSign, Archive, Barcode, Check, X, Building2, ShoppingCart } from 'lucide-react';

interface PurchasesViewProps {
    products: Product[];
    suppliers: Supplier[];
    purchases: Purchase[];
    onProcessPurchase: (purchase: Purchase, updatedProducts: Product[]) => void;
    onAddSupplier: (supplier: Supplier) => void;
    onRequestNewProduct: (barcode?: string) => void;
    settings: StoreSettings;
    initialSearchTerm?: string;
    onClearInitialSearch?: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ 
    products, 
    suppliers, 
    purchases, 
    onProcessPurchase, 
    onAddSupplier, 
    onRequestNewProduct,
    settings,
    initialSearchTerm,
    onClearInitialSearch
}) => {
    const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY' | 'SUPPLIERS'>('NEW');
    
    // New Purchase State
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    
    // Supplier Modal
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierContact, setNewSupplierContact] = useState('');

    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Handle Initial Search from Inventory Redirect
    useEffect(() => {
        if (initialSearchTerm) {
            setProductSearch(initialSearchTerm);
            setActiveTab('NEW');
            if (onClearInitialSearch) onClearInitialSearch();
        }
    }, [initialSearchTerm, onClearInitialSearch]);

    // Filter products for search
    const searchResults = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            (p.barcode && p.barcode.includes(productSearch))
        ).slice(0, 5);
    }, [products, productSearch]);

    // Focus barcode input on tab switch
    useEffect(() => {
        if (activeTab === 'NEW' && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [activeTab]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const exists = prev.find(item => item.product.id === product.id);
            if (exists) {
                return prev.map(item => item.product.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
                );
            }
            return [...prev, { product, quantity: 1, cost: product.price * 0.7 }]; // Default cost estimation
        });
        setProductSearch('');
        setBarcodeBuffer('');
    };

    const handleBarcodeScanner = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const code = barcodeBuffer.trim();
            if (code) {
                const product = products.find(p => p.barcode === code);
                if (product) {
                    addToCart(product);
                } else {
                    if (window.confirm(`El producto con código ${code} no existe. ¿Deseas crearlo?`)) {
                        onRequestNewProduct(code);
                    }
                }
                setBarcodeBuffer('');
            }
        }
    };

    const updateCartItem = (index: number, field: 'quantity' | 'cost', value: number) => {
        setCart(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const removeCartItem = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveSupplier = () => {
        if (!newSupplierName) return;
        const newSup: Supplier = {
            id: Date.now().toString(),
            name: newSupplierName,
            contact: newSupplierContact
        };
        onAddSupplier(newSup);
        setSelectedSupplierId(newSup.id);
        setIsSupplierModalOpen(false);
        setNewSupplierName('');
        setNewSupplierContact('');
    };

    const handleProcess = () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        if (!selectedSupplierId) return alert('Selecciona un proveedor');

        const total = cart.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
        
        const purchaseItems: PurchaseItem[] = cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            cost: item.cost
        }));

        const purchase: Purchase = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            supplierId: selectedSupplierId,
            total,
            items: purchaseItems
        };

        // Prepare updated products with new stock
        const updatedProducts = products.map(p => {
            const cartItem = cart.find(c => c.product.id === p.id);
            if (cartItem) {
                return { ...p, stock: p.stock + cartItem.quantity };
            }
            return p;
        });

        onProcessPurchase(purchase, updatedProducts);
        setCart([]);
        setInvoiceNumber('');
        setBarcodeBuffer('');
        alert('Compra procesada exitosamente');
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc]">
            {/* Main Header */}
            <div className="px-8 pt-8 pb-6 flex justify-between items-center bg-white/50 backdrop-blur-sm border-b border-indigo-50 sticky top-0 z-20">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-indigo-600"/>
                        Gestión de Compras
                    </h1>
                    <p className="text-slate-500 font-medium ml-11">Recepción de mercancía e historial</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                    <button onClick={() => setActiveTab('NEW')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'NEW' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Plus className="w-4 h-4"/> Nueva Compra
                    </button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <History className="w-4 h-4"/> Historial
                    </button>
                    <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'SUPPLIERS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Truck className="w-4 h-4"/> Proveedores
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-8">
                
                {/* === TAB: NEW RECEPTION === */}
                {activeTab === 'NEW' && (
                    <div className="h-full flex flex-col gap-6 animate-fade-in-up">
                        
                        {/* 1. Context Header Bar (Supplier & Invoice) */}
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center gap-4">
                            <div className="flex-1 w-full flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                                <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><Building2 className="w-5 h-5"/></div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Proveedor</label>
                                    <select 
                                        className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    >
                                        <option value="">Seleccionar Proveedor...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => setIsSupplierModalOpen(true)} className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors" title="Crear Nuevo Proveedor"><Plus className="w-4 h-4"/></button>
                            </div>

                            <div className="flex-1 w-full flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                                <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm"><FileText className="w-5 h-5"/></div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">N° Factura / Remisión</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm placeholder-slate-300"
                                        placeholder="F001-0000"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="hidden lg:block w-px h-10 bg-slate-200 mx-2"></div>
                            
                            <div className="flex items-center gap-4 px-4">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase text-right">Fecha de Emisión</p>
                                    <p className="font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Workspace Split (Input & List) */}
                        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                            
                            {/* Left: Input Card */}
                            <div className="lg:w-1/3 flex flex-col gap-6">
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden flex-1 flex flex-col">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-900/30 rounded-full blur-2xl -ml-10 -mb-10"></div>
                                    
                                    <h3 className="relative z-10 text-xl font-black mb-6 flex items-center gap-2"><ScanBarcode className="w-6 h-6"/> Ingreso de Productos</h3>

                                    <div className="relative z-10 space-y-5">
                                        {/* Scanner */}
                                        <div>
                                            <label className="text-indigo-200 text-xs font-bold uppercase mb-2 block">Código de Barras</label>
                                            <div className="relative group">
                                                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-white transition-colors"/>
                                                <input 
                                                    ref={barcodeInputRef}
                                                    type="text" 
                                                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-white placeholder-white/30 outline-none focus:bg-white/20 focus:border-white transition-all shadow-inner"
                                                    placeholder="Escanear..."
                                                    value={barcodeBuffer}
                                                    onChange={(e) => setBarcodeBuffer(e.target.value)}
                                                    onKeyDown={handleBarcodeScanner}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Manual Search */}
                                        <div>
                                             <label className="text-indigo-200 text-xs font-bold uppercase mb-2 block">O buscar manualmente</label>
                                             <div className="relative group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-white transition-colors"/>
                                                <input 
                                                    type="text" 
                                                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-white placeholder-white/30 outline-none focus:bg-white/20 focus:border-white transition-all shadow-inner text-sm"
                                                    placeholder="Escribir nombre..."
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                />
                                                 {/* Autocomplete Dropdown */}
                                                {searchResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl overflow-hidden z-30 animate-fade-in text-slate-800">
                                                        <div className="bg-slate-50 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultados</div>
                                                        {searchResults.map(p => (
                                                            <button 
                                                                key={p.id} 
                                                                onClick={() => addToCart(p)}
                                                                className="w-full text-left p-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                                                    <p className="text-xs text-slate-400">{p.barcode || 'Sin código'}</p>
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                                    <Plus className="w-4 h-4"/>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                             </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6 text-center relative z-10">
                                        <p className="text-indigo-200 text-xs leading-relaxed">
                                            Tip: Si el código de barras no existe, el sistema te preguntará si deseas crear el producto.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Cart List */}
                            <div className="lg:w-2/3 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400"><Package className="w-5 h-5"/></div>
                                        <h3 className="font-bold text-slate-800">Ítems Recibidos</h3>
                                    </div>
                                    <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black tracking-wide">{cart.length} LÍNEAS</span>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Truck className="w-10 h-10 text-slate-200"/>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-lg text-slate-400">Lista vacía</p>
                                                <p className="text-sm">Escanea productos para agregarlos aquí.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-4 pl-6">Descripción</th>
                                                    <th className="p-4 text-center w-32">Cant.</th>
                                                    <th className="p-4 text-right w-32">Costo</th>
                                                    <th className="p-4 text-right w-32">Subtotal</th>
                                                    <th className="p-4 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {cart.map((item, idx) => (
                                                    <tr key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                                                        <td className="p-4 pl-6">
                                                            <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                                                            <p className="text-xs text-slate-400 font-mono">{item.product.barcode}</p>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <input 
                                                                type="number" 
                                                                min="1"
                                                                className="w-20 text-center bg-white border border-slate-200 rounded-lg py-2 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                                                value={item.quantity}
                                                                onChange={(e) => updateCartItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                className="w-24 text-right bg-white border border-slate-200 rounded-lg py-2 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                                                value={item.cost}
                                                                onChange={(e) => updateCartItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td className="p-4 text-right font-black text-slate-800">
                                                            {settings.currency}{(item.quantity * item.cost).toFixed(2)}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => removeCartItem(idx)} className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
                                     <div className="flex gap-8">
                                         <div>
                                             <p className="text-[10px] font-bold text-slate-400 uppercase">Unidades</p>
                                             <p className="text-2xl font-bold text-slate-700">{cart.reduce((s, i) => s + i.quantity, 0)}</p>
                                         </div>
                                         <div>
                                             <p className="text-[10px] font-bold text-slate-400 uppercase">Total Compra</p>
                                             <p className="text-3xl font-black text-indigo-600">{settings.currency}{totalAmount.toFixed(2)}</p>
                                         </div>
                                     </div>
                                     <button 
                                        onClick={handleProcess}
                                        disabled={cart.length === 0}
                                        className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 transform active:scale-95"
                                     >
                                         <Check className="w-6 h-6"/> Procesar Stock
                                     </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === TAB: HISTORY === */}
                {activeTab === 'HISTORY' && (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg">Historial de Compras</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase sticky top-0">
                                    <tr>
                                        <th className="p-6">Fecha</th>
                                        <th className="p-6">Proveedor</th>
                                        <th className="p-6">Total</th>
                                        <th className="p-6 text-right">Ítems</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {purchases.length === 0 ? (
                                        <tr><td colSpan={4} className="p-12 text-center text-slate-400">No hay compras registradas</td></tr>
                                    ) : purchases.map(purchase => {
                                        const supplier = suppliers.find(s => s.id === purchase.supplierId);
                                        return (
                                            <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar className="w-4 h-4"/></div>
                                                        <div>
                                                            <p className="font-bold text-slate-700">{new Date(purchase.date).toLocaleDateString()}</p>
                                                            <p className="text-xs text-slate-400">{new Date(purchase.date).toLocaleTimeString()}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 font-medium text-slate-600">
                                                    {supplier ? supplier.name : 'Proveedor Desconocido'}
                                                </td>
                                                <td className="p-6 font-black text-slate-800">
                                                    {settings.currency}{purchase.total.toFixed(2)}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                                                        {purchase.items.length} productos
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                 {/* === TAB: SUPPLIERS === */}
                 {activeTab === 'SUPPLIERS' && (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col animate-fade-in-up">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg">Directorio de Proveedores</h3>
                            <button onClick={() => setIsSupplierModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4"/> Nuevo Proveedor</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                            {suppliers.map(s => (
                                <div key={s.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <Building2 className="w-7 h-7"/>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-lg text-slate-800 mb-2">{s.name}</h4>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">
                                        <User className="w-4 h-4 text-slate-400"/>
                                        <span className="font-medium truncate">{s.contact || 'Sin contacto'}</span>
                                    </div>
                                </div>
                            ))}
                            {suppliers.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-400">
                                    <Truck className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                                    <p>No hay proveedores registrados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* NEW SUPPLIER MODAL */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Plus className="w-6 h-6 text-indigo-500"/> Nuevo Proveedor</h3>
                        <div className="space-y-5 mb-8">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nombre Empresa</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                                    placeholder="Ej. Distribuidora Central"
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Contacto</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                                    placeholder="Nombre o Teléfono"
                                    value={newSupplierContact}
                                    onChange={(e) => setNewSupplierContact(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
                            <button onClick={handleSaveSupplier} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
