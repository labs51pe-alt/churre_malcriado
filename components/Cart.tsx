import React, { useState, useEffect } from 'react';
import { CartItem, StoreSettings, Customer, PaymentMethod, PaymentDetail } from '../types';
import { Trash2, CreditCard, Banknote, Minus, Plus, ShoppingBag, X, Zap, Smartphone, Check, Wand2, ShieldCheck } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onUpdateDiscount: (id: string, discount: number, variantId?: string) => void;
  onCheckout: (method: string, payments: PaymentDetail[]) => void;
  onClearCart: () => void;
  settings: StoreSettings;
  customers: Customer[];
}

export const Cart: React.FC<CartProps> = ({ items, onUpdateQuantity, onRemoveItem, onCheckout, onClearCart, settings }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Payment States
  const [payAmounts, setPayAmounts] = useState<{ [key in PaymentMethod]?: string }>({
      cash: '',
      yape: '',
      plin: '',
      card: ''
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
  const total = Math.max(0, subtotal - totalDiscount);
  const tax = settings.pricesIncludeTax ? (total - (total / (1 + settings.taxRate))) : (total * settings.taxRate);
  
  // Reset modal state when opening
  useEffect(() => {
      if(paymentModalOpen) {
          setPayAmounts({ cash: '', yape: '', plin: '', card: '' });
      }
  }, [paymentModalOpen]);

  // Calculations
  const totalPaid = Object.values(payAmounts).reduce<number>((acc, val) => acc + (parseFloat((val as string) || '0') || 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const handleAmountChange = (method: PaymentMethod, value: string) => {
      setPayAmounts(prev => ({ ...prev, [method]: value }));
  };

  const fillRemaining = (method: PaymentMethod) => {
      const currentVal = parseFloat(payAmounts[method] || '0');
      const newVal = (currentVal + remaining).toFixed(2);
      setPayAmounts(prev => ({ ...prev, [method]: newVal }));
  };

  const confirmPayment = () => {
      if (totalPaid < total - 0.01) {
          alert('Falta cubrir el monto total');
          return;
      }

      const payments: PaymentDetail[] = [];
      let mainMethod = 'mixed';
      
      (Object.keys(payAmounts) as PaymentMethod[]).forEach(method => {
          const rawAmount = parseFloat(payAmounts[method] || '0');
          if (rawAmount > 0) {
              let finalAmount = rawAmount;
              if (method === 'cash' && change > 0) {
                  finalAmount = rawAmount - change;
              }
              if (finalAmount > 0) {
                  payments.push({ method, amount: finalAmount });
              }
          }
      });

      if (payments.length === 1) mainMethod = payments[0].method;

      onCheckout(mainMethod, payments);
      setPaymentModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-100 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
        <div>
            <h2 className="font-black text-xl text-slate-800 flex items-center gap-2 tracking-tight">
                <ShoppingBag className="w-5 h-5 text-indigo-600"/> 
                Canasta
            </h2>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">{items.length} Productos</p>
        </div>
        {items.length > 0 && (
            <button onClick={onClearCart} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-2xl transition-all" title="Vaciar Carrito"><Trash2 className="w-5 h-5"/></button>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/30">
        {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-200">
                    <ShoppingBag className="w-10 h-10"/>
                </div>
                <p className="font-bold text-sm">Esperando productos...</p>
            </div>
        ) : items.map((item, idx) => (
            <div key={`${item.id}-${item.selectedVariantId || 'base'}-${idx}`} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:border-indigo-200 transition-all group animate-fade-in-up">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-4">
                        <h4 className="font-bold text-slate-800 leading-snug">{item.name}</h4>
                        {item.selectedVariantName && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block mt-2 tracking-wider">{item.selectedVariantName}</span>}
                    </div>
                    <span className="font-black text-slate-900 text-lg">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1, item.selectedVariantId) : onRemoveItem(item.id, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-500 hover:text-red-500 hover:shadow-md transition-all active:scale-90"><Minus className="w-4 h-4"/></button>
                        <span className="font-black text-base w-6 text-center text-slate-800">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded-xl shadow-sm text-white hover:bg-black hover:shadow-md transition-all active:scale-90"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        P.U: {settings.currency}{item.price.toFixed(2)}
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Footer Totals */}
      <div className="p-8 bg-white border-t border-slate-100">
        <div className="space-y-3 mb-8">
            <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-600">{settings.currency}{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
                <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <span>IGV (18%)</span>
                    <span>{settings.currency}{tax.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between text-slate-900 text-4xl font-black pt-5 border-t border-slate-100 tracking-tighter">
                <span>Total</span>
                <span className="text-indigo-600">{settings.currency}{total.toFixed(2)}</span>
            </div>
        </div>

        <button 
            onClick={() => setPaymentModalOpen(true)}
            disabled={items.length === 0}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[2rem] font-black shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-xl tracking-tight uppercase"
        >
            <Banknote className="w-7 h-7"/>
            PAGAR AHORA
        </button>
      </div>

      {/* PAYMENT MODAL */}
      {paymentModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-600"></div>
                  
                  <div className="flex justify-between items-center mb-8 pb-2">
                      <h3 className="font-black text-2xl text-slate-800 tracking-tight">Cobro de Venta</h3>
                      <button onClick={() => setPaymentModalOpen(false)} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="mb-10 text-center bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner">
                      <p className="text-indigo-400 font-black uppercase text-[10px] tracking-widest mb-2">Total Facturado</p>
                      <p className="text-5xl font-black text-slate-800 tracking-tighter">{settings.currency}{total.toFixed(2)}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-2 mb-6">
                      {/* EFECTIVO */}
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                              <Banknote className="w-6 h-6"/>
                          </div>
                          <div className="flex-1">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Efectivo</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-2xl outline-none text-slate-800 placeholder-slate-200" 
                                  placeholder="0.00"
                                  value={payAmounts.cash}
                                  onChange={e => handleAmountChange('cash', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('cash')} className="p-3 text-slate-300 hover:text-emerald-500 transition-colors"><Wand2 className="w-6 h-6"/></button>
                      </div>

                      {/* YAPE / DIGITAL */}
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-50">
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                              <Smartphone className="w-6 h-6"/>
                          </div>
                          <div className="flex-1">
                              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Digital (Yape/Plin)</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-2xl outline-none text-slate-800 placeholder-slate-200" 
                                  placeholder="0.00"
                                  value={payAmounts.yape}
                                  onChange={e => handleAmountChange('yape', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('yape')} className="p-3 text-slate-300 hover:text-purple-500 transition-colors"><Wand2 className="w-6 h-6"/></button>
                      </div>

                      {/* TARJETA */}
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                              <CreditCard className="w-6 h-6"/>
                          </div>
                          <div className="flex-1">
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tarjeta</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-2xl outline-none text-slate-800 placeholder-slate-200" 
                                  placeholder="0.00"
                                  value={payAmounts.card}
                                  onChange={e => handleAmountChange('card', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('card')} className="p-3 text-slate-300 hover:text-indigo-500 transition-colors"><Wand2 className="w-6 h-6"/></button>
                      </div>
                  </div>

                  <div className="mt-auto pt-8 border-t border-slate-100">
                      {remaining > 0.01 ? (
                          <div className="flex justify-between items-center mb-6 px-2">
                              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Faltante</span>
                              <span className="text-2xl font-black text-red-500">{settings.currency}{remaining.toFixed(2)}</span>
                          </div>
                      ) : (
                           <div className="flex justify-between items-center mb-6 px-2">
                              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cambio/Vuelto</span>
                              <span className="text-3xl font-black text-emerald-500">{settings.currency}{change.toFixed(2)}</span>
                          </div>
                      )}
                      
                      <button 
                        onClick={confirmPayment}
                        className={`w-full py-5 text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-tight ${remaining > 0.01 ? 'bg-slate-200 cursor-not-allowed text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-200'}`}
                        disabled={remaining > 0.01}
                      >
                          <ShieldCheck className="w-7 h-7"/> Finalizar Compra
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};