'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, CreditCard, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import AdminLayout from '@/components/admin-layout'
import UserLayout from '@/components/user-layout'
import { salesAPI } from '@/lib/api'
import logger from '@/lib/logger'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, getCartTotal, clearCart } = useCart()
  const { user } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const subtotal = getCartTotal()
  const tax = subtotal * 0.1
  const total = subtotal + tax

  const handlePayment = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name')
      return
    }

    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!user?.token) {
      toast.error('You must be logged in')
      router.push('/login')
      return
    }

    setIsProcessing(true)

    try {
      const saleResults = []
      for (const item of cart) {
        try {
          const response = await salesAPI.create(
            { productId: item.id, quantity: item.quantity },
            user.token
          )
          if (response.success) {
            saleResults.push(response.data?.sale || response.data)
          } else {
            throw new Error(response.message || 'Failed to record sale')
          }
        } catch (err) {
          logger.error('Sale creation failed:', err)
          throw err
        }
      }

      const receiptId = `RCP-${Date.now()}`
      const receipt = {
        id: receiptId,
        date: new Date().toISOString(),
        customerName,
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod,
        processedBy: user?.email,
        sales: saleResults,
      }

      localStorage.setItem('lastReceipt', JSON.stringify(receipt))

      // Clear cart
      clearCart()

      toast.success('Payment successful!')
      router.push(`/receipts?highlight=${receiptId}`)
    } catch (error) {
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const Layout = user?.role === 'admin' ? AdminLayout : UserLayout

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">Complete your purchase</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.price.toFixed(2)} × {item.quantity}</p>
                        <p className="text-sm font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {['cash', 'card', 'upi'].map((method) => (
                    <Button
                      key={method}
                      variant={paymentMethod === method ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod(method)}
                      className="h-20 flex flex-col gap-2"
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="capitalize">{method}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (10%)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Payment Method:
                  </div>
                  <Badge variant="secondary" className="text-sm capitalize">
                    {paymentMethod}
                  </Badge>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={isProcessing || cart.length === 0}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Inventory will be updated after payment confirmation
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}