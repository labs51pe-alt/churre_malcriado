
import React, { useState, useMemo } from 'react';
import { Transaction, StoreSettings } from '../types';
import { 
    Download, Calendar, Filter, DollarSign, 
    CreditCard, Banknote, Search, ChevronDown, 
    FileSpreadsheet, Smartphone, Receipt, 
    Globe, ShoppingCart, BarChart3, TrendingUp,
    Flame, ArrowRight, Table, PieChart
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
    transactions: Transaction[];
    settings: StoreSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, settings }) => {
    const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
    const [channelFilter, setChannelFilter] = useState<'ALL' | 'POS' | 'WEB'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        
        let filtered = [...transactions];

        // Date Filter
        if (dateRange === 'TODAY') {
            filtered = filtered.filter(t => new Date(t.date).getTime() >= startOfDay.getTime());
        } else if (dateRange === 'WEEK') {
            const startOfWeek = new Date();
            startOfWeek.setDate(now.getDate() - 7);
            filtered = filtered.filter(t => new Date(t.date).getTime() >= startOfWeek.getTime());
        } else if (dateRange === 'MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filtered = filtered.filter(t => new Date(t.date).getTime() >= startOfMonth.getTime());
        }

        // Channel Filter
        if (channelFilter !== 'ALL') {
            filtered = filtered.filter(t => (t.orderOrigin || 'POS').toUpperCase() === channelFilter);
        }

        // Search Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.id.toLowerCase().includes(lower) || 
                t.paymentMethod.toLowerCase().includes(lower) ||
                t.items.some(i => i.name.toLowerCase().includes(lower)) ||
                (t.customerName && t.customerName.toLowerCase().includes(lower))
            );
        }

        return filtered;
    }, [transactions, dateRange, channelFilter, searchTerm]);

    const stats = useMemo(() => {
        let total = 0;
        let posTotal = 0;
        let webTotal = 0;
        let cash = 0;
        let digital = 0; 

        filteredTransactions.forEach(t => {
            const isWeb = (t.orderOrigin || 'POS').toUpperCase() === 'WEB';
            const amount = Number(t.total || 0);
            
            total += amount;
            if (isWeb) webTotal += amount;
            else posTotal += amount;

            if (t.payments && t.payments.length > 0) {
                t.payments.forEach(p => {
                    if (p.method === 'cash') cash += (p.amount || 0);
                    else digital += (p.amount || 0);
                });
            } else {
                if (t.paymentMethod === 'cash') cash += amount;
                else digital += amount;
            }
        });

        return { total, posTotal, webTotal, count: filteredTransactions.length, cash, digital };
    }, [filteredTransactions]);

    // --- FUNCIONES DE EXPORTACIÓN ---

    const exportGeneral = () => {
        const data = filteredTransactions.map(t => ({
            Ticket: t.id,
            Fecha: new Date(t.date).toLocaleString(),
            Canal: t.orderOrigin || 'POS',
            Cliente: t.customerName || 'POS',
            Total: t.total,
            Metodo: t.paymentMethod
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
        XLSX.writeFile(wb, `Ventas_General_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportDailySales = () => {
        const daily: Record<string, { count: number, total: number }> = {};
        filteredTransactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString();
            if (!daily[date]) daily[date] = { count: 0, total: 0 };
            daily[date].count++;
            daily[date].total += t.total;
        });

        const data = Object.entries(daily).map(([fecha, stat]) => ({
            Fecha: fecha,
            Pedidos: stat.count,
            Total_Recaudado: stat.total
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas_Diarias");
        XLSX.writeFile(wb, `Reporte_Diario_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportChannelSales = () => {
        const data = [
            { Canal: 'TIENDA POS', Pedidos: filteredTransactions.filter(t => (t.orderOrigin || 'POS').toUpperCase() === 'POS').length, Total: stats.posTotal },
            { Canal: 'PEDIDOS WEB', Pedidos: filteredTransactions.filter(t => (t.orderOrigin || 'POS').toUpperCase() === 'WEB').length, Total: stats.webTotal }
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Canales");
        XLSX.writeFile(wb, `Ventas_Por_Canal_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportTopProducts = () => {
        const products: Record<string, { qty: number, revenue: number }> = {};
        filteredTransactions.forEach(t => {
            t.items.forEach(item => {
                if (!products[item.name]) products[item.name] = { qty: 0, revenue: 0 };
                products[item.name].qty += item.quantity;
                products[item.name].revenue += (item.price * item.quantity);
            });
        });

        const data = Object.entries(products)
            .map(([name, stat]) => ({
                Producto: name,
                Unidades_Vendidas: stat.qty,
                Total_Dinero: stat.revenue
            }))
            .sort((a, b) => b.Unidades_Vendidas - a.Unidades_Vendidas);

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Top_Productos");
        XLSX.writeFile(wb, `Ranking_Productos_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3 italic">
                        <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-brand" /> Reportes de Negocio
                    </h1>
                    <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-1 italic">Analítica avanzada y exportación de datos v14</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><DollarSign className="w-16 h-16 md:w-20 md:h-20 text-brand" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Venta Bruta Total</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-400">{settings.currency}</span>
                        <span className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">{stats.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Ventas por Canal</span>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
                            <span className="font-bold text-[11px] text-indigo-600 flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5"/> POS</span>
                            <span className="font-black text-indigo-900 text-sm">{settings.currency}{stats.posTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-cyan-50/50 p-3 rounded-2xl border border-cyan-100">
                            <span className="font-bold text-[11px] text-cyan-600 flex items-center gap-2"><Globe className="w-3.5 h-3.5"/> WEB</span>
                            <span className="font-black text-cyan-900 text-sm">{settings.currency}{stats.webTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Recaudación Efectivo</span>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner"><Banknote className="w-6 h-6 md:w-7 md:h-7"/></div>
                        <span className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter">{settings.currency}{stats.cash.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Recaudación Digital</span>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 shadow-inner"><Smartphone className="w-6 h-6 md:w-7 md:h-7"/></div>
                        <span className="text-2xl md:text-3xl font-black text-purple-600 tracking-tighter">{settings.currency}{stats.digital.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE EXPORTACIÓN AVANZADA */}
            <div className="mb-8 md:mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <Table className="w-4 h-4 text-brand"/> Exportación Avanzada a Excel
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <button 
                        onClick={exportDailySales}
                        className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 hover:border-brand hover:shadow-xl transition-all text-left group flex flex-col justify-between h-48 md:h-56"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-soft group-hover:text-brand transition-all">
                            <Calendar className="w-6 h-6 md:w-7 md:h-7"/>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-base md:text-lg uppercase italic mb-1">Ventas por Día</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen histórico diario</p>
                        </div>
                        <div className="flex justify-end"><ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-all"/></div>
                    </button>

                    <button 
                        onClick={exportChannelSales}
                        className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 hover:border-brand hover:shadow-xl transition-all text-left group flex flex-col justify-between h-48 md:h-56"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-soft group-hover:text-brand transition-all">
                            <PieChart className="w-6 h-6 md:w-7 md:h-7"/>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-base md:text-lg uppercase italic mb-1">Canal Web vs POS</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rendimiento por plataforma</p>
                        </div>
                        <div className="flex justify-end"><ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-all"/></div>
                    </button>

                    <button 
                        onClick={exportTopProducts}
                        className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-100 hover:border-brand hover:shadow-xl transition-all text-left group flex flex-col justify-between h-48 md:h-56"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-soft group-hover:text-brand transition-all">
                            <Flame className="w-6 h-6 md:w-7 md:h-7"/>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-base md:text-lg uppercase italic mb-1">Top Productos</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ranking de los más vendidos</p>
                        </div>
                        <div className="flex justify-end"><ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-all"/></div>
                    </button>
                </div>
            </div>

            {/* FILTROS Y TABLA */}
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1">
                <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col lg:flex-row gap-4 md:gap-6 bg-slate-50/30">
                    <div className="flex bg-white p-1 rounded-xl md:p-1.5 md:rounded-2xl gap-1 shadow-sm border border-slate-100 shrink-0 overflow-x-auto custom-scrollbar">
                        {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
                            <button 
                                key={r}
                                onClick={() => setDateRange(r)}
                                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${dateRange === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {r === 'TODAY' ? 'Hoy' : r === 'WEEK' ? '7 Días' : r === 'MONTH' ? 'Mes' : 'Todo'}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 relative">
                        <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 md:w-5 md:h-5"/>
                        <input 
                            type="text" 
                            placeholder="Buscar por ticket, cliente o producto..." 
                            className="w-full pl-12 md:pl-16 pr-4 md:pr-8 py-3 md:py-5 bg-white border border-slate-200 rounded-xl md:rounded-2xl outline-none font-bold text-[10px] md:text-xs text-slate-700 transition-all placeholder-slate-300 focus:border-brand shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button onClick={exportGeneral} className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 shadow-xl active:scale-95">
                        <Download className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">Exportar Lista</span><span className="sm:hidden">Exportar</span>
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <div className="min-w-[800px] p-4">
                        <table className="w-full text-left">
                            <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 md:p-6">Canal</th>
                                    <th className="p-4 md:p-6">Fecha / Hora</th>
                                    <th className="p-4 md:p-6">Cliente</th>
                                    <th className="p-4 md:p-6">Productos</th>
                                    <th className="p-4 md:p-6 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTransactions.map(t => {
                                    const isWeb = (t.orderOrigin || 'POS').toUpperCase() === 'WEB';
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-4 md:p-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isWeb ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                    {isWeb ? <Globe className="w-3.5 h-3.5"/> : <ShoppingCart className="w-3.5 h-3.5"/>}
                                                    {isWeb ? 'WEB' : 'POS'}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-6">
                                                <div className="font-bold text-slate-800 text-xs">{new Date(t.date).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-4 md:p-6">
                                                <p className="font-black text-slate-800 text-xs uppercase italic truncate max-w-[150px]">{t.customerName || 'Cliente Local'}</p>
                                            </td>
                                            <td className="p-4 md:p-6">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-xs italic">
                                                    {t.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-6 text-right font-black text-slate-900 text-lg tracking-tighter">
                                                {settings.currency}{(t.total || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
