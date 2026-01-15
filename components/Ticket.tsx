
import React, { useRef, useState } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { Printer, X, CheckCircle, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface TicketProps {
    type: 'SALE' | 'REPORT';
    data: any;
    settings: StoreSettings;
    onClose: () => void;
}

export const Ticket: React.FC<TicketProps> = ({ type, data, settings, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

    const handleDownloadPDF = async () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF({
                unit: 'mm',
                format: [80, 200],
                orientation: 'portrait'
            });

            let y = 10;
            const margin = 5;
            const width = 70;

            // Header
            doc.setFont('courier', 'bold');
            doc.setFontSize(12);
            doc.text(settings.name.toUpperCase(), 40, y, { align: 'center' });
            
            y += 5;
            doc.setFontSize(8);
            doc.setFont('courier', 'normal');
            doc.text(settings.address || '', 40, y, { align: 'center', maxWidth: width });
            
            y += 8;
            doc.text(`RUC: 10456789123`, 40, y, { align: 'center' });
            y += 4;
            doc.text(`TEL: ${settings.phone || ''}`, 40, y, { align: 'center' });

            y += 8;
            doc.setLineDashPattern([1, 1], 0);
            doc.line(margin, y, margin + width, y);
            y += 5;

            if (type === 'SALE') {
                const t = data as Transaction;
                doc.text(`FECHA: ${new Date(t.date).toLocaleString()}`, margin, y);
                y += 5;
                doc.text(`TICKET: ${t.id}`, margin, y);
                y += 8;

                doc.setFont('courier', 'bold');
                doc.text('DESCRIPCION', margin, y);
                doc.text('TOTAL', margin + width, y, { align: 'right' });
                y += 4;
                doc.line(margin, y, margin + width, y);
                y += 6;

                doc.setFont('courier', 'normal');
                t.items.forEach(item => {
                    doc.text(`${item.quantity}x ${item.name.substring(0, 20)}`, margin, y);
                    doc.text(`${settings.currency}${(item.price * item.quantity).toFixed(2)}`, margin + width, y, { align: 'right' });
                    y += 5;
                    if (item.selectedVariantName) {
                        doc.setFontSize(7);
                        doc.text(`  [${item.selectedVariantName}]`, margin, y);
                        y += 4;
                        doc.setFontSize(8);
                    }
                });

                y += 5;
                doc.line(margin, y, margin + width, y);
                y += 6;

                doc.text('SUBTOTAL', margin, y);
                doc.text(`${settings.currency}${Number(t.subtotal).toFixed(2)}`, margin + width, y, { align: 'right' });
                y += 5;
                
                if (Number(t.discount) > 0) {
                    doc.text('DESCUENTO', margin, y);
                    doc.text(`-${settings.currency}${Number(t.discount).toFixed(2)}`, margin + width, y, { align: 'right' });
                    y += 5;
                }

                doc.setFontSize(10);
                doc.setFont('courier', 'bold');
                doc.text('TOTAL A PAGAR', margin, y);
                doc.text(`${settings.currency}${Number(t.total).toFixed(2)}`, margin + width, y, { align: 'right' });
                
                y += 10;
                doc.setFontSize(8);
                doc.text('MEDIOS DE PAGO:', margin, y);
                y += 5;
                doc.setFont('courier', 'normal');
                
                if (t.payments && t.payments.length > 0) {
                    t.payments.forEach(p => {
                        doc.text(`- ${p.method.toUpperCase()}`, margin, y);
                        doc.text(`${settings.currency}${p.amount.toFixed(2)}`, margin + width, y, { align: 'right' });
                        y += 4;
                    });
                } else {
                    doc.text(`- ${t.paymentMethod.toUpperCase()}`, margin, y);
                    doc.text(`${settings.currency}${t.total.toFixed(2)}`, margin + width, y, { align: 'right' });
                    y += 4;
                }
            } else {
                doc.setFont('courier', 'bold');
                doc.text('CIERRE DE CAJA', 40, y, { align: 'center' });
                y += 10;
                doc.setFont('courier', 'normal');
                doc.text(`INICIO: ${new Date(data.shift.startTime).toLocaleString()}`, margin, y);
                y += 5;
                doc.text(`CIERRE: ${new Date(data.shift.endTime).toLocaleString()}`, margin, y);
                y += 8;
                doc.text(`TOTAL EN CAJA: ${settings.currency}${data.shift.endAmount.toFixed(2)}`, margin, y);
            }

            y += 15;
            doc.setFont('courier', 'bold');
            doc.text('¡GRACIAS POR TU COMPRA!', 40, y, { align: 'center' });
            y += 5;
            doc.setFontSize(6);
            doc.text('CHURRE POS CLOUD v14', 40, y, { align: 'center' });

            doc.save(`Ticket_${type}_${Date.now()}.pdf`);
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("No se pudo generar el PDF.");
        } finally {
            setIsGeneratingPdf(false);
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
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-400"/>
                        </div>
                        <div>
                            <span className="font-black text-lg block leading-none">Comprobante de Venta</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital & Térmico</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-3 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 bg-slate-200 flex justify-center custom-scrollbar">
                    <div 
                        ref={printRef} 
                        className="bg-white w-[300px] p-6 shadow-2xl text-[12px] font-mono leading-tight text-black flex flex-col h-fit mb-12 border-b-8 border-slate-300/30"
                    >
                        <div className="text-center mb-5">
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
                                <div className="flex justify-between font-black text-[10px] mb-2 px-1">
                                    <span className="flex-1">DESCRIPCIÓN</span>
                                    <span className="w-20 text-right">TOTAL</span>
                                </div>
                                <div className="border-b border-black mb-2"></div>

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

                                <div className="bg-slate-50 p-2 rounded border border-black/10">
                                    <p className="font-black text-[10px] mb-2 uppercase tracking-widest border-b border-black/10 pb-1">Pagado con:</p>
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
                            <div className="text-center font-black">REPORTE DE CIERRE</div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-3 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isGeneratingPdf}
                        className="flex-1 py-5 bg-indigo-50 text-indigo-700 rounded-2xl font-black hover:bg-indigo-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[11px] border-2 border-indigo-100 disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5"/>}
                        Descargar PDF
                    </button>
                    <button onClick={handlePrint} className="flex-[1.5] py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[12px] shadow-2xl shadow-slate-200">
                        <Printer className="w-6 h-6 text-brand"/> Imprimir Térmico
                    </button>
                </div>
            </div>
        </div>
    );
};
