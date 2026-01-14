
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { StorageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import { 
    Clock, Package, RefreshCw, 
    Flame, Receipt, Globe, CheckCircle2,
    Truck, Store, Timer, ChevronRight, AlertCircle, Trash2, ArrowRight
} from 'lucide-react';

interface OnlineOrdersViewProps {
    settings: StoreSettings;
    activeShift: CashShift | null;
    onImportToPOS: (order: Transaction) => void;
}

export const OnlineOrdersView: React.FC<OnlineOrdersViewProps> = ({ settings, activeShift, onImportToPOS }) => {
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchOnlineOrders = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_origin', 'Web')
                .in('status', ['Pendiente', 'Preparando', 'Listo'])
                .order('created_at', { ascending: true }); // FIFO

            if (error) throw error;
            
            const mappedOrders = (data || []).map(d => ({
                ...d,
                date: d.created_at,
                items: d.items || [],
                paymentMethod: d.payment_method,
                customerName: d.customer_name,
                customerPhone: d.customer_phone,
                address: d.address,
                modality: d.modality || 'pickup'
            }));
            
            setOrders(mappedOrders);
        } catch (err) {
            console.error("Error al cargar pedidos web:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOnlineOrders(true);

        const channel = supabase
            .channel('monitor-realtime')
            .on('postgres_changes', 
                { event: '*', table: 'orders', schema: 'public' }, 
                () => fetchOnlineOrders(false)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOnlineOrders]);

    const updateOrderStatus = async (id: string, newStatus: string) => {
        setProcessingId(id);
        try {
            await StorageService.updateOrderStatus(id, newStatus);
            // El realtime actualizará la UI
        } catch (err) {
            alert("Error al actualizar estado en el monitor.");
        } finally {
            setProcessingId(null);
        }
    };

    const getTimeElapsed = (date: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        if (diff < 1) return 'Recién';
        return `${diff} min`;
    };

    const OrderCard: React.FC<{ order: Transaction }> = ({ order }) => (
        <div className="bg-white border border-slate-100 rounded-[1.8rem] shadow-sm p-5 hover:shadow-md transition-all animate-fade-in-up relative overflow-hidden group">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.modality === 'delivery' ? 'bg-violet-500' : 'bg-cyan-500'}`}></div>
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
                    <Timer className="w-3.5 h-3.5 text-brand"/> {getTimeElapsed(order.date)}
                </div>
                <div className="flex items-center gap-1">
                    {order.modality === 'delivery' ? <Truck className="w-3.5 h-3.5 text-violet-500"/> : <Store className="w-3.5 h-3.5 text-cyan-500"/>}
                    <span className="text-[9px] font-black uppercase text-slate-400">{order.modality === 'delivery' ? 'Delivery' : 'Recojo'}</span>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-black text-slate-800 text-sm truncate uppercase">{order.customerName || 'Cliente Web'}</h4>
                <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{order.customerPhone || 'Sin teléfono'}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 mb-4 space-y-1.5 border border-slate-100">
                {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-brand w-5">{item.quantity}</span>
                        <span className="text-slate-600 flex-1 truncate pr-2">{item.name}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[8px] font-black text-slate-300 uppercase">Subtotal</span>
                <span className="text-lg font-black text-slate-800 tracking-tighter">{settings.currency}{order.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
                {order.status === 'Pendiente' && (
                    <button 
                        onClick={() => onImportToPOS(order)}
                        disabled={!activeShift || processingId === order.id}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-30"
                    >
                        <Receipt className="w-3.5 h-3.5 text-brand"/> Cobrar
                    </button>
                )}
                
                {order.status === 'Preparando' && (
                    <button 
                        onClick={() => updateOrderStatus(order.id, 'Listo')}
                        disabled={processingId === order.id}
                        className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-200"/> Terminado
                    </button>
                )}

                {order.status === 'Listo' && (
                    <button 
                        onClick={() => updateOrderStatus(order.id, 'Completado')}
                        disabled={processingId === order.id}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-200"/> Entregado
                    </button>
                )}

                <button 
                    onClick={() => { if(confirm('¿Anular?')) updateOrderStatus(order.id, 'Cancelado') }}
                    className="p-3 bg-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all"
                >
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );

    const KanbanColumn = ({ title, icon: Icon, color, status, ordersList }: any) => (
        <div className="flex-1 flex flex-col min-w-[300px] h-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 ${color}`}>
                        <Icon className="w-5 h-5"/>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm">{title}</h3>
                </div>
                <span className="bg-slate-200 text-slate-500 font-black text-[10px] px-2.5 py-1 rounded-full">{ordersList.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-10">
                {ordersList.map((order: Transaction) => (
                    <OrderCard key={order.id} order={order} />
                ))}
                {ordersList.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-32 flex flex-col items-center justify-center text-slate-300">
                        <Package className="w-8 h-8 mb-2 opacity-20"/>
                        <span className="text-[10px] font-bold uppercase">Vacío</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] p-6 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Globe className="w-7 h-7 text-brand"/> Monitor Kanban
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Sincronización total con cocina y web</p>
                </div>

                <div className="flex items-center gap-4">
                    {!activeShift && (
                        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase border border-amber-200 animate-pulse">
                            <AlertCircle className="w-4 h-4"/> Caja Cerrada
                        </div>
                    )}
                    <button 
                        onClick={() => fetchOnlineOrders(true)} 
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-all shadow-sm"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start h-full">
                <KanbanColumn 
                    title="Por Cobrar" 
                    icon={Receipt} 
                    color="text-orange-500" 
                    status="Pendiente" 
                    ordersList={orders.filter(o => o.status === 'Pendiente')}
                />
                
                <KanbanColumn 
                    title="En Cocina" 
                    icon={Flame} 
                    color="text-rose-500" 
                    status="Preparando" 
                    ordersList={orders.filter(o => o.status === 'Preparando')}
                />

                <KanbanColumn 
                    title="Por Entregar" 
                    icon={CheckCircle2} 
                    color="text-emerald-500" 
                    status="Listo" 
                    ordersList={orders.filter(o => o.status === 'Listo')}
                />
            </div>
        </div>
    );
};
