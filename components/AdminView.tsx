import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Transaction, Product, CashShift, CashMovement, StoreSettings } from '../types';
import { TrendingUp, DollarSign, Package, Users } from 'lucide-react';

interface AdminViewProps {
    transactions?: Transaction[];
    products?: Product[];
    shifts?: CashShift[];
    movements?: CashMovement[];
    settings?: StoreSettings;
}

export const AdminView: React.FC<AdminViewProps> = ({ transactions = [], products = [], shifts = [], settings }) => {
    const totalSales = transactions.reduce((acc, t) => acc + t.total, 0);
    const avgTicket = transactions.length > 0 ? totalSales / transactions.length : 0;
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const chartData = transactions.slice(0, 50).map(t => ({ time: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), total: t.total })).reverse();
    const brandColor = settings?.themeColor || '#e11d48';

    return (
        <div className="p-8 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Dashboard</h1>
                        <p className="text-slate-500 font-medium">Panel de Control POS Cloud</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-brand transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-brand-soft rounded-2xl text-brand"><DollarSign className="w-6 h-6"/></div>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+12%</span>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Ventas Totales</p>
                            <h3 className="text-3xl font-black text-slate-800">{settings?.currency || '$'}{totalSales.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-brand transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-brand-soft rounded-2xl text-brand"><TrendingUp className="w-6 h-6"/></div>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Ticket Promedio</p>
                            <h3 className="text-3xl font-black text-slate-800">{settings?.currency || '$'}{avgTicket.toFixed(2)}</h3>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-xl text-slate-800 mb-6">Ventas Recientes</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: 'var(--brand-soft)'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                                    <Bar dataKey="total" fill={brandColor} radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};