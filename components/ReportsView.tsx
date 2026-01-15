
import React, { useState, useMemo } from 'react';
import { Transaction, StoreSettings } from '../types';
import { 
    Download, Calendar, Filter, DollarSign, 
    CreditCard, Banknote, Search, ChevronDown, 
    FileSpreadsheet, Smartphone, Receipt, 
    Globe, ShoppingCart, BarChart3, TrendingUp 
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
            filtered = filtered.filter(t => t.orderOrigin?.toUpperCase() === channelFilter);
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
            const isWeb = t.orderOrigin?.toUpperCase() === 'WEB';
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

    const handleExport = () => {
        const data = filteredTransactions.map(t => ({
            Ticket: t.id,
            Fecha: new Date(t.date).toLocaleString(),
            Canal: t.orderOrigin || 'POS',
            Cliente: t.customerName || 'POS',
            Metodos: t.payments ? t.payments.map(p => `${p.method}: ${p.amount}`).join(', ') : t.paymentMethod,
            Total: t.total,
            Resumen: t.items.map(i => `${i.quantity}x ${i.name}`).join(' | ')
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Ventas_Detallado");
        XLSX.writeFile(wb, `Reporte_${channelFilter}_${dateRange}_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50/20 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <BarChart3 className="w-9 h-9 text-brand" /> Reportes de Gestión
                    </h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-1">Análisis por canal y métodos de pago</p>
                </div>
                <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-200 transition-all flex items-center gap-2 uppercase text-xs tracking-widest active:scale-95">
                    <Download className="w-5 h-5" /> Exportar Datos
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-16 h-16 text-brand" />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Venta Bruta Total</span>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-soft rounded-2xl text-brand shadow-sm"><DollarSign className="w-6 h-6"/></div>
                        <span className="text-3xl font-black text-slate-900 tracking-tighter">{settings.currency}{stats.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Desglose por Canal</span>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 font-bold text-[11px] text-slate-600">
                                <ShoppingCart className="w-4 h-4 text-indigo-500" /> POS
                            </div>
                            <span className="font-black text-slate-800 text-sm">{settings.currency}{stats.posTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 font-bold text-[11px] text-slate-600">
                                <Globe className="w-4 h-4 text-cyan-500" /> WEB
                            </div>
                            <span className="font-black text-slate-800 text-sm">{settings.currency}{stats.webTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Recaudación Efectivo</span>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500 shadow-sm"><Banknote className="w-6 h-6"/></div>
                        <span className="text-3xl font-black text-emerald-500 tracking-tighter">{settings.currency}{stats.cash.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Recaudación Digital</span>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-500 shadow-sm"><Smartphone className="w-6 h-6"/></div>
                        <span className="text-3xl font-black text-purple-600 tracking-tighter">{settings.currency}{stats.digital.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shrink-0">
                    {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
                        <button 
                            key={r}
                            onClick={() => setDateRange(r)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === r ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {r === 'TODAY' && 'Hoy'}
                            {r === 'WEEK' && '7 Días'}
                            {r === 'MONTH' && 'Mes'}
                            {r === 'ALL' && 'Todo'}
                        </button>
                    ))}
                </div>

                <div className="h-full w-px bg-slate-100 hidden lg:block mx-2"></div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shrink-0">
                    {(['ALL', 'POS', 'WEB'] as const).map((c) => (
                        <button 
                            key={c}
                            onClick={() => setChannelFilter(c)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channelFilter === c ? 'bg-brand text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {c === 'ALL' && 'Todos los Canales'}
                            {c === 'POS' && 'Tienda POS'}
                            {c === 'WEB' && 'Pedidos Web'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5"/>
                    <input 
                        type="text" 
                        placeholder="Buscar por ticket, cliente o producto..." 
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-transparent focus:border-slate-200 rounded-2xl outline-none font-bold text-xs text-slate-700 transition-all placeholder-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 border-b border-slate-100">
                            <tr>
                                <th className="p-6 pl-10">Origen</th>
                                <th className="p-6">Fecha / Hora</th>
                                <th className="p-6">Medios / Cliente</th>
                                <th className="p-6">Detalle Ítems</th>
                                <th className="p-6 text-right pr-10">Total Venta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map(t => {
                                const isWeb = t.orderOrigin?.toUpperCase() === 'WEB';
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-6 pl-10">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isWeb ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                {isWeb ? <Globe className="w-3 h-3"/> : <ShoppingCart className="w-3 h-3"/>}
                                                {isWeb ? 'WEB' : 'POS'}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-slate-800 text-xs">{new Date(t.date).toLocaleDateString()}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {t.payments && t.payments.length > 0 ? t.payments.map((p, i) => (
                                                        <span key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border
                                                            ${p.method === 'cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                            p.method === 'yape' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}
                                                        `}>
                                                            {p.method}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">{t.paymentMethod}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
                                                    {t.customerName || 'Venta Local'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-[11px] text-slate-600 font-bold uppercase tracking-tight max-w-xs truncate">
                                                {t.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right pr-10">
                                            <div className="flex flex-col items-end">
                                                <span className="text-lg font-black text-slate-900 tracking-tighter">
                                                    {settings.currency}{(t.total || 0).toFixed(2)}
                                                </span>
                                                <span className="text-[9px] text-slate-300 font-mono font-bold tracking-widest uppercase">#{t.id.slice(-6)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-24 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <FileSpreadsheet className="w-10 h-10 text-slate-200"/>
                                        </div>
                                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Sin registros para esta selección</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
