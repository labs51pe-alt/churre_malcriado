import React from 'react';
import { ViewState, StoreSettings, UserProfile } from '../types';
import { ShoppingCart, Archive, BarChart2, ShoppingBag, LogOut, User, FileText, Settings, Rocket, Globe } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  settings: StoreSettings;
  user: UserProfile;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, settings, user, onLogout, children }) => {
  const storeName = settings?.name || 'Churre POS';

  const NavItem = ({ view, icon: Icon, label, badge }: { view: ViewState; icon: any; label: string, badge?: number }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all duration-300 w-full mb-3 ${
        currentView === view
          ? 'text-white shadow-lg scale-105'
          : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 border border-transparent hover:border-slate-200'
      }`}
      style={currentView === view ? { backgroundColor: 'var(--brand-primary)', boxShadow: `0 10px 15px -3px var(--brand-medium)` } : {}}
    >
      <Icon className={`w-6 h-6 mb-1.5 transition-transform ${currentView === view ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      {badge ? (
          <span className="absolute top-1 right-1 bg-white text-brand text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse border border-brand/20">
              {badge}
          </span>
      ) : null}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <div className="w-24 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col items-center py-6 z-20 shadow-xl shadow-slate-200/50 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center mb-8">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:rotate-3 overflow-hidden bg-white"
              style={{ boxShadow: `0 8px 16px -4px var(--brand-medium)` }}
            >
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <span 
               className="text-[10px] font-black mt-2 tracking-tight text-center px-1 truncate w-full text-brand"
            >
              {storeName.split(' ')[0]}
            </span>
        </div>

        <div className="flex-1 w-full px-3 flex flex-col">
          <NavItem view={ViewState.POS} icon={ShoppingCart} label="Venta" />
          <NavItem view={ViewState.ONLINE_ORDERS} icon={Globe} label="Web" />
          <NavItem view={ViewState.INVENTORY} icon={Archive} label="Stock" />
          <NavItem view={ViewState.PURCHASES} icon={ShoppingBag} label="Compra" />
          {user.role === 'admin' && (
            <>
             <div className="h-px bg-slate-100 w-full my-3"></div>
             <NavItem view={ViewState.REPORTS} icon={FileText} label="Datos" />
             <NavItem view={ViewState.ADMIN} icon={BarChart2} label="Admin" />
             <NavItem view={ViewState.SETTINGS} icon={Settings} label="Config" />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 px-3 w-full shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:border-slate-300 transition-colors" title={user.name}>
             <User className="w-5 h-5"/>
          </div>
          <button onClick={onLogout} className="p-3 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors w-full flex justify-center group" title="Cerrar Sesión">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col bg-[#f8fafc]">
          {children}
      </div>
    </div>
  );
};