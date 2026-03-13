
import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Transaction, Product, StoreSettings } from '../types';
import { 
    TrendingUp, DollarSign, Package, Globe, 
    ShoppingCart, Flame, ArrowUpRight, Award,
    Calendar, MousePointer2, Layers, PieChart as PieIcon,
    Zap, Target, ChevronRight
} from 'lucide-react';

interface AdminViewProps {
    transactions?: Transaction[];
    products?: Product[];
    settings?: StoreSettings;
}

export const AdminView: React.FC<AdminViewProps> = ({ transactions = [], products = [], settings }) => {
    const brandColor = settings?.themeColor || '#e11d48';

    const stats = useMemo(() => {
        const totalSales = transactions.reduce((acc, t) => acc + Number(t.total || 0), 0);
        const avgTicket = transactions.length > 0 ? totalSales / transactions.length : 0;
        
        // Ventas por Día
        const dailyMap: Record<string, number> = {};
        transactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            dailyMap[date] = (dailyMap[date] || 0) + Number(t.total || 0);
        });
        const dailyData = Object.entries(dailyMap)
            .map(([name, total]) => ({ name, total }))
            .reverse()
            .slice(-7);

        // Ventas por Canal
        let posTotal = 0;
        let webTotal = 0;
        transactions.forEach(t => {
            const isWeb = (t.orderOrigin || 'POS').toUpperCase() === 'WEB';
            if (isWeb) webTotal += Number(t.total || 0);
            else posTotal += Number(t.total || 0);
        });
        const channelData = [
            { name: 'TIENDA POS', value: posTotal, color: brandColor },
            { name: 'PEDIDOS WEB', value: webTotal, color: '#6366f1' }
        ];

        // Ventas por Categoría
        const catMap: Record<string, number> = {};
        transactions.forEach(t => {
            t.items.forEach(item => {
                const cat = item.category || 'Otros';
                catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
            });
        });
        const categoryData = Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Top Productos
        const prodMap: Record<string, { qty: number, revenue: number }> = {};
        transactions.forEach(t => {
            t.items.forEach(item => {
                if (!prodMap[item.name]) prodMap[item.name] = { qty: 0, revenue: 0 };
                prodMap[item.name].qty += item.quantity;
                prodMap[item.name].revenue += (item.price * item.quantity);
            });
        });
        const maxQty = Math.max(...Object.values(prodMap).map(p => p.qty), 1);
        const topProducts = Object.entries(prodMap)
            .map(([name, s]) => ({ name, qty: s.qty, revenue: s.revenue, percent: (s.qty / maxQty) * 100 }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        return { totalSales, avgTicket, dailyData, channelData, categoryData, topProducts, count: transactions.length };
    }, [transactions, brandColor]);

    const COLORS = [brandColor, '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto pb-20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-10">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-1 md:mb-2 italic">Dashboard<span className="text-brand">.</span></h1>
                        <p className="text-slate-400 font-bold text-[9px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
                            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Terminal de Datos Activa
                        </p>
                    </div>
                    <div className="flex gap-2 md:gap-4 w-full sm:w-auto">
                        <div className="flex-1 sm:flex-none bg-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center gap-2 md:gap-3">
                            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-slate-400"/>
                            <span className="text-xs md:text-sm font-black text-slate-700 uppercase">{new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* KPIs Premium */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
                    <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 opacity-[0.05] group-hover:scale-110 transition-transform duration-700 text-brand">
                            <Zap className="w-32 h-32 md:w-48 md:h-48"/>
                        </div>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 md:mb-6 flex items-center gap-2">
                             Venta Bruta <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-500"/>
                        </p>
                        <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-2 md:mb-4">
                            {settings?.currency}{stats.totalSales.toLocaleString(undefined, {minimumFractionDigits: 0})}
                        </h3>
                        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 text-emerald-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                            +14.2% Eficiencia
                        </div>
                    </div>

                    <div className="bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-700 text-white">
                            <Target className="w-32 h-32 md:w-48 md:h-48"/>
                        </div>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">Promedio por Pedido</p>
                        <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 md:mb-4">
                            {settings?.currency}{stats.avgTicket.toFixed(0)}
                        </h3>
                        <p className="text-slate-500 text-[9px] md:text-[11px] font-bold uppercase tracking-widest italic">Basado en {stats.count} Transacciones</p>
                    </div>

                    <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col justify-center">
                        <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 md:mb-8">Rendimiento por Canal</p>
                        <div className="space-y-4 md:space-y-6">
                            {stats.channelData.map((c, i) => (
                                <div key={i} className="group/item">
                                    <div className="flex justify-between text-[9px] md:text-[11px] font-black uppercase mb-1.5 md:mb-2">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            {c.name === 'TIENDA POS' ? <ShoppingCart className="w-3 h-3"/> : <Globe className="w-3 h-3"/>}
                                            {c.name}
                                        </span>
                                        <span style={{ color: c.color }}>{settings?.currency}{c.value.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 md:h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${(c.value / (stats.totalSales || 1)) * 100}%`, backgroundColor: c.color }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-8 md:mb-12">
                    {/* Gráfico Tendencia */}
                    <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-8 md:mb-12">
                            <h3 className="font-black text-slate-900 text-xl md:text-2xl flex items-center gap-3 md:gap-4 italic">
                                <Calendar className="w-6 h-6 md:w-8 md:h-8 text-brand"/> Tendencia de Ventas
                            </h3>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-brand"></div>
                                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Semanal</span>
                            </div>
                        </div>
                        <div className="h-64 md:h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.dailyData}>
                                    <defs>
                                        <linearGradient id="colorSalesPremium" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={brandColor} stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor={brandColor} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeights="900" stroke="#cbd5e1" dy={10} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeights="900" stroke="#cbd5e1" />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '15px' }}
                                        itemStyle={{ fontWeight: '900', fontSize: '14px', color: '#0f172a' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke={brandColor} strokeWidth={4} md:strokeWidth={6} fillOpacity={1} fill="url(#colorSalesPremium)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Ranking con Barras */}
                    <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-100 flex flex-col">
                        <div className="flex justify-between items-center mb-8 md:mb-12">
                            <h3 className="font-black text-slate-900 text-xl md:text-2xl flex items-center gap-3 md:gap-4 italic">
                                <Award className="w-6 h-6 md:w-8 md:h-8 text-amber-500 animate-bounce"/> Top Malcriados
                            </h3>
                            <PieIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-200"/>
                        </div>
                        
                        <div className="flex-1 space-y-6 md:space-y-8">
                            {stats.topProducts.map((p, idx) => (
                                <div key={idx} className="group cursor-default">
                                    <div className="flex justify-between items-end mb-2 md:mb-3">
                                        <div>
                                            <span className="text-[9px] md:text-[10px] font-black text-brand uppercase tracking-widest block mb-0.5 md:mb-1">Rank #{idx + 1}</span>
                                            <h4 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-tight group-hover:text-brand transition-colors">{p.name}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base md:text-lg font-black text-slate-900 tracking-tighter">{p.qty} <span className="text-[9px] md:text-[10px] text-slate-400 uppercase">Uds</span></span>
                                        </div>
                                    </div>
                                    <div className="h-3 md:h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-1 md:px-2" 
                                            style={{ 
                                                width: `${p.percent}%`, 
                                                backgroundColor: COLORS[idx % COLORS.length],
                                                boxShadow: `0 0 10px ${COLORS[idx % COLORS.length]}44`
                                            }}
                                        >
                                            <div className="w-0.5 h-0.5 md:w-1 md:h-1 bg-white rounded-full opacity-50"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {stats.topProducts.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-200 py-12 md:py-20">
                                    <Flame className="w-12 h-12 md:w-16 md:h-16 opacity-10 mb-4"/>
                                    <p className="font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Sin datos aún</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 md:p-12 rounded-3xl md:rounded-[4rem] flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-full h-full opacity-10 pointer-events-none">
                         <div className="absolute top-0 left-10 w-40 h-40 bg-brand rounded-full blur-[100px]"></div>
                    </div>
                    <div className="relative z-10 mb-6 md:mb-0 text-center md:text-left">
                        <h4 className="text-white font-black text-2xl md:text-3xl italic mb-2 tracking-tighter">Reporte de Inteligencia de Ventas</h4>
                        <p className="text-slate-400 font-bold uppercase text-[10px] md:text-xs tracking-widest">Sincronización automatizada con la nube Supabase</p>
                    </div>
                    <button onClick={() => window.print()} className="w-full md:w-auto relative z-10 bg-white text-slate-900 px-8 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-xs md:text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-3 md:gap-4 group">
                        Generar Informe PDF <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
