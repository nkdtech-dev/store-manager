'use client'
import { X, Printer, Check } from 'lucide-react'

interface ReceiptItem {
  name: string
  code: string
  quantity: number
  unit_price: number
  discount: number
  subtotal: number
}

interface ReceiptProps {
  receiptNumber: string
  items: ReceiptItem[]
  total: number
  discount: number
  paymentMethod: string
  cashierName: string
  onClose: () => void
}

export default function Receipt({ receiptNumber, items, total, discount, paymentMethod, cashierName, onClose }: ReceiptProps) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm print:shadow-none print:rounded-none" id="receipt">
        {/* Header */}
        <div className="text-center p-6 border-b border-dashed border-slate-200">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">NDA Store</h2>
          <p className="text-slate-500 text-xs mt-1">Sale Receipt</p>
          <p className="font-mono text-sm font-bold text-blue-600 mt-2">{receiptNumber}</p>
          <p className="text-xs text-slate-400">{new Date().toLocaleString()}</p>
        </div>

        {/* Items */}
        <div className="p-4 border-b border-dashed border-slate-200 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium text-slate-700">{item.name}</p>
                <p className="text-xs text-slate-400">{item.code} × {item.quantity} @ {item.unit_price.toLocaleString('en')} FCFA
                  {item.discount > 0 && <span className="text-red-400 ml-1">-{item.discount.toLocaleString('en')} FCFA off</span>}
                </p>
              </div>
              <p className="font-semibold text-slate-800 ml-2">{item.subtotal.toLocaleString('en')}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="p-4 border-b border-dashed border-slate-200 space-y-1">
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="text-red-500">-{discount.toLocaleString('en')} FCFA</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-green-600">{total.toLocaleString('en')} FCFA</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Payment</span>
            <span className="capitalize font-medium">{paymentMethod}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-slate-400">Served by: <span className="font-medium text-slate-600">{cashierName}</span></p>
          <p className="text-xs text-slate-400 mt-1">Thank you for your purchase!</p>
        </div>

        {/* Actions — hidden on print */}
        <div className="flex gap-3 p-4 border-t border-slate-200 print:hidden">
          <button onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
