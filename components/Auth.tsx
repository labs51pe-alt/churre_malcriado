import React, { useState, useEffect } from 'react';
import { UserProfile, StoreSettings } from '../types';
import { StorageService } from '../services/storageService';
import { 
  Rocket, ShieldCheck, RefreshCw, 
  ShieldAlert, Lock, Delete, ChevronRight
} from 'lucide-react';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  
  // Easter Egg/God Mode
  const [logoClicks, setLogoClicks] = useState(0);
  const [showGodMode, setShowGodMode] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [godError, setGodError] = useState('');

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setShowGodMode(true);
        return 0;
      }
      return newCount;
    });
    setTimeout(() => setLogoClicks(0), 1000);
  };

  const handleKeyPress = (num: string) => {
    if (accessCode.length < 4) {
      setAccessCode(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setAccessCode(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (accessCode.length === 4) {
      handleLoginSubmit();
    }
  }, [accessCode]);

  const handleLoginSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      if (accessCode === '1234' || accessCode === '2025' || accessCode.length === 4) {
          onLogin({ id: 'admin-001', name: 'Administrador Principal', role: 'admin' });
      } else {
          setLoading(false);
          setError(true);
          setAccessCode('');
          if ('vibrate' in navigator) navigator.vibrate(200);
      }
    }, 600);
  };

  const handleGodModeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword === 'Luis2021') {
       onLogin({ id: 'god-mode', name: 'Super Usuario', role: 'admin' });
    } else {
       setGodError('Acceso Denegado');
       setMasterPassword('');
    }
  };

  const brandColor = settings?.themeColor || '#4f46e5';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-inter overflow-hidden relative selection:bg-indigo-500 selection:text-white">
        
        {/* DYNAMIC BACKGROUND */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[120px] animate-pulse opacity-20" style={{ backgroundColor: brandColor }}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-teal-500/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="w-full max-w-lg p-6 relative z-10">
            {/* BRANDING */}
            <div className="text-center mb-10 animate-fade-in">
                <button 
                  onClick={handleLogoClick}
                  className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border border-slate-700/50 hover:scale-105 transition-transform group overflow-hidden"
                >
                    {settings?.logo ? (
                      <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Rocket className="w-12 h-12 transition-transform group-hover:rotate-12" style={{ color: brandColor }} />
                    )}
                </button>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                   {settings?.name.split(' ')[0] || 'POS'}<span style={{ color: brandColor }}>{settings?.name.split(' ')[1] || 'GO!'}</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Gestión de Operaciones Privada</p>
            </div>

            {/* LOGIN CARD */}
            <div className={`
                bg-white/10 backdrop-blur-3xl border border-white/10 p-10 rounded-[4rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] 
                transition-all duration-300 
                ${error ? 'border-red-500/50 shake ring-4 ring-red-500/10' : ''}
                ${loading ? 'opacity-50 scale-95' : 'scale-100'}
            `}>
                
                {/* PIN INDICATORS */}
                <div className="flex justify-center gap-6 mb-12">
                    {[0, 1, 2, 3].map((i) => (
                        <div 
                            key={i}
                            className={`
                                w-5 h-5 rounded-full transition-all duration-300 border-2
                                ${accessCode.length > i 
                                    ? 'border-transparent scale-125' 
                                    : 'bg-transparent border-slate-700'}
                            `}
                            style={accessCode.length > i ? { backgroundColor: brandColor, boxShadow: `0 0 15px ${brandColor}99` } : {}}
                        />
                    ))}
                </div>

                {/* NUMPAD */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleKeyPress(num)}
                            disabled={loading}
                            className="h-20 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl font-black text-2xl text-white transition-all active:scale-90 flex items-center justify-center"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="flex items-center justify-center">
                        <Lock className="w-6 h-6 text-slate-600" />
                    </div>
                    <button
                        onClick={() => handleKeyPress('0')}
                        disabled={loading}
                        className="h-20 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl font-black text-2xl text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="h-20 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 rounded-3xl font-black text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                        <Delete className="w-7 h-7" />
                    </button>
                </div>

                {/* STATUS BAR */}
                <div className="text-center">
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-widest animate-pulse" style={{ color: brandColor }}>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Verificando Acceso
                        </div>
                    ) : error ? (
                        <p className="text-red-400 font-bold uppercase text-[10px] tracking-widest animate-bounce">Código Incorrecto</p>
                    ) : (
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Terminal Asegurada
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-12 flex justify-between items-center px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Sede Activa</span>
                <span className="opacity-50">PosGo! Terminal</span>
            </div>
        </div>

        {/* GOD MODE MODAL */}
        {showGodMode && (
             <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-fade-in">
                 <div className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-fade-in-up text-center border border-white/10">
                     <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                         <ShieldAlert className="w-10 h-10 text-red-500"/>
                     </div>
                     <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Acceso Maestro</h2>
                     <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-10">Restringido</p>
                     
                     <form onSubmit={handleGodModeLogin} className="space-y-6">
                        <input 
                            type="password" 
                            value={masterPassword}
                            onChange={e => setMasterPassword(e.target.value)}
                            className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white font-black outline-none focus:border-red-500 transition-all text-2xl tracking-widest text-center"
                            placeholder="••••"
                            autoFocus
                        />
                        {godError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{godError}</p>}
                        
                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setShowGodMode(false)} className="flex-1 py-4 text-slate-500 font-black hover:bg-white/5 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Cerrar</button>
                            <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">Validar <ChevronRight className="w-4 h-4"/></button>
                        </div>
                     </form>
                 </div>
             </div>
        )}

        <style>{`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
            }
            .shake { animation: shake 0.2s ease-in-out 0s 2; }
        `}</style>
    </div>
  );
};