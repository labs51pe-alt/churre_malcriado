
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
  const NavItem = ({ view, icon: Icon, label, badge }: { view: ViewState; icon: any; label: string, badge?: number }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`group relative flex flex-col items-center justify-center p-2 lg:p-2.5 rounded-xl transition-all duration-300 w-full mb-2 lg:mb-3 ${
        currentView === view
          ? 'text-white shadow-lg'
          : 'bg-white text-slate-300 hover:bg-slate-50 hover:text-slate-500 border border-transparent'
      }`}
      style={currentView === view ? { backgroundColor: 'var(--brand-primary)', boxShadow: `0 8px 15px -4px var(--brand-medium)` } : {}}
    >
      <Icon className={`w-5 h-5 lg:w-5.5 lg:h-5.5 mb-1 transition-transform ${currentView === view ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="text-[7px] lg:text-[8.5px] font-bold uppercase tracking-[0.1em]">{label}</span>
      {badge ? (
          <span className="absolute top-1 right-1 bg-white text-brand text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md animate-pulse border border-brand/20">
              {badge}
          </span>
      ) : null}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden selection:bg-brand selection:text-white flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-white border border-slate-50">
            {settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand">
                <Rocket className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <span className="font-black text-slate-800 text-sm tracking-tight uppercase">Churre Malcriado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
            <User className="w-4 h-4"/>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-16 lg:w-20 bg-white border-r border-slate-100 flex-col items-center py-6 lg:py-8 z-20 shadow-xl shadow-slate-200/40 overflow-y-auto custom-scrollbar shrink-0">
        <div className="flex flex-col items-center mb-8 lg:mb-10">
            <div 
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:rotate-2 overflow-hidden bg-white border border-slate-50"
              style={{ boxShadow: `0 10px 15px -8px var(--brand-medium)` }}
            >
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand">
                  <Rocket className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                </div>
              )}
            </div>
        </div>

        <div className="flex-1 w-full px-2 lg:px-3 flex flex-col items-center">
          <NavItem view={ViewState.POS} icon={ShoppingCart} label="POS" />
          <NavItem view={ViewState.ONLINE_ORDERS} icon={Globe} label="WEB" />
          <NavItem view={ViewState.INVENTORY} icon={Archive} label="STOCK" />
          <NavItem view={ViewState.PURCHASES} icon={ShoppingBag} label="COMPRA" />
          {user.role === 'admin' && (
            <>
             <div className="h-px bg-slate-100 w-3/4 my-4"></div>
             <NavItem view={ViewState.REPORTS} icon={FileText} label="DATOS" />
             <NavItem view={ViewState.ADMIN} icon={BarChart2} label="PANEL" />
             <NavItem view={ViewState.SETTINGS} icon={Settings} label="AJUSTES" />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-5 lg:gap-6 px-2 lg:px-3 w-full shrink-0">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner" title={user.name}>
             <User className="w-4 h-4 lg:w-5 lg:h-5"/>
          </div>
          <button onClick={onLogout} className="p-2 lg:p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all w-full flex justify-center group" title="Cerrar">
            <LogOut className="w-5 h-5 lg:w-5.5 lg:h-5.5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-[#f8fafc] pb-16 md:pb-0">
          {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-1 flex items-center justify-around z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <MobileNavItem view={ViewState.POS} icon={ShoppingCart} label="POS" currentView={currentView} onChangeView={onChangeView} />
        <MobileNavItem view={ViewState.ONLINE_ORDERS} icon={Globe} label="WEB" currentView={currentView} onChangeView={onChangeView} />
        <MobileNavItem view={ViewState.INVENTORY} icon={Archive} label="STOCK" currentView={currentView} onChangeView={onChangeView} />
        <MobileNavItem view={ViewState.PURCHASES} icon={ShoppingBag} label="COMPRA" currentView={currentView} onChangeView={onChangeView} />
        {user.role === 'admin' && (
          <MobileNavItem view={ViewState.SETTINGS} icon={Settings} label="AJUSTES" currentView={currentView} onChangeView={onChangeView} />
        )}
      </div>
    </div>
  );
};

const MobileNavItem = ({ view, icon: Icon, label, currentView, onChangeView }: any) => (
  <button
    onClick={() => onChangeView(view)}
    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 flex-1 ${
      currentView === view ? 'text-brand' : 'text-slate-300'
    }`}
  >
    <Icon className={`w-5 h-5 mb-1 ${currentView === view ? 'scale-110' : ''}`} />
    <span className="text-[8px] font-bold uppercase tracking-wider">{label}</span>
    {currentView === view && (
      <div className="w-1 h-1 rounded-full bg-brand mt-1 animate-pulse"></div>
    )}
  </button>
);
