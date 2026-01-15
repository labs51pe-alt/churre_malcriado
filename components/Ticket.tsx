
import React, { useRef } from 'react';
import { Transaction, StoreSettings, CashShift, CashMovement } from '../types';
import { Printer, X, CheckCircle } from 'lucide-react';

interface TicketProps {
    type: 'SALE' | 'REPORT';
    data: any;
    settings: StoreSettings;
    onClose: () => void;
}

export const Ticket: React.FC<TicketProps> = ({ type, data, settings, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        const printWindow = window.open('', '', 'height=600,width=400');
        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir Ticket</title>
                        <style>
                            @page { margin: 0; size: 80mm 200mm; }
                            body { 
                                font-family: 'Courier New', Courier, monospace; 
                                width: 72mm; 
                                margin: 0; 
                                padding: 2mm 4mm;
                                font-size: 13px;
                                color: #000;
                                background-color: #fff;
                            }
                            .text-center { text-align: center; }
                            .text-right { text-align: right; }
                            .flex { display: flex; justify-content: space-between; }
                            .bold { font-weight: bold; }
                            .uppercase { text-transform: uppercase; }
                            hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
                            .logo { width: 45mm; height: auto; display: block; margin: 0 auto 8px; filter: grayscale(1); }
                            .item-row { margin-bottom: 5px; }
                            .small { font-size: 10px; }
                            .ticket-divider { border-bottom: 1px solid #000; margin: 4px 0; }
                        </style>
                    </head>
                    <body onload="window.print(); window.close();">
                        ${content}
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch(method) {
            case 'cash': return 'Efectivo';
            case 'card': return 'Tarjeta';
            case 'yape': return 'Yape';
            case 'plin': return 'Plin';
            case 'mixed': return 'Mixto';
            default: return method;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg h-[92vh] flex flex-col overflow-hidden animate-fade-in-up border border-white/20">
                {/* Header Modal */}
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-400"/>
                        </div>
                        <div>
                            <span className="font-black text-lg block leading-none">Venta Confirmada</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vista Previa 80mm</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-3 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                </div>
                
                {/* Preview Container */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-200 flex justify-center custom-scrollbar">
                    {/* El Ticket Físico (Simulado 80mm) */}
                    <div 
                        ref={printRef} 
                        className="bg-white w-[300px] p-6 shadow-2xl text-[12px] font-mono leading-tight text-black flex flex-col h-fit mb-12 border-b-8 border-slate-300/30"
                        style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.15)' }}
                    >
                        {/* Logo y Datos */}
                        <div className="text-center mb-5">
                            {settings.logo && (
                                <img src={settings.logo} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-3 filter grayscale" />
                            )}
                            <h2 className="text-base font-black uppercase tracking-tight leading-none mb-1">{settings.name}</h2>
                            <p className="text-[10px] uppercase leading-tight mb-1 opacity-80">{settings.address}</p>
                            <p className="text-[10px] uppercase leading-tight font-bold">RUC: 10456789123</p>
                            <p className="text-[10px] uppercase leading-tight">Tel: {settings.phone}</p>
                            
                            <div className="mt-4 border-2 border-black py-1.5 px-3 inline-block">
                                <p className="text-[11px] font-black uppercase">
                                    {new Date(type === 'SALE' ? (data as Transaction).date : (data.shift as CashShift).endTime!).toLocaleString('es-PE')}
                                </p>
                            </div>
                        </div>

                        <hr className="border-dashed border-black my-4"/>
                        
                        {type === 'SALE' ? (
                            <>
                                {/* Cabecera de Ítems */}
                                <div className="flex justify-between font-black text-[10px] mb-2 px-1">
                                    <span className="flex-1">DESCRIPCIÓN</span>
                                    <span className="w-20 text-right">TOTAL</span>
                                </div>
                                <div className="border-b border-black mb-2"></div>

                                {/* Items */}
                                <div className="space-y-3 mb-4">
                                    {(data as Transaction).items.map((item, idx) => (
                                        <div key={idx} className="flex flex-col">
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="flex-1 font-bold uppercase text-[12px]">{item.name}</span>
                                                <span className="shrink-0 font-black text-sm">{settings.currency}{(item.quantity * (item.price || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-medium italic opacity-70">
                                                <span>{item.quantity} Uni. x {settings.currency}{(item.price || 0).toFixed(2)}</span>
                                                {item.selectedVariantName && <span>[{item.selectedVariantName}]</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <hr className="border-dashed border-black my-4"/>

                                {/* Totales */}
                                <div className="space-y-1.5 px-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span>SUBTOTAL</span>
                                        <span className="font-bold">{settings.currency}{(Number(data.subtotal) || 0).toFixed(2)}</span>
                                    </div>
                                    {(Number(data.discount) || 0) > 0 && (
                                        <div className="flex justify-between font-bold text-[11px]">
                                            <span>DESCUENTO</span>
                                            <span>-{settings.currency}{(Number(data.discount) || 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-black pt-2 mt-2"></div>
                                    <div className="flex justify-between text-lg font-black tracking-tighter">
                                        <span>TOTAL A PAGAR</span>
                                        <span>{settings.currency}{(Number(data.total) || 0).toFixed(2)}</span>
                                    </div>
                                </div>

                                <hr className="border-dashed border-black my-4"/>

                                {/* Pago */}
                                <div className="bg-slate-50 p-2 rounded border border-black/10">
                                    <p className="font-black text-[10px] mb-2 uppercase tracking-widest border-b border-black/10 pb-1">Medios de Pago:</p>
                                    {(data as Transaction).payments?.map((p, idx) => (
                                        <div key={idx} className="flex justify-between py-0.5 font-bold">
                                            <span className="uppercase">{getPaymentMethodLabel(p.method)}</span>
                                            <span>{settings.currency}{(p.amount || 0).toFixed(2)}</span>
                                        </div>
                                    )) || (
                                        <div className="flex justify-between font-bold">
                                            <span className="uppercase">{getPaymentMethodLabel(data.paymentMethod)}</span>
                                            <span>{settings.currency}{(data.total || 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center font-black mb-4 text-[13px] border-2 border-black py-1.5 uppercase tracking-tighter">CIERRE DE CAJA DIARIO</div>
                                <div className="space-y-1 text-[11px]">
                                    <div className="flex justify-between"><span>APERTURA:</span><span className="font-black">{new Date(data.shift.startTime).toLocaleTimeString()}</span></div>
                                    <div className="flex justify-between"><span>CIERRE:</span><span className="font-black">{new Date(data.shift.endTime).toLocaleTimeString()}</span></div>
                                </div>
                                <hr className="border-dashed border-black my-4"/>
                                <div className="space-y-2">
                                    <div className="flex justify-between font-bold text-[12px]"><span>(+) FONDO INICIAL</span><span>{settings.currency}{(data.shift.startAmount || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between text-[11px]"><span>(+) VENTAS EFECTIVO</span>
                                        <span className="font-bold">{settings.currency}{data.transactions.reduce((acc: number, t: Transaction) => acc + (t.payments?.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0) || (t.paymentMethod === 'cash' ? t.total : 0)), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]"><span>(+) VENTAS DIGITALES</span>
                                        <span className="font-bold">{settings.currency}{data.transactions.reduce((acc: number, t: Transaction) => acc + (t.payments?.filter(p => p.method !== 'cash').reduce((sum, p) => sum + (p.amount || 0), 0) || (t.paymentMethod !== 'cash' ? t.total : 0)), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="border-t-2 border-black pt-2 mt-2"></div>
                                    <div className="flex justify-between font-black text-base uppercase tracking-tighter">
                                        <span>TOTAL EN CAJA</span>
                                        <span>{settings.currency}{(data.shift.endAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <div className="mt-10 text-center">
                            <p className="font-black text-[11px] mb-1">¡GRACIAS POR TU PREFERENCIA!</p>
                            <p className="text-[10px] opacity-70 italic">CHURRE POS CLOUD v2.6.26</p>
                            <p className="text-[9px] mt-4 font-bold tracking-widest opacity-30">********************************</p>
                            <div className="mt-2 flex justify-center items-center gap-1 opacity-10">
                                {[...Array(15)].map((_, i) => <div key={i} className="w-1.5 h-6 bg-black"></div>)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="p-8 bg-white border-t border-slate-100 flex gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <button onClick={onClose} className="flex-1 py-5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest text-[11px] border-2 border-slate-100">Cerrar</button>
                    <button onClick={handlePrint} className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[12px] shadow-2xl shadow-slate-200">
                        <Printer className="w-6 h-6 text-emerald-400"/> Imprimir Ticket (80mm)
                    </button>
                </div>
            </div>
        </div>
    );
};
