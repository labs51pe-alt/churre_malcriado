
import React, { useState } from 'react';
import { CartItem, StoreSettings, PaymentMethod, PaymentDetail } from '../types';
import { Trash2, CreditCard, Banknote, Minus, Plus, ShoppingBag, X, Smartphone, ShieldCheck, DollarSign, Receipt, Wand2, RefreshCw } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onUpdateDiscount: (id: string, discount: number, variantId?: string) => void;
  onCheckout: (method: string, payments: PaymentDetail[]) => Promise<void>;
  onClearCart: () => void;
  settings: StoreSettings;
  customers: any[];
}

export const Cart: React.FC<CartProps> = ({ items, onUpdateQuantity, onRemoveItem, onCheckout, onClearCart, settings }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payAmounts, setPayAmounts] = useState<{ [key in PaymentMethod]?: string }>({ 
    cash: '', 
    yape: '', 
    card: '' 
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
  const total = Math.max(0, subtotal - totalDiscount);
  
  const totalPaid = Object.values(payAmounts).reduce<number>((acc, val) => {
    const amountStr = (val as string) || '0';
    return acc + (parseFloat(amountStr) || 0);
  }, 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const fillRemaining = (method: PaymentMethod) => {
      const currentOtherPaid = Object.entries(payAmounts)
        .filter(([key]) => key !== method)
        .reduce((acc, [_, val]) => acc + (parseFloat((val as string) || '0') || 0), 0);
      
      const needed = Math.max(0, total - currentOtherPaid);
      setPayAmounts(prev => ({ ...prev, [method]: needed.toFixed(2) }));
  };

  const confirmPayment = async () => {
      if (totalPaid < total - 0.01) return alert('El monto pagado es insuficiente');
      
      setIsProcessing(true);
      const payments: PaymentDetail[] = [];
      
      (Object.keys(payAmounts) as PaymentMethod[]).forEach(method => {
          const rawAmount = parseFloat(payAmounts[method] || '0');
          if (rawAmount > 0) {
              const finalAmount = (method === 'cash' && change > 0) ? rawAmount - change : rawAmount;
              if (finalAmount > 0) payments.push({ method, amount: finalAmount });
          }
      });

      try {
          await onCheckout(payments.length === 1 ? payments[0].method : 'mixed', payments);
          setPaymentModalOpen(false);
          setPayAmounts({ cash: '', yape: '', card: '' });
      } catch (error) {
          console.error("Error en el cobro:", error);
      } finally {
          setIsProcessing(false);
      }
  };

  const PaymentRow = ({ method, label, icon: Icon, colorClass, iconColorClass }: any) => (
    <div className={`flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 transition-all ${parseFloat(payAmounts[method] || '0') > 0 ? 'border-brand ring-4 ring-brand-soft bg-white shadow-md' : 'border-slate-100 focus-within:border-slate-300'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${colorClass} ${iconColorClass}`}>
            <Icon className="w-6 h-6"/>
        </div>
        <div className="flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${iconColorClass}`}>{label}</p>
            <input 
                type="number" 
                disabled={isProcessing}
                className="w-full bg-transparent font-extrabold text-2xl outline-none text-slate-800 placeholder-slate-200" 
                placeholder="0.00" 
                value={payAmounts[method]} 
                onChange={e => setPayAmounts({...payAmounts, [method]: e.target.value})}
            />
        </div>
        {!isProcessing && <button onClick={() => fillRemaining(method)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-300 hover:text-brand transition-all active:scale-90"><Wand2 className="w-5 h-5"/></button>}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-xl relative overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <div>
            <h2 className="font-extrabold text-lg text-slate-800 flex items-center gap-2.5 tracking-tight uppercase">
                <ShoppingBag className="w-5 h-5 text-brand"/> Canasta
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{items.length} ítems registrados</p>
        </div>
        {items.length > 0 && (
            <button onClick={onClearCart} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all"><Trash2 className="w-5 h-5"/></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar bg-slate-50/20 pb-48">
        {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8"/>
                </div>
                <p className="font-bold text-[11px] uppercase tracking-widest">Carrito Vacío</p>
            </div>
        ) : items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in-up">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-3">
                        <h4 className="font-bold text-slate-800 text-[13px] uppercase tracking-tight leading-tight">{item.name}</h4>
                        {item.selectedVariantName && <span className="text-[9px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-md inline-block mt-1 uppercase border border-brand/5">{item.selectedVariantName}</span>}
                    </div>
                    <span className="font-extrabold text-slate-900 text-[15px] tracking-tight shrink-0">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1, item.selectedVariantId) : onRemoveItem(item.id, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 hover:text-red-500 active:scale-90 transition-all"><Minus className="w-4 h-4"/></button>
                        <span className="font-bold text-xs w-6 text-center text-slate-700">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-brand text-white rounded-lg shadow-sm active:scale-90 transition-all"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">P.U: {settings.currency}{item.price.toFixed(2)}</div>
                </div>
            </div>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-20 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-end mb-5">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total a pagar</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-800">{settings.currency}</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{total.toFixed(2)}</span>
                </div>
            </div>
            {totalDiscount > 0 && (
                <div className="text-right">
                    <span className="text-[9px] font-bold text-emerald-500 uppercase block">Ahorro</span>
                    <span className="font-bold text-emerald-500 text-sm">-{settings.currency}{totalDiscount.toFixed(2)}</span>
                </div>
            )}
        </div>

        <button 
            onClick={() => setPaymentModalOpen(true)}
            disabled={items.length === 0}
            className={`
                w-full py-5 rounded-2xl font-extrabold transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg tracking-wider uppercase shadow-xl
                ${items.length === 0 
                    ? 'bg-slate-100 text-slate-300 shadow-none' 
                    : 'bg-brand text-white hover:brightness-105 shadow-brand/20'
                }
            `}
        >
            <Banknote className="w-6 h-6"/> COBRAR VENTA
        </button>
      </div>

      {paymentModalOpen && (
          <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-fade-in-up border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-extrabold text-2xl text-slate-800 tracking-tight uppercase">Medios de Pago</h3>
                      {!isProcessing && <button onClick={() => setPaymentModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-brand transition-all"><X className="w-6 h-6"/></button>}
                  </div>

                  <div className="mb-8 text-center bg-slate-50 p-8 rounded-2xl border border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto de la Venta</p>
                      <p className="text-5xl font-black text-slate-900 tracking-tighter">{settings.currency}{total.toFixed(2)}</p>
                  </div>

                  <div className="space-y-3.5 mb-8">
                      <PaymentRow method="cash" label="Dinero en Efectivo" icon={Banknote} colorClass="bg-emerald-50" iconColorClass="text-emerald-500"/>
                      <PaymentRow method="yape" label="Yape / Plin / Digital" icon={Smartphone} colorClass="bg-brand-soft" iconColorClass="text-brand"/>
                      <PaymentRow method="card" label="Tarjeta Débito/Crédito" icon={CreditCard} colorClass="bg-blue-50" iconColorClass="text-blue-500"/>

                      {change > 0 && (
                          <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center animate-fade-in-up">
                              <span className="font-bold text-emerald-700 uppercase tracking-widest text-[11px] flex items-center gap-2">
                                  <DollarSign className="w-4 h-4"/> Vuelto sugerido
                              </span>
                              <span className="text-3xl font-black text-emerald-600 tracking-tighter">{settings.currency}{change.toFixed(2)}</span>
                          </div>
                      )}
                  </div>

                  <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 px-5 py-4 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><Receipt className="w-4 h-4"/> Saldo pendiente</span>
                          <span className={`font-black text-xl tracking-tighter ${remaining > 0.01 ? 'text-brand animate-pulse' : 'text-emerald-500'}`}>
                            {settings.currency}{remaining.toFixed(2)}
                          </span>
                      </div>
                      <button 
                        onClick={confirmPayment}
                        className={`w-full py-5 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider ${remaining > 0.01 || isProcessing ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : 'bg-brand hover:brightness-105 shadow-brand/30'}`}
                        disabled={remaining > 0.01 || isProcessing}
                      >
                          {isProcessing ? <><RefreshCw className="w-6 h-6 animate-spin"/> Procesando...</> : <><ShieldCheck className="w-6 h-6"/> Finalizar y Facturar</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
