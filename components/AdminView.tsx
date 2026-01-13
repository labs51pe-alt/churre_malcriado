import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Transaction, Product, CashShift, CashMovement } from '../types';
import { TrendingUp, DollarSign, Package, Users } from 'lucide-react';

interface AdminViewProps {
    transactions?: Transaction[];
    products?: Product[];
    shifts?: CashShift[];
    movements?: CashMovement[];
}

export const AdminView: React.FC<AdminViewProps> = ({ transactions = [], products = [], shifts = [] }) => {
    
    // Calculate dashboard metrics
    const totalSales = transactions.reduce((acc, t) => acc + t.total, 0);
    const totalOrders = transactions.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const lowStockCount = products.filter(p => p.stock < 10).length;

    // Prepare chart data (Last 7 days mock or real aggregation)
    const chartData = transactions.slice(0, 50).map(t => ({
        time: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total: t.total
    })).reverse(); // Simple visualization of recent transactions

    return (
        <div className="p-8 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Dashboard</h1>
                        <p className="text-slate-500 font-medium">Resumen general del negocio</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    {/* TOTAL SALES - Primary Color (Indigo) */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-indigo-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><DollarSign className="w-6 h-6"/></div>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+12%</span>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Ventas Totales</p>
                            <h3 className="text-3xl font-black text-slate-800">${totalSales.toLocaleString()}</h3>
                        </div>
                    </div>

                    {/* TICKET AVERAGE - Secondary Color (Emerald) */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-emerald-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp className="w-6 h-6"/></div>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Ticket Promedio</p>
                            <h3 className="text-3xl font-black text-slate-800">${avgTicket.toFixed(2)}</h3>
                        </div>
                    </div>

                    {/* PRODUCTS - Accent Color (Pink/Rose for Alert, or Purple) */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-pink-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-pink-50 rounded-2xl text-pink-500"><Package className="w-6 h-6"/></div>
                            {lowStockCount > 0 && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">{lowStockCount} Alerta</span>}
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Productos</p>
                            <h3 className="text-3xl font-black text-slate-800">{products.length}</h3>
                        </div>
                    </div>

                    {/* SHIFTS - Neutral */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40">
                         <div className="flex justify-between items-start">
                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600"><Users className="w-6 h-6"/></div>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Turnos</p>
                            <h3 className="text-3xl font-black text-slate-800">{shifts.length}</h3>
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
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                                    />
                                    {/* Brand Color: Indigo */}
                                    <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                         <h3 className="font-bold text-xl text-slate-800 mb-6">Tendencia</h3>
                         <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                    {/* Brand Color: Emerald */}
                                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} />
                                </LineChart>
                            </ResponsiveContainer>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};