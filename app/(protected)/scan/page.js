'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Scan, Camera, Keyboard, Package, MapPin, DollarSign, Hash } from 'lucide-react'
import { mockProducts } from '@/lib/mock-data'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatIndianCurrency } from '@/lib/utils'

export default function ScanPage() {
  const [scanMode, setScanMode] = useState('manual') // 'camera' or 'manual'
  const [barcode, setBarcode] = useState('')
  const [scannedProduct, setScannedProduct] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const router = useRouter()

  const handleScan = async () => {
    if (!barcode.trim()) {
      toast.error('Please enter a barcode')
      return
    }

    // Find product by barcode
    const product = mockProducts.find(p => p.barcode === barcode)
    
    if (product) {
      setScannedProduct(product)
      toast.success('Product found!')
    } else {
      toast.error('Product not found in inventory')
      setScannedProduct(null)
    }
  }

  const handleCameraScan = () => {
    setIsCameraActive(true)
    setScanMode('camera')
    // In a real implementation, this would activate the camera
    // For demo, we'll show a placeholder
    toast.info('Camera scanner is a demo feature. Use manual entry for testing.')
  }

  const handleUpdateForSale = () => {
    if (scannedProduct) {
      router.push(`/update-sale?productId=${scannedProduct.id}`)
    }
  }

  const handleRescan = () => {
    setBarcode('')
    setScannedProduct(null)
    setIsCameraActive(false)
    setScanMode('manual')
  }

  return (
    <ProtectedRoute allowedRoles={['user']}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Scan Product</h1>
            <p className="text-muted-foreground">
              Scan or enter a barcode to view product details
            </p>
          </div>

          {/* Scanner Options */}
          {!scannedProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Scan Method</CardTitle>
                <CardDescription>Select how you want to scan the product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={scanMode === 'camera' ? 'default' : 'outline'}
                    className="h-24 flex flex-col gap-2"
                    onClick={handleCameraScan}
                  >
                    <Camera className="h-8 w-8" />
                    <span>Camera Scanner</span>
                  </Button>
                  <Button
                    variant={scanMode === 'manual' ? 'default' : 'outline'}
                    className="h-24 flex flex-col gap-2"
                    onClick={() => {
                      setScanMode('manual')
                      setIsCameraActive(false)
                    }}
                  >
                    <Keyboard className="h-8 w-8" />
                    <span>Manual Entry</span>
                  </Button>
                </div>

                <Separator />

                {/* Camera Scanner View */}
                {isCameraActive && scanMode === 'camera' && (
                  <div className="space-y-4">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                      <div className="text-center space-y-2">
                        <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Camera Preview</p>
                        <p className="text-xs text-muted-foreground">
                          In production, this would show live camera feed
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setScanMode('manual')}
                    >
                      Switch to Manual Entry
                    </Button>
                  </div>
                )}

                {/* Manual Entry */}
                {scanMode === 'manual' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="barcode">Enter Barcode</Label>
                      <div className="flex gap-2">
                        <Input
                          id="barcode"
                          placeholder="123456789012"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                        />
                        <Button onClick={handleScan}>
                          <Scan className="h-4 w-4 mr-2" />
                          Scan
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Try: 123456789012, 987654321098, or 112233445566
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product Details */}
          {scannedProduct && (
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>Information about the scanned product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{scannedProduct.name}</h3>
                    <Badge className="mt-1">{scannedProduct.category}</Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span className="text-sm">Barcode</span>
                    </div>
                    <p className="font-mono font-medium">{scannedProduct.barcode}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="text-sm">Quantity</span>
                    </div>
                    <p className="font-medium">{scannedProduct.quantity} units</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Shelf Location</span>
                    </div>
                    <p className="font-medium">{scannedProduct.shelf}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Price</span>
                    </div>
                    <p className="font-medium">₹{formatIndianCurrency(scannedProduct.price, true)}</p>
                  </div>
                </div>

                {scannedProduct.description && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{scannedProduct.description}</p>
                  </div>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleUpdateForSale}>
                    Update for Sale
                  </Button>
                  <Button variant="outline" onClick={handleRescan}>
                    Rescan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
    </ProtectedRoute>
  )
}