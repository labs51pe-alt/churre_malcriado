import React, { useState, useEffect } from 'react';
import { Transaction, StoreSettings, CashShift, ViewState } from '../types';
import { supabase } from '../services/supabase';
import { 
    ShoppingBag, Clock, User, MapPin, CheckCircle2, RefreshCw, 
    Smartphone, Package, ChevronRight, Check, X, 
    Truck, Store, Timer, Receipt, Globe, AlertCircle
} from 'lucide-react';

interface OnlineOrdersViewProps {
    settings: StoreSettings;
    activeShift: CashShift | null;
    onImportToPOS: (order: Transaction) => void;
}

export const OnlineOrdersView: React.FC<OnlineOrdersViewProps> = ({ settings, activeShift, onImportToPOS }) => {
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY'>('ALL');

    const fetchOnlineOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_origin', 'Web')
                .neq('status', 'Completado')
                .neq('status', 'Cancelado')
                .order('created_at', { ascending: false });

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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOnlineOrders();
        const interval = setInterval(fetchOnlineOrders, 20000);
        return () => clearInterval(interval);
    }, []);

    const updateOrderStatus = async (id: string, newStatus: string) => {
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch (err) {
            alert("Error al actualizar estado");
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'Pendiente': return 'bg-orange-500 text-white border-orange-600';
            case 'Preparando': return 'bg-blue-500 text-white border-blue-600';
            case 'Listo': return 'bg-emerald-500 text-white border-emerald-600';
            default: return 'bg-slate-500 text-white border-slate-600';
        }
    };

    const getTimeElapsed = (date: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        if (diff < 1) return 'Recién';
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff/60)}h ${diff%60}m`;
    };

    const filteredOrders = orders.filter(o => {
        if (filter === 'PENDING') return o.status === 'Pendiente';
        if (filter === 'PREPARING') return o.status === 'Preparando';
        if (filter === 'READY') return o.status === 'Listo';
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] p-6 overflow-hidden">
            {/* Cabecera Compacta */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Globe className="w-7 h-7 text-brand"/> Pedidos Web
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Monitor en Tiempo Real</p>
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    {['ALL', 'PENDING', 'PREPARING', 'READY'].map((f) => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f as any)} 
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Nuevos' : f === 'PREPARING' ? 'Cocina' : 'Listos'}
                        </button>
                    ))}
                    <button onClick={fetchOnlineOrders} className="p-2 ml-1 text-slate-400 hover:text-brand transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {!activeShift && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl mb-6 flex items-center gap-3 text-amber-800 animate-fade-in">
                    <AlertCircle className="w-5 h-5 shrink-0"/>
                    <p className="text-[10px] font-black uppercase tracking-wider">Atención: Abre la caja para poder procesar pagos de pedidos web.</p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredOrders.length === 0 && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                        <Package className="w-16 h-16 mb-4 opacity-10"/>
                        <p className="font-black text-lg">Sin pedidos pendientes</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-24">
                        {filteredOrders.map((order) => (
                            <div 
                                key={order.id} 
                                className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col animate-fade-in-up hover:shadow-xl hover:border-brand-soft transition-all overflow-hidden relative group"
                            >
                                {/* Indicador lateral de modalidad */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${order.modality === 'delivery' ? 'bg-violet-500' : 'bg-cyan-500'}`}></div>

                                <div className="p-5 flex flex-col h-full">
                                    {/* Header de Tarjeta */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${getStatusStyle(order.status || 'Pendiente')}`}>
                                                {order.status}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold">
                                                <Clock className="w-3 h-3"/> Hace {getTimeElapsed(order.date)}
                                            </div>
                                        </div>
                                        
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider border ${order.modality === 'delivery' ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                                            {order.modality === 'delivery' ? <><Truck className="w-3.5 h-3.5"/> Delivery</> : <><Store className="w-3.5 h-3.5"/> Recojo</>}
                                        </div>
                                    </div>

                                    {/* Datos Cliente */}
                                    <div className="mb-4">
                                        <h3 className="font-black text-slate-800 text-base truncate mb-0.5">{order.customerName || 'Cliente Web'}</h3>
                                        <p className="text-[10px] font-bold text-brand flex items-center gap-1"><Smartphone className="w-3 h-3"/> {order.customerPhone || '---'}</p>
                                    </div>

                                    {/* Items List */}
                                    <div className="bg-slate-50/50 p-4 rounded-3xl border border-dashed border-slate-200 flex-1 mb-4">
                                        <div className="space-y-1.5 mb-3">
                                            {order.items.slice(0, 4).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-brand">{item.quantity}x</span>
                                                        <span className="text-slate-600 truncate max-w-[100px]">{item.name}</span>
                                                    </div>
                                                    <span className="text-slate-400 font-mono">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {order.items.length > 4 && (
                                                <p className="text-[8px] text-slate-400 font-black text-center mt-1">+{order.items.length - 4} items más</p>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                            <span className="text-xl font-black text-slate-900 tracking-tighter">{settings.currency}{order.total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Botones de Acción */}
                                    <div className="mt-auto flex gap-2">
                                        {order.status === 'Pendiente' && (
                                            <button 
                                                onClick={() => updateOrderStatus(order.id, 'Preparando')}
                                                disabled={processingId === order.id}
                                                className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <Package className="w-3.5 h-3.5 text-emerald-400"/> Aceptar
                                            </button>
                                        )}

                                        {order.status === 'Preparando' && (
                                            <button 
                                                onClick={() => updateOrderStatus(order.id, 'Listo')}
                                                disabled={processingId === order.id}
                                                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-3.5 h-3.5 text-blue-200"/> ¡Listo!
                                            </button>
                                        )}

                                        {order.status === 'Listo' && (
                                            <button 
                                                onClick={() => onImportToPOS(order)}
                                                disabled={!activeShift}
                                                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeShift ? 'bg-brand text-white shadow-lg shadow-brand-soft hover:scale-105' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                                            >
                                                <Receipt className="w-3.5 h-3.5"/> Cobrar
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => { if(confirm('¿Cancelar pedido?')) updateOrderStatus(order.id, 'Cancelado') }}
                                            className="p-3 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                        >
                                            <X className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
