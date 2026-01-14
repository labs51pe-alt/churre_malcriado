
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ProductVariant } from '../types';
import { CATEGORIES } from '../constants';
import { Cart } from './Cart';
import { Lock, Wallet, LayoutGrid, List, ScanBarcode, Search, Layers, ShoppingBasket, Plus, AlertCircle, X, Tag, Store, ImageIcon } from 'lucide-react';

export const POSView = ({ products, cart, onAddToCart, onUpdateCart, onRemoveFromCart, onUpdateDiscount, onCheckout, onClearCart, settings, customers, activeShift, onOpenCashControl }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [posBarcodeBuffer, setPosBarcodeBuffer] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  // Variant Selection State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Smart Focus: Refocus scanner if user clicks empty space
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('input') || 
                              target.closest('button') || 
                              target.closest('select') || 
                              target.closest('textarea') ||
                              target.closest('#pos-cart');
        
        if (!isInteractive && activeShift && barcodeRef.current) {
            barcodeRef.current.focus();
        }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeShift]);

  // Initial focus
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
              if (product) { 
                  handleProductClick(product);
                  setPosBarcodeBuffer(''); 
              } else { 
                  alert('Producto no encontrado'); 
                  setPosBarcodeBuffer(''); 
              }
          }
      }
  };

  const handleProductClick = (product: Product) => {
      if (product.stock <= 0 && !product.hasVariants) return; 

      if (product.hasVariants) {
          setSelectedProductForVariant(product);
          setIsVariantModalOpen(true);
      } else {
          onAddToCart(product);
      }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
      if (!selectedProductForVariant) return;
      if (variant.stock <= 0) return;
      
      onAddToCart(selectedProductForVariant, variant.id);
      setIsVariantModalOpen(false);
      setSelectedProductForVariant(null);
      
      setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  if (!activeShift) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden bg-slate-50/10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-brand-soft rounded-full blur-[120px] -z-10 opacity-50"></div>
            
            <div className="bg-white/95 backdrop-blur-3xl p-8 lg:p-12 rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl border border-white max-w-sm w-full relative z-10 animate-fade-in-up">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-brand rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-center mx-auto mb-6 lg:mb-8 shadow-2xl shadow-brand-soft rotate-6 transform transition-transform hover:rotate-0">
                    <Lock className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                </div>
                
                <h2 className="text-2xl lg:text-3xl font-black text-slate-800 mb-3 tracking-tight">Caja Cerrada</h2>
                <p className="text-slate-500 font-medium text-xs lg:text-sm mb-8 lg:mb-10 leading-relaxed px-2">
                    Inicia un nuevo turno para comenzar a registrar ventas hoy.
                </p>
                
                <button 
                    onClick={() => onOpenCashControl('OPEN')} 
                    className="w-full py-4 lg:py-5 bg-brand text-white rounded-[1.2rem] lg:rounded-[1.5rem] font-black text-base lg:text-lg shadow-xl shadow-brand-soft hover:opacity-90 transition-all flex items-center justify-center gap-3 group"
                >
                    <Wallet className="w-5 h-5 lg:w-6 lg:h-6 group-hover:rotate-12 transition-transform"/>
                    <span>Abrir Turno</span>
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content: Products area */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden relative">
            <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]"></div>
                        <h2 className="text-[10px] lg:text-xs font-black text-emerald-600 tracking-[0.1em] uppercase">SISTEMA EN LÍNEA</h2>
                    </div>
                    <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold mt-1 ml-4 lg:ml-5 tracking-widest uppercase">Punto de Venta Activo</p>
                </div>
                <button onClick={() => onOpenCashControl('IN')} className="px-3 py-2 lg:px-5 lg:py-3 bg-white border border-slate-200 text-slate-700 rounded-xl lg:rounded-2xl font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all text-xs lg:text-sm">
                    <Store className="w-4 h-4 text-brand"/> Gestión de Caja
                </button>
            </div>

            <div className="flex gap-3 lg:gap-4 mb-4">
                <div className="flex gap-1 bg-white p-1 rounded-xl lg:rounded-2xl border border-slate-200 h-[56px] lg:h-[64px] items-center shrink-0 shadow-sm">
                    <button onClick={() => setViewMode('GRID')} className={`h-full aspect-square flex items-center justify-center rounded-lg lg:rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-brand text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5 lg:w-6 lg:h-6"/></button>
                    <button onClick={() => setViewMode('LIST')} className={`h-full aspect-square flex items-center justify-center rounded-lg lg:rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-brand text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-5 h-5 lg:w-6 lg:h-6"/></button>
                </div>
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 lg:pl-7 flex items-center pointer-events-none">
                        <ScanBarcode className="w-5 h-5 lg:w-6 lg:h-6 text-brand group-focus-within:opacity-100 opacity-50 transition-opacity" />
                    </div>
                    <input 
                        ref={barcodeRef} 
                        type="text" 
                        placeholder="Escanear producto..." 
                        className="w-full h-[56px] lg:h-[64px] pl-12 lg:pl-16 pr-4 bg-white border-2 border-slate-100 rounded-xl lg:rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand-soft outline-none font-bold text-base lg:text-lg text-slate-800 transition-all placeholder-slate-300 shadow-sm" 
                        value={posBarcodeBuffer} 
                        onChange={(e) => setPosBarcodeBuffer(e.target.value)} 
                        onKeyDown={handlePosScanner} 
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 lg:mb-6 items-start md:items-center">
                <div className="w-full md:w-64 lg:w-72 relative shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 lg:w-5 lg:h-5"/>
                    <input 
                        type="text" 
                        placeholder="Buscar nombre..." 
                        className="w-full pl-11 lg:pl-12 pr-4 py-2.5 lg:py-3.5 bg-white border border-slate-200 rounded-xl lg:rounded-2xl shadow-sm focus:ring-4 focus:ring-brand-soft outline-none transition-all font-bold text-xs lg:text-sm text-slate-700" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar whitespace-nowrap scroll-smooth" id="pos-categories">
                    <button onClick={() => setSelectedCategory('Todos')} className={`px-4 lg:px-6 py-2.5 lg:py-3.5 rounded-xl lg:rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-wider transition-all shadow-sm shrink-0 ${selectedCategory === 'Todos' ? 'bg-slate-900 text-white scale-105' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}>Todos</button>
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 lg:px-6 py-2.5 lg:py-3.5 rounded-xl lg:rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-wider transition-all shadow-sm shrink-0 ${selectedCategory === cat ? 'bg-slate-900 text-white scale-105' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}>{cat}</button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar" id="pos-products-grid">
                {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-5 pb-10">
                        {filteredProducts.map((p: Product, idx: number) => {
                            const isOutOfStock = p.stock <= 0 && !p.hasVariants;
                            const isLowStock = p.stock <= 5 && !isOutOfStock;
                            
                            return (
                                <div 
                                    key={p.id} 
                                    onClick={() => handleProductClick(p)} 
                                    className={`
                                        bg-white p-3 lg:p-4 rounded-[1.8rem] lg:rounded-[2.5rem] shadow-sm border border-slate-100 
                                        relative flex flex-col justify-between h-56 lg:h-64 animate-fade-in-up
                                        transition-all duration-300
                                        ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed bg-slate-50' : 'cursor-pointer group hover:shadow-2xl hover:shadow-brand-soft hover:-translate-y-2'}
                                    `}
                                    style={{animationDelay: `${idx * 20}ms`}}
                                >
                                    <div className="flex justify-end absolute top-2 right-2 lg:top-3 lg:right-3 z-10">
                                        {isOutOfStock ? (
                                            <div className="bg-slate-200 px-2 py-0.5 lg:px-3 lg:py-1 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                <X className="w-2.5 h-2.5 lg:w-3 lg:h-3"/> Agotado
                                            </div>
                                        ) : (
                                            <div className={`
                                                px-2.5 py-1 lg:px-3.5 lg:py-1.5 rounded-[0.8rem] lg:rounded-[1rem] text-[10px] lg:text-[12px] font-black shadow-xl flex items-center gap-1 transition-transform group-hover:scale-110
                                                ${isLowStock 
                                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200' 
                                                    : 'bg-brand text-white shadow-brand-soft'}
                                            `}>
                                                {p.stock} <span className="text-[7px] lg:text-[8px] opacity-70 uppercase font-black">uds</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-24 lg:h-28 w-full bg-slate-50 rounded-[1.4rem] lg:rounded-[1.8rem] mb-2 lg:mb-3 overflow-hidden flex items-center justify-center relative shadow-inner">
                                        {p.image ? (
                                            <img 
                                                src={p.image} 
                                                alt={p.name} 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={(e) => { (e.target as any).src = ''; (e.target as any).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="text-slate-100 font-black text-4xl lg:text-6xl select-none transition-all duration-500 group-hover:scale-125 group-hover:text-brand-soft uppercase">
                                                {p.name.charAt(0)}
                                            </div>
                                        )}
                                        {p.hasVariants && <Layers className="absolute top-2 left-2 w-5 h-5 lg:w-6 lg:h-6 text-brand bg-white rounded-lg lg:rounded-xl p-1 lg:p-1.5 shadow-sm"/>}
                                    </div>

                                    <div className="px-1 flex-1 flex flex-col justify-between">
                                        <div>
                                            <p className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-0.5">{p.category}</p>
                                            <h3 className="font-bold text-slate-800 leading-tight mb-1 lg:mb-2 line-clamp-2 text-[12px] lg:text-[14px] uppercase" title={p.name}>{p.name}</h3>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-1">
                                            <span className="text-base lg:text-lg font-black text-slate-900 tracking-tight">{settings.currency}{p.price.toFixed(2)}</span>
                                            {!isOutOfStock && (
                                                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all shadow-sm group-active:scale-90">
                                                    <Plus className="w-4 h-4 lg:w-5 lg:h-5"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl lg:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50/50 text-[10px] lg:text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
                                <tr>
                                    <th className="p-4 lg:p-6 pl-6 lg:pl-10">Producto</th>
                                    <th className="p-4 lg:p-6">Stock</th>
                                    <th className="p-4 lg:p-6 text-right">Precio</th>
                                    <th className="p-4 lg:p-6 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProducts.map((p: Product) => {
                                    const isOutOfStock = p.stock <= 0 && !p.hasVariants;
                                    const isLowStock = p.stock <= 5 && !isOutOfStock;

                                    return (
                                        <tr 
                                            key={p.id} 
                                            className={`transition-colors ${isOutOfStock ? 'opacity-50 grayscale bg-slate-50' : 'hover:bg-brand-soft cursor-pointer'}`} 
                                            onClick={() => !isOutOfStock && handleProductClick(p)}
                                        >
                                            <td className="p-4 lg:p-6 pl-6 lg:pl-10">
                                                <div className="flex items-center gap-3 lg:gap-4">
                                                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100">
                                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 lg:w-5 lg:h-5 text-slate-200" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-800 text-[13px] lg:text-[15px] uppercase">{p.name}</div>
                                                        <div className="text-[8px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                                            {p.hasVariants && <Layers className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-brand"/>}
                                                            {p.category}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 lg:p-6">
                                                {isOutOfStock ? (
                                                     <span className="text-[8px] lg:text-[10px] px-2 py-1 rounded-lg font-black bg-slate-200 text-slate-500 uppercase tracking-widest">Agotado</span>
                                                ) : (
                                                    <span className={`text-[10px] lg:text-[12px] px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg lg:rounded-xl font-black shadow-md ${isLowStock ? 'bg-red-500 text-white' : 'bg-brand text-white'}`}>
                                                        {p.stock}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 lg:p-6 text-right font-black text-slate-900 text-base lg:text-lg">{settings.currency}{p.price.toFixed(2)}</td>
                                            <td className="p-4 lg:p-6 text-right pr-6 lg:pr-10">
                                                {!isOutOfStock && (
                                                    <button className="p-2 lg:p-3 bg-white border border-slate-200 shadow-sm text-brand rounded-xl lg:rounded-2xl hover:bg-brand hover:text-white hover:border-brand transition-all active:scale-90">
                                                        <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* VARIANT SELECTOR MODAL */}
            {isVariantModalOpen && selectedProductForVariant && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] lg:rounded-[3rem] shadow-2xl w-full max-w-sm lg:max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-lg lg:text-xl text-slate-800">Variante</h3>
                                <p className="text-[10px] lg:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 truncate max-w-[200px]">{selectedProductForVariant.name}</p>
                            </div>
                            <button onClick={() => setIsVariantModalOpen(false)} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"><X className="w-5 h-5 lg:w-6 lg:h-6"/></button>
                        </div>
                        <div className="p-6 lg:p-8 grid grid-cols-1 gap-3 lg:gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {selectedProductForVariant.variants?.map((variant) => (
                                <button
                                    key={variant.id}
                                    onClick={() => handleVariantSelect(variant)}
                                    disabled={variant.stock <= 0}
                                    className={`
                                        p-4 lg:p-6 rounded-xl lg:rounded-[1.5rem] border-2 text-left transition-all flex justify-between items-center
                                        ${variant.stock <= 0 
                                            ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                                            : 'bg-white border-slate-100 hover:border-brand hover:ring-4 lg:hover:ring-8 hover:ring-brand-soft shadow-sm'}
                                    `}
                                >
                                    <div>
                                        <p className="font-black text-slate-800 text-base lg:text-lg uppercase">{variant.name}</p>
                                        <p className="font-black text-brand text-lg lg:text-xl mt-0.5 lg:mt-1">{settings.currency}{variant.price.toFixed(2)}</p>
                                    </div>
                                    <div className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[9px] lg:text-[11px] font-black uppercase tracking-widest ${variant.stock <= 0 ? 'bg-slate-200 text-slate-500' : 'bg-emerald-500 text-white shadow-lg'}`}>
                                        {variant.stock > 0 ? `${variant.stock}` : 'Agotado'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Sidebar Cart Area: Responsive width for tablets */}
        <div className="w-full lg:w-[350px] xl:w-[440px] bg-white shadow-2xl z-20 flex flex-col border-l border-slate-100 shrink-0" id="pos-cart">
            <Cart items={cart} onUpdateQuantity={onUpdateCart} onRemoveItem={onRemoveFromCart} onUpdateDiscount={onUpdateDiscount} onCheckout={onCheckout} onClearCart={onClearCart} settings={settings} customers={customers} />
        </div>
    </div>
  );
};
