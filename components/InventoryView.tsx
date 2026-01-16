
import React, { useState, useMemo, useRef } from 'react';
import { Product, StoreSettings, Transaction, Purchase } from '../types';
import { Search, Plus, Edit, Trash2, Tag, Archive, Eye, AlertTriangle, FileDown, FileUp, Flame, ArrowRight, History, Package, Box, RefreshCw, ImageIcon, X, Link as LinkIcon, Copy, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryProps {
    products: Product[];
    settings: StoreSettings;
    transactions: Transaction[];
    purchases?: Purchase[];
    onNewProduct: () => void;
    onEditProduct: (p: Product) => void;
    onDeleteProduct: (id: string) => void;
    onGoToPurchase?: (productName: string) => void;
}

export const InventoryView: React.FC<InventoryProps> = ({ 
    products, 
    settings, 
    transactions, 
    purchases = [], 
    onNewProduct, 
    onEditProduct, 
    onDeleteProduct,
    onGoToPurchase 
}) => {
    const [activeTab, setActiveTab] = useState<'ALL' | 'REPLENISH'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.barcode && p.barcode.includes(searchTerm))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);

    const replenishmentData = useMemo(() => {
        return products
            .filter(p => p.stock <= 5)
            .map(p => {
                const velocity = transactions.reduce((acc, t) => {
                    const item = t.items.find(i => i.id === p.id);
                    return acc + (item ? item.quantity : 0);
                }, 0);
                return { ...p, velocity };
            })
            .sort((a, b) => b.velocity - a.velocity);
    }, [products, transactions]);

    const getKardex = (productId: string) => {
        const sales = transactions.flatMap(t => 
            t.items.filter(i => i.id === productId).map(i => ({
                date: t.date,
                type: 'SALE',
                quantity: i.quantity,
                unitVal: i.price,
                doc: `Ticket #${t.id.slice(-4)}`
            }))
        );

        const entries = purchases.flatMap(p => 
            p.items.filter(i => i.productId === productId).map(i => ({
                date: p.date,
                type: 'PURCHASE',
                quantity: i.quantity,
                unitVal: i.cost,
                doc: 'Compra Prov.'
            }))
        );

        return [...sales, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const handleCopyUrl = (url: string, id: string) => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleExportExcel = () => {
        const data = products.map(p => ({
            ID: p.id,
            Nombre: p.name,
            Categoria: p.category,
            Precio: p.price,
            Stock: p.stock,
            Codigo: p.barcode || '',
            Variantes: p.hasVariants ? 'SI' : 'NO',
            ImagenURL: p.image || ''
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, "Inventario_Churre.xlsx");
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                    if (data.length > 0) alert(`Se detectaron ${data.length} productos.`);
                } catch (error) {
                    alert('Error al leer el archivo.');
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-[#f8fafc]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Centro de Stock</h1>
                    <p className="text-slate-500 font-medium text-sm">Gestiona tu inventario y URLs de imágenes</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
                    <button onClick={handleImportClick} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"><FileUp className="w-4 h-4"/> Importar</button>
                    <button onClick={handleExportExcel} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"><FileDown className="w-4 h-4"/> Exportar</button>
                    <button onClick={onNewProduct} className="px-6 py-2.5 bg-brand text-white rounded-xl font-bold shadow-lg shadow-brand-soft hover:opacity-90 transition-all flex items-center gap-2"><Plus className="w-5 h-5"/> Nuevo Producto</button>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <button onClick={() => setActiveTab('ALL')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all border-2 ${activeTab === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}>Todos los Productos</button>
                <button onClick={() => setActiveTab('REPLENISH')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all border-2 flex items-center gap-2 ${activeTab === 'REPLENISH' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}><AlertTriangle className={`w-4 h-4 ${activeTab === 'REPLENISH' ? 'animate-pulse' : ''}`}/> Reposición {replenishmentData.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{replenishmentData.length}</span>}</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'ALL' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 flex-1 flex flex-col shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                                <input className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-soft outline-none transition-all font-bold text-slate-700" placeholder="Buscar por nombre, código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="p-6">Producto</th>
                                        <th className="p-6">URL Foto</th>
                                        <th className="p-6 text-center">Stock</th>
                                        <th className="p-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 text-slate-400 font-bold text-lg group-hover:bg-brand-soft group-hover:text-brand transition-colors">
                                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm uppercase">{p.name}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{p.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {p.image ? (
                                                    <div className="flex items-center gap-2 group/url max-w-[200px]">
                                                        <LinkIcon className="w-3 h-3 text-slate-300"/>
                                                        <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{p.image}</span>
                                                        <button 
                                                            onClick={() => handleCopyUrl(p.image!, p.id)} 
                                                            className={`p-1.5 rounded-lg transition-all ${copiedId === p.id ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 hover:text-brand'}`}
                                                        >
                                                            {copiedId === p.id ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 italic">SIN IMAGEN</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border ${p.stock <= 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    <Box className="w-3.5 h-3.5"/> {p.stock}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setKardexProduct(p)} className="p-2 text-slate-400 hover:bg-brand-soft hover:text-brand rounded-xl transition-colors" title="Kardex"><Eye className="w-4 h-4"/></button>
                                                    <button onClick={() => onEditProduct(p)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors" title="Editar"><Edit className="w-4 h-4"/></button>
                                                    <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {kardexProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-fade-in-up overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><History className="w-6 h-6 text-brand"/> Kardex / Historial</h3>
                                <p className="text-slate-500 font-medium">{kardexProduct.name}</p>
                            </div>
                            <button onClick={() => setKardexProduct(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 sticky top-0">
                                    <tr>
                                        <th className="p-6">Fecha</th>
                                        <th className="p-6">Movimiento</th>
                                        <th className="p-6 text-center">Cant.</th>
                                        <th className="p-6 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {getKardex(kardexProduct.id).map((k, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-6"><p className="font-bold text-slate-700 text-sm">{new Date(k.date).toLocaleDateString()}</p></td>
                                            <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${k.type === 'SALE' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{k.type === 'SALE' ? 'Salida' : 'Entrada'}</span></td>
                                            <td className="p-6 text-center"><span className={`font-bold ${k.type === 'SALE' ? 'text-red-500' : 'text-emerald-500'}`}>{k.type === 'SALE' ? '-' : '+'}{k.quantity}</span></td>
                                            <td className="p-6 text-right font-medium text-slate-600">{settings.currency}{k.unitVal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
