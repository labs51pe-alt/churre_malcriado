
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { StorageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import { 
    Clock, Package, RefreshCw, 
    Flame, Receipt, Globe, CheckCircle2,
    Truck, Store, Timer, ChevronRight, AlertCircle, Trash2, ArrowRight, User, GripVertical
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
    const [draggedOrder, setDraggedOrder] = useState<Transaction | null>(null);
    const [overColumn, setOverColumn] = useState<string | null>(null);

    const fetchOnlineOrders = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
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
        const channel = supabase.channel('monitor-realtime')
            .on('postgres_changes', { event: '*', table: 'orders', schema: 'public' }, () => fetchOnlineOrders(false))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchOnlineOrders]);

    const updateOrderStatus = async (id: string, newStatus: string) => {
        setProcessingId(id);
        const success = await StorageService.updateOrderStatus(id, newStatus);
        if (!success) alert("Error al actualizar el estado.");
        setProcessingId(null);
    };

    const handleDragStart = (e: React.DragEvent, order: Transaction) => {
        setDraggedOrder(order);
        e.dataTransfer.setData('orderId', order.id);
        // Efecto visual de transparencia al arrastrar
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.4';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedOrder(null);
        setOverColumn(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
        e.preventDefault();
        setOverColumn(columnStatus);
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        setOverColumn(null);
        const orderId = e.dataTransfer.getData('orderId');
        const order = orders.find(o => o.id === orderId);

        if (!order || order.status === targetStatus) return;

        // Validaciones de flujo lógico
        if (order.status === 'Pendiente' && targetStatus === 'Preparando') {
            onImportToPOS(order); // Requiere cobrar
            return;
        }

        if (order.status === 'Pendiente' && targetStatus === 'Listo') {
            alert("El pedido debe ser cobrado antes de estar listo.");
            return;
        }

        // Si es movimiento válido, actualizar DB
        updateOrderStatus(orderId, targetStatus);
    };

    const getTimeElapsed = (date: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        if (diff < 1) return 'Ahora';
        return `${diff}m`;
    };

    const OrderCard: React.FC<{ order: Transaction }> = ({ order }) => (
        <div 
            draggable 
            onDragStart={(e) => handleDragStart(e, order)}
            onDragEnd={handleDragEnd}
            className={`
                bg-white border border-slate-100 rounded-[1.8rem] shadow-sm p-4 lg:p-5 
                hover:shadow-md transition-all animate-fade-in-up relative overflow-hidden group 
                cursor-grab active:cursor-grabbing select-none
                ${processingId === order.id ? 'opacity-50 animate-pulse' : ''}
            `}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.modality === 'delivery' ? 'bg-indigo-500' : 'bg-cyan-500'}`}></div>
            
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase">
                    <Timer className="w-3.5 h-3.5 text-brand"/> {getTimeElapsed(order.date)}
                </div>
                <div className="flex gap-1.5 items-center">
                    <GripVertical className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${order.orderOrigin === 'Web' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {order.orderOrigin || 'POS'}
                    </span>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-black text-slate-800 text-sm truncate uppercase flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-300 shrink-0"/>
                    {order.customerName || 'Cliente'}
                </h4>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-3 mb-4 space-y-2 border border-slate-100/50">
                {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start text-[10px] font-bold">
                        <span className="text-brand w-4 lg:w-5 shrink-0">{item.quantity}</span>
                        <div className="flex-1 flex flex-col">
                            <span className="text-slate-700 uppercase leading-tight">{item.name}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Total</span>
                <span className="text-base lg:text-lg font-black text-slate-800 tracking-tighter">{settings.currency}{order.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
                {order.status === 'Pendiente' && (
                    <button onClick={() => onImportToPOS(order)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-30">
                        <Receipt className="w-3.5 h-3.5 text-brand"/> Cobrar
                    </button>
                )}
                {order.status === 'Preparando' && (
                    <button onClick={() => updateOrderStatus(order.id, 'Listo')} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-200"/> Listo
                    </button>
                )}
                {order.status === 'Listo' && (
                    <button onClick={() => updateOrderStatus(order.id, 'Completado')} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-200"/> Entregado
                    </button>
                )}
            </div>
        </div>
    );

    const KanbanColumn = ({ title, icon: Icon, color, status, ordersList }: any) => (
        <div 
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
            className={`
                flex-1 flex flex-col min-w-[280px] lg:min-w-[320px] h-full rounded-[2.5rem] p-2 transition-all duration-300
                ${overColumn === status ? 'bg-brand-soft ring-4 ring-brand-medium scale-[1.01]' : 'bg-transparent'}
            `}
        >
            <div className="flex items-center justify-between mb-4 px-4 pt-2">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 ${color}`}>
                        <Icon className="w-5 h-5 lg:w-6 lg:h-6"/>
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xs lg:text-sm">{title}</h3>
                </div>
                <span className="bg-slate-200 text-slate-500 font-black text-[9px] lg:text-[10px] px-2.5 py-1 rounded-full">{ordersList.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-10 px-2">
                {ordersList.map((order: Transaction) => (
                    <OrderCard key={order.id} order={order} />
                ))}
                {ordersList.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] h-32 flex flex-col items-center justify-center text-slate-200 bg-white/40">
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
            
            <style>{`
                .cursor-grab { cursor: grab; }
                .cursor-grabbing { cursor: grabbing; }
            `}</style>
        </div>
    );
};
