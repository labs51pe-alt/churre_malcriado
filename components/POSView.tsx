
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ProductVariant } from '../types';
import { CATEGORIES } from '../constants';
import { Cart } from './Cart';
import { Lock, Wallet, LayoutGrid, List, ScanBarcode, Search, Layers, ShoppingBasket, Plus, X, Store, ImageIcon } from 'lucide-react';

export const POSView = ({ products, cart, onAddToCart, onUpdateCart, onRemoveItem, onUpdateDiscount, onCheckout, onClearCart, settings, customers, activeShift, onOpenCashControl }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [posBarcodeBuffer, setPosBarcodeBuffer] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('input') || target.closest('button') || target.closest('select') || target.closest('textarea') || target.closest('#pos-cart');
        if (!isInteractive && activeShift && barcodeRef.current) barcodeRef.current.focus();
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeShift]);

  useEffect(() => { if (activeShift && barcodeRef.current) barcodeRef.current.focus(); }, [activeShift]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handlePosScanner = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          const scannedCode = posBarcodeBuffer.trim();
          if (scannedCode) {
              const product = products.find((p: Product) => p.barcode && p.barcode.toLowerCase() === scannedCode.toLowerCase());
              if (product) { handleProductClick(product); setPosBarcodeBuffer(''); } 
              else { alert('Producto no encontrado'); setPosBarcodeBuffer(''); }
          }
      }
  };

  const handleProductClick = (product: Product) => {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const hasVariants = variants.length > 0;
      if (product.stock <= 0 && !hasVariants) return; 
      if (hasVariants) {
          setSelectedProductForVariant(product);
          setIsVariantModalOpen(true);
      } else {
          onAddToCart(product);
      }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
      if (!selectedProductForVariant) return;
      onAddToCart(selectedProductForVariant, variant.id);
      setIsVariantModalOpen(false);
      setSelectedProductForVariant(null);
      setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  if (!activeShift) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-slate-50/10">
            <div className="bg-white p-10 lg:p-12 rounded-3xl shadow-2xl border border-slate-100 max-w-sm lg:max-w-md w-full animate-fade-in-up text-center">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-brand-soft rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <Lock className="w-10 h-10 text-brand" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Caja Cerrada</h2>
                <p className="text-slate-500 font-semibold text-[11px] mb-10 leading-relaxed px-6 uppercase tracking-widest opacity-60">
                    Inicia un turno para vender
                </p>
                <button 
                    onClick={() => onOpenCashControl('OPEN')} 
                    className="w-full py-5 bg-brand text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand/20 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                >
                    <Wallet className="w-6 h-6"/> Abrir Turno
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-slate-50/30">
        <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-hidden">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
                <div>
                    <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <ShoppingBasket className="w-7 h-7 text-brand" />
                        POS Venta
                    </h2>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Terminal activa
                    </p>
                </div>
                <button onClick={() => onOpenCashControl('IN')} className="px-5 py-3 lg:px-6 lg:py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center gap-3 shadow-sm hover:shadow-md transition-all text-xs uppercase tracking-widest">
                    <Store className="w-5 h-5 text-brand"/> Ver Caja
                </button>
            </div>

            <div className="flex gap-3 mb-6 lg:mb-8">
                <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 h-14 lg:h-16 items-center shrink-0 shadow-sm">
                    <button onClick={() => setViewMode('GRID')} className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-brand text-white shadow-md' : 'text-slate-300 hover:text-slate-500'}`}><LayoutGrid className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('LIST')} className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-brand text-white shadow-md' : 'text-slate-300 hover:text-slate-500'}`}><List className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 relative group">
                    <ScanBarcode className="absolute left-5 top-1/2 -translate-y-1/2 text-brand w-6 h-6 opacity-40 group-focus-within:opacity-100 transition-opacity" />
                    <input 
                        ref={barcodeRef} 
                        type="text" 
                        placeholder="Escanear o buscar..." 
                        className="w-full h-14 lg:h-16 pl-14 pr-6 bg-white border border-slate-200 rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand-soft outline-none font-bold text-lg text-slate-800 transition-all placeholder-slate-300 shadow-sm" 
                        value={posBarcodeBuffer} 
                        onChange={(e) => setPosBarcodeBuffer(e.target.value)} 
                        onKeyDown={handlePosScanner} 
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 lg:mb-8">
                <div className="w-full md:w-80 relative shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4"/>
                    <input 
                        type="text" 
                        placeholder="Buscar producto..." 
                        className="w-full pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:border-brand outline-none transition-all font-semibold text-sm text-slate-700" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full flex gap-2 overflow-x-auto pb-2 custom-scrollbar whitespace-nowrap scroll-smooth">
                    <button onClick={() => setSelectedCategory('Todos')} className={`px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${selectedCategory === 'Todos' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>Todos</button>
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${selectedCategory === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{cat}</button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-10">
                {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                        {filteredProducts.map((p: Product, idx: number) => {
                            const variants = Array.isArray(p.variants) ? p.variants : [];
                            const hasVariants = variants.length > 0;
                            const isOutOfStock = p.stock <= 0 && !hasVariants;
                            
                            return (
                                <div 
                                    key={p.id} 
                                    onClick={() => handleProductClick(p)} 
                                    className={`
                                        bg-white p-4 rounded-3xl shadow-sm border border-slate-100 
                                        relative flex flex-col justify-between h-64 lg:h-72 animate-fade-in-up
                                        transition-all duration-300 group
                                        ${isOutOfStock ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:shadow-xl hover:shadow-brand-soft hover:-translate-y-1 active:scale-95 hover:border-brand'}
                                    `}
                                    style={{animationDelay: `${idx * 10}ms`}}
                                >
                                    <div className="flex justify-end absolute top-3 right-3 z-10">
                                        {!isOutOfStock && (
                                            <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-soft text-brand border border-brand/10">
                                                {p.stock} <span className="opacity-60">UDS</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-32 lg:h-36 w-full bg-slate-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center relative border border-slate-100/50">
                                        {p.image ? (
                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="text-slate-200 font-extrabold text-5xl group-hover:text-brand/20 transition-colors uppercase">{p.name.charAt(0)}</div>
                                        )}
                                        {hasVariants && (
                                            <div className="absolute bottom-2 right-2 bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                                                <Layers className="w-4 h-4 text-brand"/>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-brand transition-colors">{p.category}</p>
                                            <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 text-xs lg:text-sm uppercase tracking-tight" title={p.name}>{p.name}</h3>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className="text-lg font-extrabold text-slate-900 tracking-tight">{settings.currency}{p.price.toFixed(2)}</span>
                                            {!isOutOfStock && (
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all shadow-sm">
                                                    <Plus className="w-5 h-5"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-5 pl-8">Producto</th>
                                    <th className="p-5">Stock</th>
                                    <th className="p-5 text-right">Precio</th>
                                    <th className="p-5 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProducts.map((p: Product) => {
                                    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
                                    const isOutOfStock = p.stock <= 0 && !hasVariants;
                                    return (
                                        <tr key={p.id} className={`hover:bg-brand-soft/20 transition-colors cursor-pointer group ${isOutOfStock ? 'opacity-40 grayscale' : ''}`} onClick={() => !isOutOfStock && handleProductClick(p)}>
                                            <td className="p-5 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100 shrink-0">
                                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-200" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm uppercase tracking-tight">{p.name}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-2 mt-1">
                                                            {hasVariants && <Layers className="w-3 h-3 text-brand"/>}
                                                            {p.category}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${isOutOfStock ? 'bg-slate-100 text-slate-400' : 'bg-brand/10 text-brand'}`}>
                                                    {p.stock} UDS
                                                </span>
                                            </td>
                                            <td className="p-5 text-right font-extrabold text-slate-900 text-lg">{settings.currency}{p.price.toFixed(2)}</td>
                                            <td className="p-5 text-right pr-8">
                                                {!isOutOfStock && <button className="p-3 bg-white border border-slate-200 text-brand rounded-xl hover:bg-brand hover:text-white transition-all"><Plus className="w-5 h-5" /></button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        <div className="w-full lg:w-[400px] xl:w-[480px] bg-white shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.05)] z-20 flex flex-col border-l border-slate-100 shrink-0" id="pos-cart">
            <Cart items={cart} onUpdateQuantity={onUpdateCart} onRemoveItem={onRemoveItem} onUpdateDiscount={onUpdateDiscount} onCheckout={onCheckout} onClearCart={onClearCart} settings={settings} customers={customers} />
        </div>

        {isVariantModalOpen && selectedProductForVariant && (
            <div className="fixed inset-0 z-[120] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-white">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-extrabold text-2xl text-slate-800 uppercase tracking-tight">Opciones</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{selectedProductForVariant.name}</p>
                        </div>
                        <button onClick={() => setIsVariantModalOpen(false)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand transition-all"><X className="w-6 h-6"/></button>
                    </div>
                    <div className="p-8 grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {selectedProductForVariant.variants?.map((variant) => (
                            <button
                                key={variant.id}
                                onClick={() => handleVariantSelect(variant)}
                                className="p-6 rounded-2xl border-2 border-slate-50 text-left transition-all flex items-center justify-between hover:border-brand hover:bg-brand-soft bg-white shadow-sm hover:shadow-md active:scale-[0.98] group"
                            >
                                <div>
                                    <p className="font-bold text-slate-800 text-lg uppercase group-hover:text-brand transition-colors">{variant.name}</p>
                                    <p className="font-extrabold text-slate-900 text-2xl tracking-tighter mt-1">{settings.currency}{variant.price.toFixed(2)}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    <Plus className="w-6 h-6"/>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
