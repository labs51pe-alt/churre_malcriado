import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { THEME_COLORS } from '../constants';
import { Save, Store, Receipt, Coins, Image as ImageIcon, Palette, Check, Upload, Trash2 } from 'lucide-react';

interface SettingsViewProps {
    settings: StoreSettings;
    onSaveSettings: (newSettings: StoreSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
    const [formData, setFormData] = useState<StoreSettings>(settings);
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (field: keyof StoreSettings, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        onSaveSettings(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('logo', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const brandColor = formData.themeColor || '#4f46e5';

    return (
        <div className="p-8 h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Configuración</h1>
                        <p className="text-slate-500 font-medium">Personaliza la identidad y datos de tu negocio</p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        className={`px-8 py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center gap-3 text-white ${saved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-black hover:scale-105'}`}
                        style={!saved && formData.themeColor ? { backgroundColor: formData.themeColor } : {}}
                    >
                        {saved ? '¡Guardado!' : <><Save className="w-5 h-5"/> Guardar Cambios</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    
                    {/* Visual Identity Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600" style={{ backgroundColor: `${brandColor}11`, color: brandColor }}><Palette className="w-6 h-6"/></div>
                            <h2 className="text-xl font-bold text-slate-800">Identidad Visual</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Logo del Negocio</label>
                                <div className="flex items-center gap-6">
                                    <div 
                                        className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 group relative cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {formData.logo ? (
                                            <>
                                                <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="text-white w-6 h-6" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-2">
                                                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                                                <span className="text-[10px] font-bold text-slate-400">SUBIR</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors flex items-center gap-2"
                                        >
                                            <Upload className="w-3.5 h-3.5" /> Cambiar Imagen
                                        </button>
                                        {formData.logo && (
                                            <button 
                                                onClick={() => handleChange('logo', undefined)}
                                                className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-500 transition-colors flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Quitar Logo
                                            </button>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 font-medium">Recomendado: Imagen cuadrada, fondo transparente.</p>
                            </div>

                            {/* Color Palette */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Color de Marca</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {THEME_COLORS.map((color) => (
                                        <button
                                            key={color.hex}
                                            onClick={() => handleChange('themeColor', color.hex)}
                                            className={`h-12 rounded-2xl transition-all relative flex items-center justify-center border-4 ${formData.themeColor === color.hex ? 'border-white ring-2 ring-slate-200 scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                            style={{ backgroundColor: color.hex }}
                                            title={color.name}
                                        >
                                            {formData.themeColor === color.hex && <Check className="w-5 h-5 text-white" />}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-6 font-medium">Este color se aplicará a botones, iconos activos y estados del sistema.</p>
                            </div>
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><Store className="w-6 h-6"/></div>
                            <h2 className="text-xl font-bold text-slate-800">Datos del Comercio</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre Comercial</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-slate-800 transition-colors"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dirección Fiscal</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-slate-800 transition-colors"
                                        value={formData.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teléfono de Contacto</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-slate-800 transition-colors"
                                        value={formData.phone || ''}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Info */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><Receipt className="w-6 h-6"/></div>
                            <h2 className="text-xl font-bold text-slate-800">Impuestos y Moneda</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Símbolo Monetario</label>
                                <div className="relative">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                                    <input 
                                        className="w-full pl-12 pr-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-slate-800 transition-colors"
                                        value={formData.currency}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tasa de Impuesto (IGV/IVA)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-slate-800 transition-colors"
                                    value={formData.taxRate}
                                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                                />
                                <p className="text-xs text-slate-400 mt-2 font-medium">Decimal: 0.18 = 18%</p>
                            </div>
                            <div className="col-span-full">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${formData.pricesIncludeTax ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                        {formData.pricesIncludeTax && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={formData.pricesIncludeTax} 
                                        onChange={(e) => handleChange('pricesIncludeTax', e.target.checked)} 
                                    /> 
                                    <span className="font-bold text-slate-700">Precios ya incluyen impuestos</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};