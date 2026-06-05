'use client'
import { X, Package, ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import type { Product } from '@/types'

interface Props {
  product: Product | null
  similarProducts?: Product[]
  onClose: () => void
  onAddToSale?: (product: Product) => void
}

export default function ProductPopup({ product, similarProducts = [], onClose, onAddToSale }: Props) {
  if (!product) return null

  const isLowStock = product.stock_quantity <= product.min_stock_level
  const profit = product.selling_price - product.cost_price
  const margin = product.cost_price > 0 ? ((profit / product.cost_price) * 100).toFixed(1) : '0'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">{product.code}</span>
            <h2 className="text-xl font-bold text-slate-800 mt-1">{product.name}</h2>
            {product.category && (
              <span className="text-sm text-slate-500">{product.category.name}</span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} width={300} height={300} className="object-cover w-full h-full" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Package className="w-16 h-16 mb-2" />
                  <span className="text-sm">No image</span>
                </div>
              )}
            </div>

          </div>

          {/* Details */}
          <div className="space-y-4">
            {product.description && (
              <p className="text-sm text-slate-600">{product.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-green-600 font-medium mb-1">Selling Price</p>
                <p className="text-2xl font-bold text-green-700">
                  {product.selling_price.toLocaleString('en', { minimumFractionDigits: 0 })}
                  <span className="text-sm font-normal ml-1">FCFA</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium mb-1">Cost Price</p>
                <p className="text-2xl font-bold text-slate-700">
                  {product.cost_price.toLocaleString('en', { minimumFractionDigits: 0 })}
                  <span className="text-sm font-normal ml-1">FCFA</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl p-4 ${isLowStock ? 'bg-red-50' : 'bg-blue-50'}`}>
                <p className={`text-xs font-medium mb-1 ${isLowStock ? 'text-red-600' : 'text-blue-600'}`}>
                  {isLowStock ? '⚠ Low Stock' : 'In Stock'}
                </p>
                <p className={`text-2xl font-bold ${isLowStock ? 'text-red-700' : 'text-blue-700'}`}>
                  {product.stock_quantity}
                  <span className="text-sm font-normal ml-1">{product.unit}</span>
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">Profit Margin</p>
                <p className="text-2xl font-bold text-purple-700">
                  {margin}%
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Unit</span>
                <span className="font-medium">{product.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Min. Stock Level</span>
                <span className="font-medium">{product.min_stock_level} {product.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Stock Value</span>
                <span className="font-medium">
                  {(product.stock_quantity * product.cost_price).toLocaleString('en')} FCFA
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Similar Products</h3>
            <div className="grid grid-cols-3 gap-3">
              {similarProducts.map(p => (
                <div key={p.id} className="border rounded-xl p-3 text-center hover:border-green-400 cursor-pointer transition-colors">
                  <div className="w-full aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.name} width={80} height={80} className="object-cover w-full h-full" />
                      : <Package className="w-8 h-8 text-slate-400" />
                    }
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                  <p className="text-xs text-green-600 font-semibold">{p.selling_price.toLocaleString('en')} FCFA</p>
                </div>
              ))}
            </div>
          </div>
        )}
      {/* Make a Sale — full width sticky footer */}
      {onAddToSale && (
        <div className="px-6 pb-6">
          <button
            onClick={() => { onAddToSale(product); onClose() }}
            disabled={product.stock_quantity === 0}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors text-base flex items-center justify-center gap-2 shadow-lg shadow-green-200"
          >
            <ShoppingCart className="w-5 h-5" />
            {product.stock_quantity === 0 ? 'Out of Stock — Cannot Sell' : 'Make a Sale'}
          </button>
        </div>
      )}
    </div>
  )
}
