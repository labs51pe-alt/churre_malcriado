import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface OnboardingTourProps {
    isOpen: boolean;
    onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onComplete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-[3.5rem] p-10 lg:p-12 max-w-md text-center shadow-2xl relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-900"></div>
                
                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 rotate-6 shadow-xl shadow-indigo-100">
                    <Sparkles className="w-12 h-12" />
                </div>
                
                <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">¡Bienvenido al Panel!</h2>
                
                <p className="text-slate-500 text-lg leading-relaxed mb-10 font-medium">
                    Tu sistema de gestión está listo. Desde aquí podrás controlar tus ventas, monitorear el stock y revisar tus reportes financieros en tiempo real.
                </p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={onComplete} 
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-2 group shadow-xl"
                    >
                        Comenzar Ahora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest mt-2">
                        <ShieldCheck className="w-4 h-4" />
                        Sistema Configurado
                    </div>
                </div>
            </div>
        </div>
    );
};