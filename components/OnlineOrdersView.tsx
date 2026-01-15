
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { StorageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import { 
    Clock, RefreshCw, Receipt, Globe, 
    Truck, Navigation, AlertCircle, 
    Smartphone, Banknote, CreditCard, X, 
    ChevronRight, Printer, Archive, CheckCircle2,
    MapPin, Loader2
} from 'lucide-react';

interface OnlineOrdersViewProps {
    settings: StoreSettings;
    activeShift: CashShift | null;
    onImportToPOS: (order: Transaction) => void;
    onOrderCompleted: (transaction: Transaction) => void;
}

const LOCAL_ARCHIVE_KEY = 'churre_archived_web_orders_v9';

export const OnlineOrdersView: React.FC<OnlineOrdersViewProps> = ({ settings, activeShift, onOrderCompleted }) => {
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Transaction | null>(null);

    const getArchivedIds = (): string[] => {
        try {
            const stored = localStorage.getItem(LOCAL_ARCHIVE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    };

    const fetchOnlineOrders = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_origin', 'Web')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const archivedIds = getArchivedIds();
            const mappedOrders = (data || [])
                .map(d => ({
                    ...d,
                    id: d.id, 
                    date: d.created_at,
                    items: typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []),
                    total: Number(d.total || 0),
                    paymentMethod: d.payment_method,
                    customerName: d.customer_name,
                    customerPhone: d.customer_phone,
                    address: d.address,
                    modality: d.modality || 'pickup',
                    orderOrigin: d.order_origin,
                    status: d.status
                }))
                .filter(o => !archivedIds.includes(o.id));
            
            setOrders(mappedOrders);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOnlineOrders(true);
        const channel = supabase.channel('monitor-web-final-v2')
            .on('postgres_changes', { event: '*', table: 'orders', schema: 'public', filter: "order_origin=eq.Web" }, () => fetchOnlineOrders(false))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchOnlineOrders]);

    const handleQuickPayment = async (method: string) => {
        if (!selectedOrderForPayment || !activeShift) return;
        
        const orderId = selectedOrderForPayment.id;
        const orderToClose = selectedOrderForPayment;
        
        setProcessingId(orderId);
        setSelectedOrderForPayment(null);

        try {
            // EJECUCIÓN EN LA NUBE - Forzamos el estado COMPLETADO
            const result = await StorageService.updateOrderStatus(orderId, 'Completado', {
                shiftId: activeShift.id,
                paymentMethod: method,
                total: orderToClose.total
            });

            if (result.success) {
                // ACTUALIZACIÓN LOCAL
                setOrders(prev => prev.map(o => 
                    o.id === orderId ? { ...o, status: 'Completado', paymentMethod: method } : o
                ));
                
                onOrderCompleted({
                    ...orderToClose,
                    paymentMethod: method,
                    payments: [{ method: method as any, amount: orderToClose.total }],
                    shiftId: activeShift.id,
                    status: 'Completado'
                });
            } else {
                alert(`NO SE PUDO ACTUALIZAR EL PEDIDO: ${result.error}`);
            }
        } catch (err: any) {
            alert(`Error crítico en la red: ${err.message}`);
        } finally {
            setProcessingId(null);
            // Sincronización de seguridad
            setTimeout(() => fetchOnlineOrders(false), 800);
        }
    };

    const handleArchiveOrder = (orderId: string) => {
        const archived = getArchivedIds();
        if (!archived.includes(orderId)) {
            localStorage.setItem(LOCAL_ARCHIVE_KEY, JSON.stringify([...archived, orderId]));
        }
        setOrders(prev => prev.filter(o => o.id !== orderId));
    };

    const handleReprint = (order: Transaction) => {
        onOrderCompleted(order);
    };

    return (
        <div className="h-full flex flex-col bg-[#f1f5f9] p-4 lg:p-8 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Globe className="w-9 h-9 text-brand"/> Monitor Pedidos Web
                    </h1>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] ml-1">Sincronización Cloud Activa</p>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => fetchOnlineOrders(true)} 
                        className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-brand transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {orders.map((order) => {
                        const isPaid = order.status === 'Completado';
                        const isDelivery = order.modality?.toLowerCase() === 'delivery';
                        const isProcessing = processingId === order.id;
                        
                        return (
                            <div key={order.id} className={`bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 transition-all duration-300 relative overflow-hidden flex flex-col ${isPaid ? 'bg-emerald-50/10 border-emerald-500/20 shadow-emerald-100' : 'hover:shadow-xl hover:border-brand/20'}`}>
                                
                                {isProcessing && (
                                    <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-brand font-black animate-fade-in">
                                        <Loader2 className="w-10 h-10 animate-spin mb-2"/>
                                        <span className="text-[10px] uppercase tracking-widest">Sincronizando...</span>
                                    </div>
                                )}

                                {isPaid && !isProcessing && (
                                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in bg-white/60">
                                        <div className="border-[12px] border-emerald-500 rounded-[2.5rem] px-8 py-4 transform -rotate-12 bg-white shadow-2xl flex flex-col items-center">
                                            <span className="text-emerald-600 font-black text-4xl tracking-tighter uppercase italic leading-none">PAGADO</span>
                                            <span className="text-emerald-500 font-bold text-[8px] mt-1 uppercase tracking-[0.3em]">CLOUD OK</span>
                                        </div>
                                    </div>
                                )}

                                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest text-white z-10 ${isDelivery ? 'bg-indigo-600' : 'bg-cyan-500'}`}>
                                    {isDelivery ? 'Delivery' : 'Recojo'}
                                </div>

                                <div className="mb-4 flex items-start gap-4 pt-2">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isPaid ? 'bg-emerald-100 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                        {isPaid ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <h4 className="font-black text-lg leading-tight uppercase truncate text-slate-800">{order.customerName || 'Cliente Web'}</h4>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">{order.customerPhone || 'Sin teléfono'}</p>
                                    </div>
                                </div>

                                {isDelivery && (
                                    <div className="mb-4 bg-blue-50 border-2 border-blue-100 p-4 rounded-3xl flex items-start gap-3 shadow-inner">
                                        <MapPin className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dirección Envío</p>
                                            <p className="text-[15px] font-black text-blue-900 leading-tight uppercase italic break-words">
                                                {order.address || 'REVISAR WHATSAPP'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 rounded-2xl p-4 mb-5 border border-slate-100 bg-slate-50/50 space-y-2">
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-start text-[11px] font-bold text-slate-700">
                                            <span className="text-brand w-6 shrink-0">{item.quantity}x</span>
                                            <span className="flex-1 uppercase">{item.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-end justify-between mb-6 pt-2 border-t border-slate-200">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Monto Web</span>
                                    <div className="flex items-baseline gap-1 text-slate-900">
                                        <span className="text-sm font-bold opacity-50">{settings.currency}</span>
                                        <span className="text-3xl font-black tracking-tighter">{(order.total || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 relative z-50">
                                    {!isPaid ? (
                                        <button 
                                            onClick={() => setSelectedOrderForPayment(order)}
                                            disabled={!activeShift || isProcessing}
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-20 active:scale-95"
                                        >
                                            <Receipt className="w-5 h-5 text-brand"/> COBRAR PEDIDO
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={() => handleReprint(order)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"><Printer className="w-4 h-4"/> Ticket</button>
                                            <button onClick={() => handleArchiveOrder(order.id)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95"><Archive className="w-4 h-4"/> Archivar</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedOrderForPayment && (
                <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-fade-in-up border border-white">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-2xl text-slate-800 tracking-tight uppercase italic leading-none">Confirmar Pago</h3>
                            <button onClick={() => setSelectedOrderForPayment(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                        </div>

                        <div className="mb-8 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto de la Web</p>
                            <p className="text-5xl font-black text-slate-900 tracking-tighter">{settings.currency}{(selectedOrderForPayment.total || 0).toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={() => handleQuickPayment('cash')} className="p-5 bg-emerald-50 border-2 border-emerald-100 rounded-3xl flex items-center justify-between hover:bg-emerald-600 hover:text-white transition-all group">
                                <span className="font-black uppercase tracking-widest text-sm">Efectivo</span>
                                <Banknote className="w-6 h-6 text-emerald-500 group-hover:text-white"/>
                            </button>
                            <button onClick={() => handleQuickPayment('yape')} className="p-5 bg-brand-soft border-2 border-brand-medium rounded-3xl flex items-center justify-between hover:bg-brand hover:text-white transition-all group">
                                <span className="font-black uppercase tracking-widest text-sm">Yape / Plin</span>
                                <Smartphone className="w-6 h-6 text-brand group-hover:text-white"/>
                            </button>
                            <button onClick={() => handleQuickPayment('card')} className="p-5 bg-blue-50 border-2 border-blue-100 rounded-3xl flex items-center justify-between hover:bg-blue-600 hover:text-white transition-all group">
                                <span className="font-black uppercase tracking-widest text-sm">Tarjeta</span>
                                <CreditCard className="w-6 h-6 text-blue-500 group-hover:text-white"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
