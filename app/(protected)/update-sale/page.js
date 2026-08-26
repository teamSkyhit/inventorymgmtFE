'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Package, TrendingDown, AlertCircle } from 'lucide-react'
import { mockProducts } from '@/lib/mock-data'
import { toast } from 'sonner'

function UpdateSaleContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = searchParams.get('productId')
  
  const [product, setProduct] = useState(null)
  const [soldQuantity, setSoldQuantity] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (productId) {
      const foundProduct = mockProducts.find(p => p.id === productId)
      setProduct(foundProduct)
    }
  }, [productId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const qty = parseInt(soldQuantity)
    
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }
    
    if (qty > product.quantity) {
      toast.error(`Only ${product.quantity} units available in stock`)
      return
    }

    setIsSubmitting(true)

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(`Successfully updated! ${qty} units sold.`)
      
      // Reset and go back to scan
      setTimeout(() => {
        router.push('/scan')
      }, 1500)
    } catch (error) {
      toast.error('Failed to update sale')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!product) {
    return (
      <ProtectedRoute allowedRoles={['user']}>
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Product Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Please scan a product first before updating sale.
                </p>
                <Button onClick={() => router.push('/scan')}>Go to Scanner</Button>
              </CardContent>
            </Card>
          </div>
      </ProtectedRoute>
    )
  }

  const newQuantity = product.quantity - parseInt(soldQuantity || 0)

  return (
    <ProtectedRoute allowedRoles={['user']}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Update for Sale</h1>
            <p className="text-muted-foreground">
              Enter the quantity sold to update inventory
            </p>
          </div>

          {/* Product Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{product.name}</h3>
                  <Badge className="mt-1">{product.category}</Badge>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Current Stock</p>
                  <p className="text-2xl font-bold">{product.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-2xl font-bold">₹{product.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shelf</p>
                  <p className="text-2xl font-bold">{product.shelf}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sale Form */}
          <Card>
            <CardHeader>
              <CardTitle>Enter Sale Information</CardTitle>
              <CardDescription>Specify how many units were sold</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Sold</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={product.quantity}
                    placeholder="Enter quantity"
                    value={soldQuantity}
                    onChange={(e) => setSoldQuantity(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: {product.quantity} units available
                  </p>
                </div>

                {soldQuantity && parseInt(soldQuantity) > 0 && parseInt(soldQuantity) <= product.quantity && (
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-medium">Sale Summary</span>
                    </div>
                    <Separator />
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Units Sold:</span>
                        <span className="font-medium">{soldQuantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sale Value:</span>
                        <span className="font-medium">₹{(product.price * parseInt(soldQuantity)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">New Stock Level:</span>
                        <span className="font-medium">{newQuantity} units</span>
                      </div>
                    </div>
                    {newQuantity < 10 && (
                      <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Low stock warning! Only {newQuantity} units will remain.</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || !soldQuantity}
                  >
                    {isSubmitting ? 'Updating...' : 'Confirm Update'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
    </ProtectedRoute>
  )
}

export default function UpdateSalePage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute allowedRoles={['user']}>
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Loading...</h3>
                </CardContent>
              </Card>
            </div>
        </ProtectedRoute>
      }
    >
      <UpdateSaleContent />
    </Suspense>
  )
}