import React, { useState, useEffect } from 'react';
import { CartItem, StoreSettings, Customer, PaymentMethod, PaymentDetail } from '../types';
import { Trash2, CreditCard, Banknote, Minus, Plus, ShoppingBag, X, Smartphone, Check, Wand2, ShieldCheck } from 'lucide-react';

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
  const [payAmounts, setPayAmounts] = useState<{ [key in PaymentMethod]?: string }>({ cash: '', yape: '', plin: '', card: '' });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
  const total = Math.max(0, subtotal - totalDiscount);
  const tax = settings.pricesIncludeTax ? (total - (total / (1 + settings.taxRate))) : (total * settings.taxRate);
  
  const totalPaid = Object.values(payAmounts).reduce<number>((acc, val) => acc + (parseFloat((val as string) || '0') || 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const fillRemaining = (method: PaymentMethod) => {
      const currentVal = parseFloat(payAmounts[method] || '0');
      const newVal = (currentVal + remaining).toFixed(2);
      setPayAmounts(prev => ({ ...prev, [method]: newVal }));
  };

  const confirmPayment = () => {
      if (totalPaid < total - 0.01) return alert('Falta cubrir el monto total');
      const payments: PaymentDetail[] = [];
      (Object.keys(payAmounts) as PaymentMethod[]).forEach(method => {
          const rawAmount = parseFloat(payAmounts[method] || '0');
          if (rawAmount > 0) payments.push({ method, amount: method === 'cash' && change > 0 ? rawAmount - change : rawAmount });
      });
      onCheckout(payments.length === 1 ? payments[0].method : 'mixed', payments);
      setPaymentModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-100 shadow-2xl">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
        <div>
            <h2 className="font-black text-xl text-slate-800 flex items-center gap-2 tracking-tight">
                <ShoppingBag className="w-5 h-5 text-brand"/> Canasta
            </h2>
            <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1 opacity-70">{items.length} Productos</p>
        </div>
        {items.length > 0 && (
            <button onClick={onClearCart} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-2xl transition-all"><Trash2 className="w-5 h-5"/></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/30">
        {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-200">
                    <ShoppingBag className="w-10 h-10"/>
                </div>
                <p className="font-bold text-sm">Esperando productos...</p>
            </div>
        ) : items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:border-brand transition-all animate-fade-in-up">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-4">
                        <h4 className="font-bold text-slate-800 leading-snug">{item.name}</h4>
                        {item.selectedVariantName && <span className="text-[10px] font-black text-brand bg-brand-soft px-2.5 py-1 rounded-lg inline-block mt-2 tracking-wider">{item.selectedVariantName}</span>}
                    </div>
                    <span className="font-black text-slate-900 text-lg">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1, item.selectedVariantId) : onRemoveItem(item.id, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-500 hover:text-red-500 transition-all active:scale-90"><Minus className="w-4 h-4"/></button>
                        <span className="font-black text-base w-6 text-center text-slate-800">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-brand rounded-xl shadow-sm text-white transition-all active:scale-90"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">P.U: {settings.currency}{item.price.toFixed(2)}</div>
                </div>
            </div>
        ))}
      </div>

      <div className="p-8 bg-white border-t border-slate-100">
        <div className="space-y-3 mb-8">
            <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-widest"><span>Subtotal</span><span>{settings.currency}{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-900 text-4xl font-black pt-5 border-t border-slate-100 tracking-tighter"><span>Total</span><span className="text-brand">{settings.currency}{total.toFixed(2)}</span></div>
        </div>

        <button 
            onClick={() => setPaymentModalOpen(true)}
            disabled={items.length === 0}
            className="w-full py-5 bg-brand disabled:opacity-50 text-white rounded-[2rem] font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-xl tracking-tight uppercase"
            style={{ boxShadow: `0 20px 30px -10px var(--brand-medium)` }}
        >
            <Banknote className="w-7 h-7"/> PAGAR AHORA
        </button>
      </div>

      {paymentModalOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
                  <div className="flex justify-between items-center mb-8 pb-2">
                      <h3 className="font-black text-2xl text-slate-800 tracking-tight">Cobro de Venta</h3>
                      <button onClick={() => setPaymentModalOpen(false)} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  <div className="mb-10 text-center bg-brand-soft p-8 rounded-[2.5rem] border border-brand-medium">
                      <p className="text-brand font-black uppercase text-[10px] tracking-widest mb-2 opacity-70">Total Facturado</p>
                      <p className="text-5xl font-black text-slate-800 tracking-tighter">{settings.currency}{total.toFixed(2)}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 mb-6">
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:border-brand transition-all">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm"><Banknote className="w-6 h-6"/></div>
                          <div className="flex-1">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Efectivo</p>
                              <input type="number" className="w-full bg-transparent font-black text-2xl outline-none text-slate-800 placeholder-slate-200" placeholder="0.00" value={payAmounts.cash} onChange={e => setPayAmounts({...payAmounts, cash: e.target.value})}/>
                          </div>
                          <button onClick={() => fillRemaining('cash')} className="p-3 text-slate-300 hover:text-emerald-500"><Wand2 className="w-6 h-6"/></button>
                      </div>
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 focus-within:border-brand transition-all">
                          <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center shrink-0 shadow-sm"><Smartphone className="w-6 h-6"/></div>
                          <div className="flex-1">
                              <p className="text-[10px] font-black text-brand uppercase tracking-widest">Yape/Plin</p>
                              <input type="number" className="w-full bg-transparent font-black text-2xl outline-none text-slate-800 placeholder-slate-200" placeholder="0.00" value={payAmounts.yape} onChange={e => setPayAmounts({...payAmounts, yape: e.target.value})}/>
                          </div>
                          <button onClick={() => fillRemaining('yape')} className="p-3 text-slate-300 hover:text-brand"><Wand2 className="w-6 h-6"/></button>
                      </div>
                  </div>
                  <div className="mt-auto pt-8 border-t border-slate-100">
                      <button 
                        onClick={confirmPayment}
                        className={`w-full py-5 text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 uppercase ${remaining > 0.01 ? 'bg-slate-200 cursor-not-allowed text-slate-400' : 'bg-brand shadow-brand-medium'}`}
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