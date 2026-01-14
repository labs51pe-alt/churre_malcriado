
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { StorageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import { 
    Clock, Package, RefreshCw, 
    Flame, Receipt, Globe, CheckCircle2,
    Truck, Store, Timer, ChevronRight, AlertCircle, Trash2, ArrowRight, User
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
            // Ahora traemos pedidos Web Y POS que estén activos en cocina
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .in('status', ['Pendiente', 'Preparando', 'Listo'])
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            const mappedOrders = (data || []).map(d => ({
                ...d,
                date: d.created_at,
                items: d.items || [],
                paymentMethod: d.payment_method,
                customerName: d.customer_name,
                customerPhone: d.customer_phone,
                address: d.address,
                modality: d.modality || 'pickup',
                orderOrigin: d.order_origin
            }));
            
            setOrders(mappedOrders);
        } catch (err) {
            console.error("Error al cargar pedidos del monitor:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOnlineOrders(true);
        const channel = supabase.channel('monitor-realtime').on('postgres_changes', { event: '*', table: 'orders', schema: 'public' }, () => fetchOnlineOrders(false)).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchOnlineOrders]);

    const updateOrderStatus = async (id: string, newStatus: string) => {
        setProcessingId(id);
        const success = await StorageService.updateOrderStatus(id, newStatus);
        if (!success) alert("Error al actualizar el estado. Verifica tu conexión.");
        setProcessingId(null);
    };

    const getTimeElapsed = (date: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        if (diff < 1) return 'Ahora';
        return `${diff}m`;
    };

    const OrderCard: React.FC<{ order: Transaction }> = ({ order }) => (
        <div className="bg-white border border-slate-100 rounded-[1.8rem] shadow-sm p-4 lg:p-5 hover:shadow-md transition-all animate-fade-in-up relative overflow-hidden group">
            {/* Indicador lateral de modalidad */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.modality === 'delivery' ? 'bg-indigo-500' : 'bg-cyan-500'}`}></div>
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase">
                    <Timer className="w-3.5 h-3.5 text-brand"/> {getTimeElapsed(order.date)}
                </div>
                <div className="flex gap-1.5">
                    {/* Badge de Origen */}
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${order.orderOrigin === 'Web' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {order.orderOrigin || 'POS'}
                    </span>
                    <div className="flex items-center gap-1 opacity-60">
                        {order.modality === 'delivery' ? <Truck className="w-3 h-3 text-indigo-500"/> : <Store className="w-3 h-3 text-cyan-500"/>}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-black text-slate-800 text-sm truncate uppercase flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-300 shrink-0"/>
                    {order.customerName || 'Cliente'}
                </h4>
                {order.customerPhone && <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5 ml-5">{order.customerPhone}</p>}
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-3 mb-4 space-y-2 border border-slate-100/50">
                {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start text-[10px] font-bold">
                        <span className="text-brand w-4 lg:w-5 shrink-0">{item.quantity}</span>
                        <div className="flex-1 flex flex-col">
                            <span className="text-slate-700 uppercase leading-tight">{item.name}</span>
                            {item.selectedVariantName && <span className="text-[8px] text-slate-400 font-medium">({item.selectedVariantName})</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[8px] font-black text-slate-300 uppercase">Subtotal</span>
                <span className="text-base lg:text-lg font-black text-slate-800 tracking-tighter">{settings.currency}{order.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
                {order.status === 'Pendiente' && (
                    <button 
                        onClick={() => onImportToPOS(order)}
                        disabled={!activeShift || processingId === order.id}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-30"
                    >
                        <Receipt className="w-3.5 h-3.5 text-brand"/> Cobrar
                    </button>
                )}
                
                {order.status === 'Preparando' && (
                    <button 
                        onClick={() => updateOrderStatus(order.id, 'Listo')}
                        disabled={processingId === order.id}
                        className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-200"/> Despachar
                    </button>
                )}

                {order.status === 'Listo' && (
                    <button 
                        onClick={() => updateOrderStatus(order.id, 'Completado')}
                        disabled={processingId === order.id}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-200"/> Entregar
                    </button>
                )}

                <button 
                    onClick={() => { if(confirm('¿Anular pedido?')) updateOrderStatus(order.id, 'Cancelado') }}
                    className="p-3 bg-slate-100 text-slate-300 hover:text-red-500 rounded-xl transition-all"
                >
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );

    const KanbanColumn = ({ title, icon: Icon, color, status, ordersList }: any) => (
        <div className="flex-1 flex flex-col min-w-[280px] lg:min-w-[320px] h-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 ${color}`}>
                        <Icon className="w-5 h-5 lg:w-6 lg:h-6"/>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xs lg:text-sm">{title}</h3>
                </div>
                <span className="bg-slate-200 text-slate-500 font-black text-[9px] lg:text-[10px] px-2.5 py-1 rounded-full">{ordersList.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-10 pr-1">
                {ordersList.map((order: Transaction) => (
                    <OrderCard key={order.id} order={order} />
                ))}
                {ordersList.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2rem] h-32 flex flex-col items-center justify-center text-slate-200">
                        <Package className="w-8 h-8 mb-2 opacity-10"/>
                        <span className="text-[9px] font-bold uppercase opacity-50 tracking-widest text-slate-400">Sin pedidos</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] p-4 lg:p-6 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 lg:mb-8 gap-4">
                <div>
                    <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Globe className="w-7 h-7 text-brand"/> Monitor Kanban Unificado
                    </h1>
                    <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Sincronización Total: Web + POS</p>
                </div>

                <div className="flex items-center gap-4">
                    {!activeShift && (
                        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase border border-amber-200 animate-pulse">
                            <AlertCircle className="w-4 h-4"/> Caja Cerrada
                        </div>
                    )}
                    <button 
                        onClick={() => fetchOnlineOrders(true)} 
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-5 lg:gap-6 overflow-x-auto pb-4 custom-scrollbar items-start h-full">
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
                    title="Listos" 
                    icon={CheckCircle2} 
                    color="text-emerald-500" 
                    status="Listo" 
                    ordersList={orders.filter(o => o.status === 'Listo')}
                />
            </div>
        </div>
    );
};
