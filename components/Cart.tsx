
import React, { useState, useEffect } from 'react';
import { CartItem, StoreSettings, Customer, PaymentMethod, PaymentDetail } from '../types';
import { Trash2, CreditCard, Banknote, Minus, Plus, ShoppingBag, X, Smartphone, Check, Wand2, ShieldCheck, DollarSign } from 'lucide-react';

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
  const [payAmounts, setPayAmounts] = useState<{ [key in PaymentMethod]?: string }>({ 
    cash: '', 
    yape: '', 
    card: '' 
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
  const total = Math.max(0, subtotal - totalDiscount);
  
  const totalPaid = Object.values(payAmounts).reduce<number>((acc, val) => {
    const amountStr = typeof val === 'string' ? val : '0';
    return acc + (parseFloat(amountStr) || 0);
  }, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const fillRemaining = (method: PaymentMethod) => {
      const currentOtherPaid = Object.entries(payAmounts)
        .filter(([key]) => key !== method)
        .reduce((acc, [_, val]) => {
          const amountStr = typeof val === 'string' ? val : '0';
          return acc + (parseFloat(amountStr) || 0);
        }, 0);
      
      const needed = Math.max(0, total - currentOtherPaid);
      setPayAmounts(prev => ({ ...prev, [method]: needed.toFixed(2) }));
  };

  const confirmPayment = () => {
      if (totalPaid < total - 0.01) return alert('Falta cubrir el monto total');
      const payments: PaymentDetail[] = [];
      
      (Object.keys(payAmounts) as PaymentMethod[]).forEach(method => {
          const rawAmount = parseFloat(payAmounts[method] || '0');
          if (rawAmount > 0) {
              const finalAmount = (method === 'cash' && change > 0) ? rawAmount - change : rawAmount;
              if (finalAmount > 0) {
                payments.push({ method, amount: finalAmount });
              }
          }
      });

      onCheckout(payments.length === 1 ? payments[0].method : 'mixed', payments);
      setPaymentModalOpen(false);
      setPayAmounts({ cash: '', yape: '', card: '' });
  };

  const PaymentRow = ({ method, label, icon: Icon, colorClass, iconColorClass }: { 
    method: PaymentMethod, 
    label: string, 
    icon: any, 
    colorClass: string,
    iconColorClass: string 
  }) => (
    <div className={`flex items-center gap-3 lg:gap-4 bg-slate-50 p-3 lg:p-4 rounded-2xl lg:rounded-[1.8rem] border-2 transition-all ${parseFloat(payAmounts[method] || '0') > 0 ? 'border-brand' : 'border-slate-100 focus-within:border-slate-300'}`}>
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${colorClass} ${iconColorClass}`}>
            <Icon className="w-5 h-5 lg:w-6 lg:h-6"/>
        </div>
        <div className="flex-1">
            <p className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest ${iconColorClass}`}>{label}</p>
            <input 
                type="number" 
                className="w-full bg-transparent font-black text-xl lg:text-2xl outline-none text-slate-800 placeholder-slate-200" 
                placeholder="0.00" 
                value={payAmounts[method]} 
                onChange={e => setPayAmounts({...payAmounts, [method]: e.target.value})}
            />
        </div>
        <button 
            onClick={() => fillRemaining(method)} 
            className="p-2 lg:p-3 text-slate-300 hover:text-brand transition-colors"
        >
            <Wand2 className="w-5 h-5 lg:w-6 lg:h-6"/>
        </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-100 shadow-2xl relative">
      <div className="p-4 lg:p-6 border-b border-slate-50 flex justify-between items-center bg-white shrink-0">
        <div>
            <h2 className="font-black text-lg lg:text-xl text-slate-800 flex items-center gap-2 tracking-tight">
                <ShoppingBag className="w-4 h-4 lg:w-5 lg:h-5 text-brand"/> Canasta
            </h2>
            <p className="text-[9px] lg:text-[10px] font-black text-brand uppercase tracking-widest mt-0.5 lg:mt-1 opacity-70">{items.length} Productos</p>
        </div>
        {items.length > 0 && (
            <button onClick={onClearCart} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 lg:p-2.5 rounded-xl lg:rounded-2xl transition-all"><Trash2 className="w-4 h-4 lg:w-5 lg:h-5"/></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 lg:space-y-4 custom-scrollbar bg-slate-50/30">
        {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 lg:space-y-4">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-100 rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-center text-slate-200">
                    <ShoppingBag className="w-8 h-8 lg:w-10 lg:h-10"/>
                </div>
                <p className="font-bold text-xs lg:text-sm uppercase tracking-widest">Esperando productos...</p>
            </div>
        ) : items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white border border-slate-100 rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-sm hover:border-brand transition-all animate-fade-in-up">
                <div className="flex justify-between items-start mb-2 lg:mb-3">
                    <div className="flex-1 pr-2">
                        <h4 className="font-bold text-slate-800 leading-snug text-sm uppercase">{item.name}</h4>
                        {item.selectedVariantName && <span className="text-[8px] lg:text-[10px] font-black text-brand bg-brand-soft px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-md lg:rounded-lg inline-block mt-1 lg:mt-2 tracking-wider uppercase">{item.selectedVariantName}</span>}
                    </div>
                    <span className="font-black text-slate-900 text-base lg:text-lg shrink-0">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 lg:gap-3 bg-slate-50 rounded-xl lg:rounded-2xl p-1 lg:p-1.5 border border-slate-100">
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1, item.selectedVariantId) : onRemoveItem(item.id, item.selectedVariantId)} className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center bg-white rounded-lg lg:rounded-xl shadow-sm text-slate-500 hover:text-red-500 transition-all active:scale-90"><Minus className="w-3 h-3 lg:w-4 lg:h-4"/></button>
                        <span className="font-black text-sm lg:text-base w-5 lg:w-6 text-center text-slate-800">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariantId)} className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center bg-brand rounded-lg lg:rounded-xl shadow-sm text-white transition-all active:scale-90"><Plus className="w-3 h-3 lg:w-4 lg:h-4"/></button>
                    </div>
                    <div className="text-[8px] lg:text-[10px] text-slate-400 font-black uppercase tracking-widest">P.U: {settings.currency}{item.price.toFixed(2)}</div>
                </div>
            </div>
        ))}
      </div>

      <div className="p-6 lg:p-8 bg-white border-t border-slate-100 shrink-0">
        <div className="space-y-2 lg:space-y-3 mb-6 lg:mb-8">
            <div className="flex justify-between text-slate-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest"><span>Subtotal</span><span>{settings.currency}{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-900 text-3xl lg:text-4xl font-black pt-3 lg:pt-5 border-t border-slate-100 tracking-tighter"><span>Total</span><span className="text-brand">{settings.currency}{total.toFixed(2)}</span></div>
        </div>

        <button 
            onClick={() => setPaymentModalOpen(true)}
            disabled={items.length === 0}
            className="w-full py-4 lg:py-5 bg-brand disabled:opacity-50 text-white rounded-xl lg:rounded-[2rem] font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 lg:gap-3 text-lg lg:text-xl tracking-tight uppercase"
            style={{ boxShadow: `0 20px 30px -10px var(--brand-medium)` }}
        >
            <Banknote className="w-6 h-6 lg:w-7 lg:h-7"/> COBRAR VENTA
        </button>
      </div>

      {paymentModalOpen && (
          <div className="absolute inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-3xl lg:rounded-[3.5rem] p-6 lg:p-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-brand"></div>
                  
                  <div className="flex justify-between items-center mb-6 lg:mb-8">
                      <h3 className="font-black text-2xl lg:text-3xl text-slate-800 tracking-tight">Cobro de Venta</h3>
                      <button onClick={() => setPaymentModalOpen(false)} className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-slate-50 rounded-full hover:bg-slate-100 transition-colors text-slate-400"><X className="w-6 h-6 lg:w-7 lg:h-7"/></button>
                  </div>

                  <div className="mb-6 lg:mb-8 text-center bg-brand-soft p-6 lg:p-10 rounded-2xl lg:rounded-[3rem] border border-brand-medium">
                      <p className="text-brand font-black uppercase text-[9px] lg:text-[10px] tracking-widest mb-1 lg:mb-2 opacity-70">Total Facturado</p>
                      <p className="text-4xl lg:text-6xl font-black text-slate-800 tracking-tighter">{settings.currency}{total.toFixed(2)}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 lg:space-y-4 mb-6 lg:mb-8">
                      <PaymentRow 
                        method="cash" 
                        label="Efectivo" 
                        icon={Banknote} 
                        colorClass="bg-emerald-100" 
                        iconColorClass="text-emerald-600"
                      />
                      <PaymentRow 
                        method="yape" 
                        label="Yape / Plin" 
                        icon={Smartphone} 
                        colorClass="bg-brand-soft" 
                        iconColorClass="text-brand"
                      />
                      <PaymentRow 
                        method="card" 
                        label="Visa / Tarjeta" 
                        icon={CreditCard} 
                        colorClass="bg-blue-100" 
                        iconColorClass="text-blue-600"
                      />

                      {change > 0 && (
                          <div className="p-4 lg:p-6 bg-emerald-50 rounded-xl lg:rounded-[2rem] border-2 border-emerald-200 flex justify-between items-center animate-fade-in">
                              <div className="flex items-center gap-2 lg:gap-3">
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center text-white shadow-lg"><DollarSign className="w-5 h-5 lg:w-6 lg:h-6"/></div>
                                  <span className="font-black text-emerald-700 uppercase tracking-widest text-[11px] lg:text-sm">Cambio</span>
                              </div>
                              <span className="text-2xl lg:text-3xl font-black text-emerald-600">{settings.currency}{change.toFixed(2)}</span>
                          </div>
                      )}
                  </div>

                  <div className="mt-auto">
                      <div className="flex justify-between items-center mb-4 lg:mb-6 px-2 lg:px-4">
                          <span className="text-slate-400 font-bold uppercase text-[9px] lg:text-[10px] tracking-widest">Saldo Restante</span>
                          <span className={`font-black text-lg lg:text-xl ${remaining > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {settings.currency}{remaining.toFixed(2)}
                          </span>
                      </div>
                      
                      <button 
                        onClick={confirmPayment}
                        className={`w-full py-4 lg:py-6 text-white rounded-xl lg:rounded-[2rem] font-black text-lg lg:text-xl shadow-2xl transition-all flex items-center justify-center gap-2 lg:gap-3 uppercase ${remaining > 0.01 ? 'bg-slate-200 cursor-not-allowed text-slate-400' : 'bg-brand hover:scale-[1.02] active:scale-95'}`}
                        disabled={remaining > 0.01}
                      >
                          <ShieldCheck className="w-6 h-6 lg:w-8 lg:h-8"/> 
                          {remaining > 0.01 ? 'Pago Incompleto' : 'Finalizar'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
