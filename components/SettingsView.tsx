import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { THEME_COLORS } from '../constants';
import { Save, Store, Receipt, Coins, Image as ImageIcon, Palette, Check, Upload, Trash2, Link as LinkIcon, Globe } from 'lucide-react';

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

    const brandColor = formData.themeColor || '#e11d48';

    return (
        <div className="p-4 md:p-8 h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">Configuración</h1>
                        <p className="text-sm md:text-base text-slate-500 font-medium">Personaliza la identidad y datos de tu negocio</p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        className={`w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 text-white ${saved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-black hover:scale-105'}`}
                        style={!saved ? { backgroundColor: brandColor } : {}}
                    >
                        {saved ? '¡Guardado con Éxito!' : <><Save className="w-5 h-5"/> Guardar Cambios</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:gap-8">
                    
                    {/* Visual Identity Section */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2.5 md:p-3 rounded-xl md:rounded-2xl" style={{ backgroundColor: `${brandColor}11`, color: brandColor }}><Palette className="w-5 h-5 md:w-6 md:h-6"/></div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800">Identidad Visual</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                            {/* Logo Section */}
                            <div className="space-y-6">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Logo del Negocio</label>
                                
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 group relative cursor-pointer shrink-0"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {formData.logo ? (
                                                <>
                                                    <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload className="text-white w-5 h-5 md:w-6 md:h-6" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-2 text-slate-300">
                                                    <ImageIcon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1" />
                                                    <span className="text-[9px] md:text-[10px] font-bold uppercase">SUBIR</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-slate-600 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" /> Seleccionar Archivo
                                            </button>
                                            {formData.logo && (
                                                <button 
                                                    onClick={() => handleChange('logo', '')}
                                                    className="w-full px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar Logo
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">O usar URL externa</span>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-600 outline-none focus:border-brand focus:bg-white transition-all text-xs md:text-sm"
                                            placeholder="https://i.postimg.cc/..."
                                            value={formData.logo || ''}
                                            onChange={(e) => handleChange('logo', e.target.value)}
                                        />
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </div>
                            </div>

                            {/* Colors Section */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Color Principal</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-2 md:gap-3">
                                        {THEME_COLORS.map((color) => (
                                            <button
                                                key={color.hex}
                                                onClick={() => handleChange('themeColor', color.hex)}
                                                className={`h-10 md:h-12 rounded-lg md:rounded-2xl transition-all relative flex items-center justify-center border-2 md:border-4 ${formData.themeColor === color.hex ? 'border-white ring-2 ring-slate-200 scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                                style={{ backgroundColor: color.hex }}
                                                title={color.name}
                                            >
                                                {formData.themeColor === color.hex && <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Color Secundario</label>
                                    <div className="flex gap-3 md:gap-4 items-center">
                                        <input 
                                            type="color" 
                                            className="w-10 h-10 md:w-14 md:h-14 p-1 rounded-lg md:rounded-xl cursor-pointer bg-white border border-slate-200"
                                            value={formData.secondaryColor || '#f97316'}
                                            onChange={(e) => handleChange('secondaryColor', e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            className="flex-1 p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-mono text-[10px] md:text-xs font-bold outline-none uppercase"
                                            value={formData.secondaryColor || '#f97316'}
                                            onChange={(e) => handleChange('secondaryColor', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl text-slate-400"><Store className="w-5 h-5 md:w-6 md:h-6"/></div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800">Datos del Comercio</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre Comercial del POS</label>
                                <input 
                                    className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-800 outline-none focus:border-brand transition-all text-base md:text-lg"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dirección Fiscal / Sede</label>
                                    <input 
                                        className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-700 outline-none focus:border-brand transition-all text-xs md:text-sm"
                                        value={formData.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teléfono de Contacto</label>
                                    <input 
                                        className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-slate-700 outline-none focus:border-brand transition-all text-xs md:text-sm"
                                        value={formData.phone || ''}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Info */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                         <div className="flex items-center gap-3 mb-6 md:mb-8">
                            <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl text-slate-400"><Receipt className="w-5 h-5 md:w-6 md:h-6"/></div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800">Impuestos y Moneda</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                             <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Símbolo Monetario</label>
                                <div className="relative">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5"/>
                                    <input 
                                        className="w-full pl-10 md:pl-12 pr-4 p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all text-lg md:text-xl"
                                        value={formData.currency}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                    />
                                </div>
                                <p className="text-[9px] md:text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Ejemplo: S/, $, €, etc.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tasa de Impuesto (IGV/IVA)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all text-lg md:text-xl"
                                    value={formData.taxRate}
                                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                                />
                                <p className="text-[9px] md:text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Decimal: 0.18 equivale al 18%</p>
                            </div>
                            <div className="col-span-full">
                                <label className="flex items-center gap-4 p-4 md:p-6 border-2 border-slate-100 rounded-[1.5rem] md:rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all group">
                                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${formData.pricesIncludeTax ? 'bg-brand border-brand shadow-lg shadow-brand-soft' : 'border-slate-300'}`}>
                                        {formData.pricesIncludeTax && <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={formData.pricesIncludeTax} 
                                        onChange={(e) => handleChange('pricesIncludeTax', e.target.checked)} 
                                    /> 
                                    <div>
                                        <span className="font-black text-slate-800 block text-base md:text-lg">Los precios ya incluyen impuestos</span>
                                        <span className="text-[10px] md:text-xs text-slate-400 font-medium">Si esta opción está marcada, el sistema desglosará el impuesto del total.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};