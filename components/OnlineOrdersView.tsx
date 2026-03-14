
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { StorageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import { 
    Clock, RefreshCw, Receipt, Globe, 
    Smartphone, Banknote, CreditCard, X, 
    ChevronRight, Archive, CheckCircle2, Trash2,
    MapPin, Loader2, Check, User, Store, Navigation, Eye,
    Printer, FileText
} from 'lucide-react';

interface OnlineOrdersViewProps {
    settings: StoreSettings;
    activeShift: CashShift | null;
    onImportToPOS: (order: Transaction) => void;
    onOrderCompleted: (transaction: Transaction) => void;
}

const LOCAL_ARCHIVE_KEY = 'churre_archived_web_orders_v14';
const COMPLETED_OVERRIDE_KEY = 'churre_completed_today_v14';

export const OnlineOrdersView: React.FC<OnlineOrdersViewProps> = ({ settings, activeShift, onOrderCompleted }) => {
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Transaction | null>(null);
    const [viewOnlyOrder, setViewOnlyOrder] = useState<Transaction | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    const [completedIds, setCompletedIds] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem(COMPLETED_OVERRIDE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

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

            const mappedOrders = (data || []).map(d => {
                const idStr = d.id.toString();
                const isLocallyCompleted = completedIds.includes(idStr);
                const finalStatus = isLocallyCompleted ? 'Completado' : d.status;

                return {
                    ...d,
                    id: idStr,
                    date: d.created_at,
                    items: typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []),
                    total: Number(d.total || 0),
                    paymentMethod: d.payment_method,
                    customerName: d.customer_name,
                    customerPhone: d.customer_phone,
                    address: d.address,
                    modality: d.modality || 'pickup',
                    orderOrigin: d.order_origin,
                    status: finalStatus
                };
            }).filter(o => !archivedIds.includes(o.id));
            
            setOrders(mappedOrders);
        } catch (err) {
            console.error("[MONITOR] Error en fetch:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [completedIds]);

    useEffect(() => {
        fetchOnlineOrders(true);
        const channel = supabase.channel('monitor-web-v14')
            .on('postgres_changes', { event: '*', table: 'orders', schema: 'public', filter: "order_origin=eq.Web" }, () => {
                if (!processingId) {
                    setTimeout(() => fetchOnlineOrders(false), 800);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchOnlineOrders, processingId]);

    const handleQuickPayment = async (method: string) => {
        if (!selectedOrderForPayment || !activeShift) return;
        const orderId = selectedOrderForPayment.id;
        const orderToClose = selectedOrderForPayment;

        setProcessingId(orderId);
        setSelectedOrderForPayment(null);

        try {
            const result = await StorageService.updateOrderStatus(orderId, 'Completado', {
                shiftId: activeShift.id,
                paymentMethod: method,
                total: orderToClose.total
            });

            if (result.success) {
                const newCompletedList = [...completedIds, orderId];
                setCompletedIds(newCompletedList);
                sessionStorage.setItem(COMPLETED_OVERRIDE_KEY, JSON.stringify(newCompletedList));

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
                throw new Error(result.error || "Fallo en la comunicación");
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setProcessingId(null);
            setTimeout(() => fetchOnlineOrders(false), 1500);
        }
    };

    const handleArchiveOrder = (orderId: string) => {
        const archived = getArchivedIds();
        if (!archived.includes(orderId)) {
            localStorage.setItem(LOCAL_ARCHIVE_KEY, JSON.stringify([...archived, orderId]));
        }
        setOrders(prev => prev.filter(o => o.id !== orderId));
    };

    const handleDeleteOrder = async (orderId: string) => {
        setProcessingId(orderId);
        setOrderToDelete(null);
        try {
            console.log("[DELETE] Intentando eliminar pedido:", orderId);
            
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId);

            if (error) {
                console.error("[DELETE] Error de Supabase:", error);
                throw error;
            }
            
            console.log("[DELETE] Pedido eliminado con éxito");
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (err: any) {
            console.error("[DELETE] Error capturado:", err);
            setErrorMessage(`Error al eliminar: ${err.message || 'Error desconocido'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const getPaymentIcon = (method: string) => {
        const m = String(method).toLowerCase();
        if (m.includes('yape') || m.includes('plin')) return <Smartphone className="w-3.5 h-3.5"/>;
        if (m.includes('efectivo') || m.includes('cash')) return <Banknote className="w-3.5 h-3.5"/>;
        return <CreditCard className="w-3.5 h-3.5"/>;
    };

    return (
        <div className="h-full flex flex-col bg-[#f1f5f9] p-4 md:p-6 lg:p-8 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
                        <Globe className="w-7 h-7 md:w-9 md:h-9 text-brand"/> Monitor Pedidos Web
                    </h1>
                    <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] ml-1">Sincronización Cloud Transaccional v14</p>
                </div>
                <button onClick={() => fetchOnlineOrders(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-600 font-bold hover:text-brand transition-all shadow-sm active:scale-95">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm">{loading ? 'Actualizando...' : 'Refrescar'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 pb-20 md:pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
                    {orders.map((order) => {
                        const isPaid = order.status === 'Completado';
                        const isDelivery = order.modality?.toLowerCase() === 'delivery';
                        const isProcessing = processingId === order.id;
                        
                        return (
                            <div key={order.id} className={`bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border p-5 md:p-6 transition-all duration-500 relative overflow-hidden flex flex-col ${isPaid ? 'border-emerald-500/30 bg-white shadow-emerald-100/50' : 'border-slate-100 hover:shadow-xl'}`}>
                                
                                {isProcessing && (
                                    <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-brand font-black">
                                        <Loader2 className="w-10 h-10 md:w-14 md:h-14 animate-spin mb-4 text-brand"/>
                                        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-800 animate-pulse">Sincronizando...</span>
                                    </div>
                                )}

                                {isPaid && (
                                    <div className="absolute top-12 left-1/2 -translate-x-1/2 -rotate-12 pointer-events-none z-0 opacity-[0.08] select-none">
                                        <span className="text-emerald-600 font-black text-6xl md:text-8xl tracking-tighter uppercase italic">PAGADO</span>
                                    </div>
                                )}

                                <div className={`absolute top-0 right-0 px-4 md:px-6 py-1.5 md:py-2 rounded-bl-2xl md:rounded-bl-3xl font-black text-[9px] md:text-[10px] uppercase tracking-widest text-white z-10 ${isDelivery ? 'bg-indigo-600' : 'bg-cyan-500'}`}>
                                    {isDelivery ? 'Envío Delivery' : 'Recojo Local'}
                                </div>

                                <div className="mb-4 flex items-start gap-3 md:gap-4 pt-2 relative z-10">
                                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {isPaid ? <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" /> : <Clock className="w-6 h-6 md:w-7 md:h-7" />}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <h4 className="font-black text-base md:text-lg leading-tight uppercase truncate text-slate-800">{order.customerName || 'Cliente Web'}</h4>
                                        <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-0.5">{order.customerPhone || 'Sin número'}</p>
                                    </div>
                                </div>

                                {isPaid && (
                                    <div className="mb-4 bg-emerald-50 border border-emerald-100 p-2 md:p-2.5 rounded-xl md:rounded-2xl flex items-center gap-2 justify-center">
                                        <div className="text-emerald-600">{getPaymentIcon(order.paymentMethod || 'Efectivo')}</div>
                                        <span className="text-[9px] md:text-[10px] font-black text-emerald-700 uppercase tracking-widest">Cobrado con {order.paymentMethod || 'Efectivo'}</span>
                                    </div>
                                )}

                                <div className={`mb-4 border-2 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-start gap-2 md:gap-3 shadow-inner relative z-10 transition-colors ${isDelivery ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                    {isDelivery ? <MapPin className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 shrink-0 mt-1" /> : <Store className="w-5 h-5 md:w-6 md:h-6 text-slate-400 shrink-0 mt-1" />}
                                    <div className="flex-1">
                                        <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${isDelivery ? 'text-indigo-400' : 'text-slate-400'}`}>{isDelivery ? 'Destino Final' : 'Modalidad'}</p>
                                        <p className={`text-xs md:text-[13px] font-black leading-tight uppercase italic break-words line-clamp-2 ${isDelivery ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {isDelivery ? (order.address || 'REVISAR WHATSAPP') : 'Recojo en Sanguchería'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 rounded-xl md:rounded-2xl p-3 md:p-4 mb-4 md:mb-5 border border-slate-100 bg-slate-50/50 space-y-1.5 md:space-y-2 relative z-10">
                                    {order.items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-start text-[10px] md:text-[11px] font-bold text-slate-700">
                                            <span className="text-brand w-5 md:w-6 shrink-0">{item.quantity}x</span>
                                            <span className="flex-1 uppercase line-clamp-1">{item.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-end justify-between mb-4 md:mb-6 pt-2 border-t border-slate-200 relative z-10">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">{isPaid ? 'Total Pagado' : 'A Cobrar'}</span>
                                    <div className={`flex items-baseline gap-1 ${isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        <span className="text-xs md:text-sm font-bold opacity-50">{settings.currency}</span>
                                        <span className="text-2xl md:text-3xl font-black tracking-tighter">{(order.total || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 relative z-50">
                                    {!isPaid ? (
                                        <div className="w-full flex flex-col gap-2">
                                            <button 
                                                onClick={() => setSelectedOrderForPayment(order)}
                                                disabled={!activeShift || isProcessing}
                                                className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl active:scale-95"
                                            >
                                                <Receipt className="w-4 h-4 md:w-5 md:h-5 text-brand"/> REGISTRAR PAGO
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    console.log("[DEBUG] Click en Eliminar Pedido, ID:", order.id);
                                                    setOrderToDelete(order.id);
                                                }}
                                                disabled={isProcessing}
                                                className="w-full py-2.5 bg-rose-50 text-rose-500 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-3.5 h-3.5"/> Eliminar Pedido
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full flex flex-col gap-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => setViewOnlyOrder(order)} className="py-3 md:py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 hover:bg-slate-50"><Eye className="w-3.5 h-3.5 md:w-4 md:h-4"/> Ver Datos</button>
                                                <button onClick={() => handleArchiveOrder(order.id)} className="py-3 md:py-4 bg-slate-100 text-slate-400 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 hover:bg-slate-200"><Archive className="w-3.5 h-3.5 md:w-4 md:h-4"/> Archivar</button>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    console.log("[DEBUG] Click en Eliminar Permanentemente, ID:", order.id);
                                                    setOrderToDelete(order.id);
                                                }}
                                                disabled={isProcessing}
                                                className="w-full py-2 bg-rose-50/50 text-rose-400 rounded-lg font-bold text-[8px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5 border border-rose-100/50"
                                            >
                                                <Trash2 className="w-3 h-3"/> Eliminar Permanentemente
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {orderToDelete && (
                <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-fade-in-up border border-rose-100">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase tracking-tight">¿Eliminar Pedido?</h3>
                        <p className="text-sm text-slate-500 text-center mb-8 font-medium">Esta acción es permanente y no se puede deshacer. El pedido se borrará de la base de datos.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setOrderToDelete(null)}
                                className="py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleDeleteOrder(orderToDelete)}
                                className="py-4 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NOTIFICACIÓN DE ERROR */}
            {errorMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
                        <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center shrink-0">
                            <X className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest pr-4">{errorMessage}</p>
                        <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white transition-colors">
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL DE PAGO O VISTA DE DETALLES */}
            {(selectedOrderForPayment || viewOnlyOrder) && (
                <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl animate-fade-in-up border border-white max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-black text-xl md:text-2xl text-slate-800 tracking-tight uppercase italic leading-none">
                                    {viewOnlyOrder ? 'Detalles del Pedido' : 'Confirmar Ingreso'}
                                </h3>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">ID: {(selectedOrderForPayment || viewOnlyOrder)?.id}</p>
                            </div>
                            <button onClick={() => { setSelectedOrderForPayment(null); setViewOnlyOrder(null); }} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-brand transition-all"><X className="w-6 h-6 md:w-7 md:h-7"/></button>
                        </div>

                        <div className="mb-6 bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100">
                            <div className="flex items-start gap-3 md:gap-4 mb-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm text-slate-400">
                                    <User className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                                    <p className="font-black text-slate-800 uppercase italic leading-tight text-base md:text-lg">{(selectedOrderForPayment || viewOnlyOrder)?.customerName}</p>
                                    <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1">{(selectedOrderForPayment || viewOnlyOrder)?.customerPhone}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 md:gap-4">
                                <div className={`w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm ${(selectedOrderForPayment || viewOnlyOrder)?.modality?.toLowerCase() === 'delivery' ? 'text-indigo-600' : 'text-cyan-500'}`}>
                                    {(selectedOrderForPayment || viewOnlyOrder)?.modality?.toLowerCase() === 'delivery' ? <Navigation className="w-5 h-5 md:w-6 md:h-6" /> : <Store className="w-5 h-5 md:w-6 md:h-6" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{(selectedOrderForPayment || viewOnlyOrder)?.modality?.toLowerCase() === 'delivery' ? 'Dirección' : 'Modalidad'}</p>
                                    <p className="font-black uppercase italic text-xs md:text-sm text-slate-700">
                                        {(selectedOrderForPayment || viewOnlyOrder)?.modality?.toLowerCase() === 'delivery' ? (selectedOrderForPayment || viewOnlyOrder)?.address : 'Recojo Local'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={`mb-6 md:mb-8 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border text-center shadow-inner ${viewOnlyOrder ? 'bg-emerald-50 border-emerald-100' : 'bg-brand-soft border-brand/10'}`}>
                            <p className={`text-[10px] md:text-[11px] font-bold uppercase tracking-widest mb-2 ${viewOnlyOrder ? 'text-emerald-500' : 'text-brand'}`}>Total {(selectedOrderForPayment || viewOnlyOrder)?.status === 'Completado' ? 'Recaudado' : 'A Cobrar'}</p>
                            <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">{settings.currency}{(selectedOrderForPayment || viewOnlyOrder)?.total.toFixed(2)}</p>
                        </div>

                        {!viewOnlyOrder ? (
                            <div className="grid grid-cols-1 gap-2 md:gap-3">
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Elija Medio de Pago</p>
                                <button onClick={() => handleQuickPayment('cash')} className="p-4 md:p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl md:rounded-3xl flex items-center justify-between hover:bg-emerald-600 hover:text-white group transition-all active:scale-95 shadow-sm">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm"><Banknote className="w-6 h-6 md:w-7 md:h-7 text-emerald-500 group-hover:text-emerald-600"/></div>
                                        <span className="font-black uppercase tracking-widest text-xs md:text-sm text-slate-800 group-hover:text-white">Efectivo</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 opacity-30 group-hover:opacity-100"/>
                                </button>
                                <button onClick={() => handleQuickPayment('yape')} className="p-4 md:p-6 bg-rose-50 border-2 border-rose-100 rounded-2xl md:rounded-3xl flex items-center justify-between hover:bg-rose-600 hover:text-white group transition-all active:scale-95 shadow-sm">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm"><Smartphone className="w-6 h-6 md:w-7 md:h-7 text-rose-500 group-hover:text-rose-600"/></div>
                                        <span className="font-black uppercase tracking-widest text-xs md:text-sm text-slate-800 group-hover:text-white">Yape / Plin</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 opacity-30 group-hover:opacity-100"/>
                                </button>
                                <button onClick={() => handleQuickPayment('card')} className="p-4 md:p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl md:rounded-3xl flex items-center justify-between hover:bg-blue-600 hover:text-white group transition-all active:scale-95 shadow-sm">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm"><CreditCard className="w-6 h-6 md:w-7 md:h-7 text-blue-500 group-hover:text-blue-600"/></div>
                                        <span className="font-black uppercase tracking-widest text-xs md:text-sm text-slate-800 group-hover:text-white">Tarjeta</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 opacity-30 group-hover:opacity-100"/>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-2xl md:rounded-3xl">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText className="w-3 h-3"/> Resumen del Cobro</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-500">
                                            <span>MÉTODO:</span>
                                            <span className="text-emerald-600 uppercase italic">{viewOnlyOrder.paymentMethod || 'EFECTIVO'}</span>
                                        </div>
                                        <div className="h-px bg-slate-200 my-1"></div>
                                        {viewOnlyOrder.items.map((it: any, k: number) => (
                                            <div key={k} className="flex justify-between text-[10px] md:text-xs font-bold text-slate-700">
                                                <span>{it.quantity}x {it.name.substring(0, 20)}</span>
                                                <span>{settings.currency}{(it.price * it.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => onOrderCompleted(viewOnlyOrder)} 
                                    className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
                                >
                                    <Printer className="w-4 h-4 md:w-5 md:h-5"/> Generar Ticket / PDF
                                </button>
                                
                                <button onClick={() => setViewOnlyOrder(null)} className="w-full py-3 md:py-4 text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">Cerrar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
