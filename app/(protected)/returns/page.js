'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Search, RefreshCw, ArrowLeftRight, CheckCircle, XCircle, Package } from 'lucide-react'
import { toast } from 'sonner'
import { returnsAPI, productsAPI } from '@/lib/api'
import logger from '@/lib/logger'

const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export default function ReturnsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [searchReceipt, setSearchReceipt] = useState('')
  const [saleData, setSaleData] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returnForm, setReturnForm] = useState({
    reason: '',
    reasonDetails: '',
    isExchange: false,
    exchangeProductId: '',
    exchangeQuantity: '',
    notes: '',
  })
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStartDate, setFilterStartDate] = useState(thirtyDaysAgo)
  const [filterEndDate, setFilterEndDate] = useState(today)
  const [actionLoading, setActionLoading] = useState(false)

  const dateRangeValid = !(filterStartDate && filterEndDate && filterStartDate > filterEndDate)
  useEffect(() => {
    if (!dateRangeValid) toast.error('Start date cannot be after end date')
  }, [dateRangeValid])

  const returnsParams = { status: filterStatus, startDate: filterStartDate, endDate: filterEndDate }
  const { data: returns = [], isLoading: loading } = useQuery({
    queryKey: ['returns', returnsParams],
    queryFn: async () => {
      const params = {}
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterStartDate) params.startDate = filterStartDate
      if (filterEndDate) params.endDate = filterEndDate
      const response = await returnsAPI.getAll(user.token, params)
      if (!response.success) throw new Error(response.message || 'Failed to fetch returns')
      return response.data || []
    },
    enabled: !!user?.token && dateRangeValid,
  })

  const { data: exchangeProducts = [], refetch: refetchExchangeProducts } = useQuery({
    queryKey: ['products', 'exchange-list'],
    queryFn: async () => {
      const response = await productsAPI.getAll(user.token, { limit: 1000 })
      if (!response.success) throw new Error('Failed to load products')
      return response.data?.products || response.data || []
    },
    enabled: false,
    staleTime: Infinity,
  })

  // Search by receipt number
  const handleSearchReceipt = async () => {
    if (!searchReceipt.trim()) {
      toast.error('Please enter a receipt number')
      return
    }

    if (!user?.token) return

    setActionLoading(true)
    try {
      const response = await returnsAPI.searchByReceipt(searchReceipt.trim(), user.token)
      if (response.success) {
        setSaleData(response.data)
        if (!response.data.canReturn) {
          toast.warning('Return period expired. Returns are only allowed within 7 days of purchase.')
        }
      } else {
        toast.error(response.message || 'Sale not found')
        setSaleData(null)
      }
    } catch (error) {
      logger.error('Error searching receipt:', error)
      toast.error('Failed to search receipt')
      setSaleData(null)
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle item selection for return
  const toggleItemSelection = (item) => {
    if (!item.canReturn) {
      toast.warning('This item cannot be returned (already returned or period expired)')
      return
    }

    const existing = selectedItems.find((s) => s.saleId === item.id)
    if (existing) {
      setSelectedItems(selectedItems.filter((s) => s.saleId !== item.id))
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          saleId: item.id,
          quantity: item.remainingQuantity,
          productId: item.productId,
          product: item.product,
        },
      ])
    }
  }

  // Update return quantity
  const updateReturnQuantity = (saleId, quantity) => {
    const item = saleData?.items?.find((i) => i.id === saleId)
    if (!item) return

    const maxQty = item.remainingQuantity
    if (quantity > maxQty) {
      toast.warning(`Maximum ${maxQty} items can be returned`)
      quantity = maxQty
    }

    setSelectedItems(
      selectedItems.map((s) => (s.saleId === saleId ? { ...s, quantity: Math.max(1, quantity) } : s))
    )
  }

  // Open return modal
  const handleOpenReturnModal = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return')
      return
    }

    if (returnForm.isExchange) {
      refetchExchangeProducts()
    }
    setIsReturnModalOpen(true)
  }

  // Process return
  const handleProcessReturn = async () => {
    if (!user?.token) return

    if (!returnForm.reason) {
      toast.error('Please select a return reason')
      return
    }

    if (returnForm.isExchange && (!returnForm.exchangeProductId || !returnForm.exchangeQuantity)) {
      toast.error('Please select exchange product and quantity')
      return
    }

    setActionLoading(true)
    try {
      // Process each selected item
      const results = []
      for (const item of selectedItems) {
        const returnData = {
          saleId: item.saleId,
          quantity: item.quantity,
          reason: returnForm.reason,
          reasonDetails: returnForm.reasonDetails || undefined,
          isExchange: returnForm.isExchange,
          exchangeProductId: returnForm.isExchange ? returnForm.exchangeProductId : undefined,
          exchangeQuantity: returnForm.isExchange ? parseInt(returnForm.exchangeQuantity) : undefined,
          notes: returnForm.notes || undefined,
        }

        const response = await returnsAPI.create(returnData, user.token)
        if (response.success) {
          results.push(response.data)
        } else {
          throw new Error(response.message || 'Failed to process return')
        }
      }

      toast.success(`Successfully processed ${results.length} return(s)`)
      setIsReturnModalOpen(false)
      setSelectedItems([])
      setSaleData(null)
      setSearchReceipt('')
      setReturnForm({
        reason: '',
        reasonDetails: '',
        isExchange: false,
        exchangeProductId: '',
        exchangeQuantity: '',
        notes: '',
      })
      qc.invalidateQueries({ queryKey: ['returns'] })
    } catch (error) {
      logger.error('Error processing return:', error)
      toast.error(error.message || 'Failed to process return')
    } finally {
      setActionLoading(false)
    }
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Returns Management</h1>
            <p className="text-muted-foreground">Process returns and exchanges within 7 days</p>
          </div>
        </div>

        {/* Search Receipt */}
        <Card>
          <CardHeader>
            <CardTitle>Search Receipt for Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter receipt number (e.g., RCP-000001)"
                  value={searchReceipt}
                  onChange={(e) => setSearchReceipt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchReceipt()}
                />
              </div>
              <Button onClick={handleSearchReceipt} disabled={actionLoading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {saleData && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Receipt Number</p>
                      <p className="font-medium">{saleData.sale?.saleNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sale Date</p>
                      <p className="font-medium">{new Date(saleData.sale?.saleDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Since Purchase</p>
                      <p className="font-medium">{saleData.daysSincePurchase} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Can Return</p>
                      <Badge variant={saleData.canReturn ? 'default' : 'destructive'}>
                        {saleData.canReturn ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Select</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Returned</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleData.items?.map((item) => {
                        const isSelected = selectedItems.find((s) => s.saleId === item.id)
                        const selectedQty = isSelected?.quantity || 0
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => toggleItemSelection(item)}
                                disabled={!item.canReturn}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.product?.name}</TableCell>
                            <TableCell>{item.quantitySold}</TableCell>
                            <TableCell>{item.returnedQuantity || 0}</TableCell>
                            <TableCell>{item.remainingQuantity}</TableCell>
                            <TableCell>₹{Number(item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell>₹{Number(item.finalAmount).toFixed(2)}</TableCell>
                            <TableCell>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    max={item.remainingQuantity}
                                    value={selectedQty}
                                    onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 1)}
                                    className="w-20 h-8"
                                  />
                                </div>
                              )}
                              {!item.canReturn && (
                                <Badge variant="outline" className="text-xs">
                                  Cannot Return
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {selectedItems.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={handleOpenReturnModal} size="lg">
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Process Return ({selectedItems.length} item{selectedItems.length > 1 ? 's' : ''})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className={filterStartDate && filterEndDate && filterStartDate > filterEndDate ? 'border-destructive' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className={filterStartDate && filterEndDate && filterStartDate > filterEndDate ? 'border-destructive' : ''}
                />
                {filterStartDate && filterEndDate && filterStartDate > filterEndDate && (
                  <p className="text-xs text-destructive">End date must be after start date</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSED">Processed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => qc.invalidateQueries({ queryKey: ['returns'] })} disabled={loading} variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Returns List */}
        <Card>
          <CardHeader>
            <CardTitle>Returns History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : returns.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((returnItem) => (
                      <TableRow key={returnItem.id}>
                        <TableCell className="font-medium">{returnItem.returnNumber}</TableCell>
                        <TableCell>{returnItem.originalSale?.saleNumber || 'N/A'}</TableCell>
                        <TableCell>{returnItem.product?.name || 'N/A'}</TableCell>
                        <TableCell>{returnItem.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{returnItem.reason}</Badge>
                        </TableCell>
                        <TableCell>
                          {returnItem.isExchange ? (
                            <Badge variant="secondary">Exchange</Badge>
                          ) : (
                            <Badge variant="outline">Return</Badge>
                          )}
                        </TableCell>
                        <TableCell>₹{Number(returnItem.returnAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              returnItem.status === 'PROCESSED'
                                ? 'default'
                                : returnItem.status === 'CANCELLED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {returnItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{returnItem.processedBy?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {returnItem.processedAt
                            ? new Date(returnItem.processedAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No returns found</div>
            )}
          </CardContent>
        </Card>

        {/* Return Modal */}
        <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
          if (!open) {
            setReturnForm({
              reason: '',
              reasonDetails: '',
              isExchange: false,
              exchangeProductId: '',
              exchangeQuantity: '',
              notes: '',
            })
          }
          setIsReturnModalOpen(open)
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Return/Exchange</DialogTitle>
              <DialogDescription>
                Process return for {selectedItems.length} selected item{selectedItems.length > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Selected Items Summary */}
              <div className="space-y-2">
                <Label>Selected Items</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  {selectedItems.map((item) => (
                    <div key={item.saleId} className="flex justify-between items-center">
                      <span className="text-sm">
                        {item.product?.name} × {item.quantity}
                      </span>
                      <span className="text-sm font-medium">
                        ₹{((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Reason */}
              <div className="space-y-2">
                <Label>Return Reason *</Label>
                <Select
                  value={returnForm.reason}
                  onValueChange={(value) => setReturnForm({ ...returnForm, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFECTIVE">Defective</SelectItem>
                    <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                    <SelectItem value="CUSTOMER_REQUEST">Customer Request</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason Details */}
              <div className="space-y-2">
                <Label>Reason Details (Optional)</Label>
                <Textarea
                  placeholder="Additional details about the return reason"
                  value={returnForm.reasonDetails}
                  onChange={(e) => setReturnForm({ ...returnForm, reasonDetails: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Exchange Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isExchange"
                  checked={returnForm.isExchange}
                  onChange={(e) => {
                    setReturnForm({
                      ...returnForm,
                      isExchange: e.target.checked,
                      exchangeProductId: '',
                      exchangeQuantity: '',
                    })
                    if (e.target.checked) {
                      refetchExchangeProducts()
                    }
                  }}
                  className="rounded"
                />
                <Label htmlFor="isExchange" className="cursor-pointer">
                  This is an exchange (not just return)
                </Label>
              </div>

              {/* Exchange Product Selection */}
              {returnForm.isExchange && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="space-y-2">
                    <Label>Exchange Product *</Label>
                    <Select
                      value={returnForm.exchangeProductId}
                      onValueChange={(value) => setReturnForm({ ...returnForm, exchangeProductId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product to exchange for" />
                      </SelectTrigger>
                      <SelectContent>
                        {exchangeProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ₹{Number(product.salePrice || product.price).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Exchange Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      value={returnForm.exchangeQuantity}
                      onChange={(e) => setReturnForm({ ...returnForm, exchangeQuantity: e.target.value })}
                    />
                  </div>

                  {returnForm.exchangeProductId && returnForm.exchangeQuantity && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Exchange Value Difference</p>
                      <p className="text-lg font-bold">
                        {(() => {
                          const exchangeProduct = exchangeProducts.find(
                            (p) => p.id === returnForm.exchangeProductId
                          )
                          const returnTotal = selectedItems.reduce(
                            (sum, item) => sum + (item.product?.price || 0) * item.quantity,
                            0
                          )
                          const exchangeTotal =
                            (exchangeProduct?.salePrice || exchangeProduct?.price || 0) *
                            parseInt(returnForm.exchangeQuantity || 0)
                          const difference = exchangeTotal - returnTotal
                          return difference > 0
                            ? `Customer pays: ₹${difference.toFixed(2)}`
                            : difference < 0
                            ? `Refund: ₹${Math.abs(difference).toFixed(2)}`
                            : 'No difference'
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional notes about this return"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleProcessReturn} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Process Return'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}

