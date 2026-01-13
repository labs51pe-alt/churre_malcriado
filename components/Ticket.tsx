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
            printWindow.document.write('<html><head><title>Imprimir Ticket</title><style>body { font-family: monospace; padding: 20px; text-align: center; } .left { text-align: left; } .right { text-align: right; } .flex { display: flex; justify-content: space-between; } hr { border: 0.5px dashed #000; margin: 10px 0; } .bold { font-weight: bold; } .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px; }</style></head><body>');
            printWindow.document.write(content);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-in-up">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <span className="font-bold flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400"/> {type === 'SALE' ? 'Venta Exitosa' : 'Corte de Caja'}</span>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-8 overflow-y-auto max-h-[60vh] bg-slate-50 flex justify-center">
                    <div ref={printRef} className="bg-white p-6 shadow-sm border border-slate-100 w-full text-xs font-mono leading-relaxed text-slate-800">
                        {/* Ticket Header */}
                        <div className="text-center mb-4 flex flex-col items-center">
                            {settings.logo && <img src={settings.logo} alt="Logo" className="logo" />}
                            <h2 className="text-lg font-bold uppercase">{settings.name}</h2>
                            <p>{settings.address}</p>
                            <p>Tel: {settings.phone}</p>
                            <p className="mt-2">{new Date(type === 'SALE' ? (data as Transaction).date : (data.shift as CashShift).endTime!).toLocaleString()}</p>
                        </div>
                        <hr className="border-dashed border-slate-300 my-4"/>
                        
                        {type === 'SALE' ? (
                            <>
                                <div className="space-y-2 mb-4">
                                    {(data as Transaction).items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div className="flex-1 left">
                                                <span>{item.name}</span>
                                                {item.selectedVariantName && <span className="block text-[10px] text-slate-500">({item.selectedVariantName})</span>}
                                            </div>
                                            <div className="right ml-4">
                                                <div>{item.quantity} x {settings.currency}{item.price.toFixed(2)}</div>
                                                <div className="bold">{settings.currency}{(item.quantity * item.price).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <hr className="border-dashed border-slate-300 my-4"/>
                                <div className="space-y-1 text-right">
                                    <div className="flex"><span>Subtotal</span><span>{settings.currency}{(data as Transaction).subtotal.toFixed(2)}</span></div>
                                    {(data as Transaction).discount > 0 && <div className="flex"><span>Descuento</span><span>-{settings.currency}{(data as Transaction).discount.toFixed(2)}</span></div>}
                                    <div className="flex bold text-lg mt-2"><span>Total</span><span>{settings.currency}{(data as Transaction).total.toFixed(2)}</span></div>
                                </div>
                                <hr className="border-dashed border-slate-300 my-4"/>
                                <div>
                                    <p className="bold mb-1 left">Pagado con:</p>
                                    {(data as Transaction).payments?.map((p, idx) => (
                                        <div key={idx} className="flex">
                                            <span>{getPaymentMethodLabel(p.method)}</span>
                                            <span>{settings.currency}{p.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center bold mb-4">REPORTE DE TURNO</div>
                                <div className="flex mb-2"><span>Inicio:</span><span>{new Date(data.shift.startTime).toLocaleTimeString()}</span></div>
                                <div className="flex mb-2"><span>Fin:</span><span>{new Date(data.shift.endTime).toLocaleTimeString()}</span></div>
                                <hr className="border-dashed border-slate-300 my-4"/>
                                <div className="space-y-2">
                                    <div className="flex bold"><span>Fondo Inicial</span><span>{settings.currency}{data.shift.startAmount.toFixed(2)}</span></div>
                                    <div className="flex"><span>Ventas Efectivo</span>
                                        <span>{settings.currency}{data.transactions.reduce((acc: number, t: Transaction) => acc + (t.payments?.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0) || 0), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex"><span>Ventas Digitales</span>
                                        <span>{settings.currency}{data.transactions.reduce((acc: number, t: Transaction) => acc + (t.payments?.filter(p => p.method !== 'cash').reduce((sum, p) => sum + p.amount, 0) || 0), 0).toFixed(2)}</span>
                                    </div>
                                    <hr className="border-dashed border-slate-300 my-2"/>
                                    <div className="flex bold text-lg"><span>Total Caja Real</span><span>{settings.currency}{data.shift.endAmount?.toFixed(2)}</span></div>
                                </div>
                            </>
                        )}
                        
                        <div className="mt-6 text-center text-[10px] text-slate-400">
                            <p>¡Gracias por su preferencia!</p>
                            <p>Software POSGo!</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cerrar</button>
                    <button onClick={handlePrint} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"><Printer className="w-4 h-4"/> Imprimir</button>
                </div>
            </div>
        </div>
    );
};