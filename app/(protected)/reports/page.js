'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useStores } from '@/lib/hooks/useStores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, RefreshCw, TrendingUp, DollarSign, Package, CreditCard, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { reportsAPI, countersAPI } from '@/lib/api'
import logger from '@/lib/logger'

export default function ReportsPage() {
  const { user } = useAuth()
  const { data: stores = [] } = useStores()
  const fetchDebounce = useRef(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('sales')

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedStore, setSelectedStore] = useState('all')
  const [selectedCounter, setSelectedCounter] = useState('all')

  // Data
  const [counters, setCounters] = useState([])
  const [salesData, setSalesData] = useState(null)
  const [gstData, setGstData] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [cashReconData, setCashReconData] = useState(null)
  const [counterWiseData, setCounterWiseData] = useState(null)

  // Set default dates (today and 30 days ago)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setEndDate(today)
    setStartDate(thirtyDaysAgo)
  }, [])

  // Fetch counters when store changes
  useEffect(() => {
    const fetchCounters = async () => {
      if (!user?.token || selectedStore === 'all') {
        setCounters([])
        return
      }
      try {
        const response = await countersAPI.getAll(user.token, selectedStore)
        if (response.success) {
          setCounters(response.data || [])
        }
      } catch (error) {
        logger.error('Error fetching counters:', error)
      }
    }
    fetchCounters()
  }, [user?.token, selectedStore])

  // Fetch report data
  const fetchReport = async (reportType) => {
    if (!user?.token) return

    if (startDate && endDate && startDate > endDate) {
      toast.error('Start date cannot be after end date')
      return
    }

    setLoading(true)
    try {
      const params = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (selectedStore !== 'all') params.storeId = selectedStore
      if (selectedCounter !== 'all') params.counterId = selectedCounter

      let response
      switch (reportType) {
        case 'sales':
          response = await reportsAPI.getSalesReport(user.token, params)
          if (response.success) setSalesData(response.data)
          break
        case 'gst':
          response = await reportsAPI.getGstReport(user.token, params)
          if (response.success) setGstData(response.data)
          break
        case 'payment':
          response = await reportsAPI.getPaymentModeReport(user.token, params)
          if (response.success) setPaymentData(response.data)
          break
        case 'inventory':
          const inventoryParams = { ...params }
          if (selectedStore !== 'all') {
            inventoryParams.storeId = selectedStore
          }
          response = await reportsAPI.getInventoryReport(user.token, inventoryParams)
          if (response.success) setInventoryData(response.data)
          break
        case 'cash-recon':
          response = await reportsAPI.getCashReconciliationReport(user.token, params)
          if (response.success) setCashReconData(response.data)
          break
        case 'counter-wise':
          response = await reportsAPI.getCounterWiseReport(user.token, params)
          if (response.success) setCounterWiseData(response.data)
          break
      }

      if (response && !response.success) {
        toast.error(response.message || 'Failed to fetch report')
      }
    } catch (error) {
      logger.error(`Error fetching ${reportType} report:`, error)
      toast.error('Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch when tab changes or filters change — 400ms debounce to avoid
  // firing on every keystroke when user is typing date values
  useEffect(() => {
    if (!activeTab || !user?.token) return
    if (fetchDebounce.current) clearTimeout(fetchDebounce.current)
    fetchDebounce.current = setTimeout(() => {
      fetchReport(activeTab)
    }, 400)
    return () => clearTimeout(fetchDebounce.current)
  }, [activeTab, startDate, endDate, selectedStore, selectedCounter, user?.token])

  // Export to Excel (placeholder - would need a library like xlsx)
  const handleExport = (reportType) => {
    toast.info('Excel export feature coming soon')
    // TODO: Implement Excel export using xlsx library
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">View and analyze sales, inventory, and financial data</p>
          </div>
        </div>

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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={startDate && endDate && startDate > endDate ? 'border-destructive' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={startDate && endDate && startDate > endDate ? 'border-destructive' : ''}
                />
                {startDate && endDate && startDate > endDate && (
                  <p className="text-xs text-destructive">End date must be after start date</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Store</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Counter</Label>
                <Select value={selectedCounter} onValueChange={setSelectedCounter} disabled={selectedStore === 'all'}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Counters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Counters</SelectItem>
                    {counters.map((counter) => (
                      <SelectItem key={counter.id} value={counter.id}>
                        {counter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => fetchReport(activeTab)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => handleExport(activeTab)}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="gst">GST</TabsTrigger>
            <TabsTrigger value="payment">Payment Mode</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="cash-recon">Cash Recon</TabsTrigger>
            <TabsTrigger value="counter-wise">Counter-wise</TabsTrigger>
          </TabsList>

          {/* Sales Report */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Sales Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : salesData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Receipts</p>
                        <p className="text-2xl font-bold">{salesData.summary?.totalReceipts || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{salesData.summary?.totalItems || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Subtotal</p>
                        <p className="text-2xl font-bold">₹{salesData.summary?.totalSubtotal?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total GST</p>
                        <p className="text-2xl font-bold">₹{salesData.summary?.totalGst?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Final</p>
                        <p className="text-2xl font-bold">₹{salesData.summary?.totalFinal?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* Receipts Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead>GST</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Payments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.receipts?.length > 0 ? (
                            salesData.receipts.map((receipt) => (
                              <TableRow key={receipt.receiptNumber}>
                                <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                                <TableCell>{new Date(receipt.saleDate).toLocaleDateString()}</TableCell>
                                <TableCell>{receipt.store?.name || 'N/A'}</TableCell>
                                <TableCell>{receipt.customerName || 'Walk-in'}</TableCell>
                                <TableCell>{receipt.items?.length || 0}</TableCell>
                                <TableCell>₹{receipt.totalSubtotal?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{receipt.totalGst?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="font-bold">₹{receipt.totalFinal?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {receipt.payments?.map((p, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {p.method}: ₹{Number(p.amount).toFixed(2)}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No sales data found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GST Report */}
          <TabsContent value="gst" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GST Report (GSTR-1 Format)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : gstData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Taxable Value</p>
                        <p className="text-2xl font-bold">₹{gstData.totals?.totalTaxableValue?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total CGST</p>
                        <p className="text-2xl font-bold">₹{gstData.totals?.totalCgst?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total SGST</p>
                        <p className="text-2xl font-bold">₹{gstData.totals?.totalSgst?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total GST</p>
                        <p className="text-2xl font-bold">₹{gstData.totals?.totalGst?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* HSN-wise Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>HSN Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>GST Rate</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Taxable Value</TableHead>
                            <TableHead>CGST</TableHead>
                            <TableHead>SGST</TableHead>
                            <TableHead>IGST</TableHead>
                            <TableHead>Total GST</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gstData.hsnWiseData?.length > 0 ? (
                            gstData.hsnWiseData.map((hsn, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{hsn.hsnCode}</TableCell>
                                <TableCell>{hsn.description}</TableCell>
                                <TableCell>{hsn.gstRate}%</TableCell>
                                <TableCell>{hsn.quantity}</TableCell>
                                <TableCell>₹{hsn.taxableValue?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{hsn.cgst?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{hsn.sgst?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{hsn.igst?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="font-bold">₹{hsn.totalGst?.toFixed(2) || '0.00'}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No GST data found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Mode Report */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Mode Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : paymentData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Payments</p>
                        <p className="text-2xl font-bold">{paymentData.summary?.totalPayments || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">₹{paymentData.summary?.totalAmount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Split Payments</p>
                        <p className="text-2xl font-bold">{paymentData.summary?.splitPaymentsCount || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Single Payments</p>
                        <p className="text-2xl font-bold">{paymentData.summary?.singlePaymentCount || 0}</p>
                      </div>
                    </div>

                    {/* Payment Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(paymentData.paymentStats || {}).map(([method, stats]) => (
                        <Card key={method}>
                          <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground mb-2">{method}</p>
                            <p className="text-xl font-bold">₹{stats.amount?.toFixed(2) || '0.00'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{stats.count || 0} transactions</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Report */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : inventoryData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Products</p>
                        <p className="text-2xl font-bold">{inventoryData.summary?.totalProducts || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Low Stock Items</p>
                        <p className="text-2xl font-bold text-orange-600">{inventoryData.summary?.lowStockCount || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Quantity</p>
                        <p className="text-2xl font-bold">{inventoryData.summary?.totalQuantity || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">₹{inventoryData.summary?.totalValue?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* Products Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Min Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryData.products?.length > 0 ? (
                            inventoryData.products.map((item) => (
                              <TableRow key={item.product?.id || item.id}>
                                <TableCell className="font-medium">{item.product?.name || 'N/A'}</TableCell>
                                <TableCell>{item.product?.sku || 'N/A'}</TableCell>
                                <TableCell>{item.product?.category?.name || 'N/A'}</TableCell>
                                <TableCell>{item.store?.name || 'Global'}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{item.minStockLevel}</TableCell>
                                <TableCell>
                                  <Badge variant={item.isLowStock ? 'destructive' : 'default'}>
                                    {item.isLowStock ? 'Low Stock' : 'In Stock'}
                                  </Badge>
                                </TableCell>
                                <TableCell>₹{item.value?.toFixed(2) || '0.00'}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No inventory data found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Reconciliation Report */}
          <TabsContent value="cash-recon" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cash Reconciliation Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : cashReconData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Shifts</p>
                        <p className="text-2xl font-bold">{cashReconData.summary?.totalShifts || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Opening</p>
                        <p className="text-2xl font-bold">₹{cashReconData.summary?.totalOpeningBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Cash Sales</p>
                        <p className="text-2xl font-bold">₹{cashReconData.summary?.totalCashSales?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Expected</p>
                        <p className="text-2xl font-bold">₹{cashReconData.summary?.totalExpectedBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Difference</p>
                        <p className={`text-2xl font-bold ${(cashReconData.summary?.totalDifference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{cashReconData.summary?.totalDifference?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    {/* Shifts Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Shift #</TableHead>
                            <TableHead>Counter</TableHead>
                            <TableHead>Opened By</TableHead>
                            <TableHead>Opening</TableHead>
                            <TableHead>Cash Sales</TableHead>
                            <TableHead>Expected</TableHead>
                            <TableHead>Actual</TableHead>
                            <TableHead>Difference</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cashReconData.shifts?.length > 0 ? (
                            cashReconData.shifts.map((shift) => (
                              <TableRow key={shift.shiftNumber}>
                                <TableCell className="font-medium">{shift.shiftNumber}</TableCell>
                                <TableCell>{shift.counter?.name || 'N/A'}</TableCell>
                                <TableCell>{shift.openedBy?.name || 'N/A'}</TableCell>
                                <TableCell>₹{shift.openingBalance?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{shift.cashSales?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{shift.expectedBalance?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{shift.actualBalance?.toFixed(2) || 'N/A'}</TableCell>
                                <TableCell>
                                  <span className={shift.difference < 0 ? 'text-red-600' : shift.difference > 0 ? 'text-green-600' : ''}>
                                    ₹{shift.difference?.toFixed(2) || '0.00'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={shift.status === 'CLOSED' ? 'default' : 'secondary'}>
                                    {shift.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No shift data found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Counter-wise Report */}
          <TabsContent value="counter-wise" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Counter-wise Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : counterWiseData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Counters</p>
                        <p className="text-2xl font-bold">{counterWiseData.summary?.totalCounters || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Receipts</p>
                        <p className="text-2xl font-bold">{counterWiseData.summary?.totalReceipts || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{counterWiseData.summary?.totalItems || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold">₹{counterWiseData.summary?.totalFinal?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* Counters Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Counter</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Receipts</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>GST</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Payments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {counterWiseData.counters?.length > 0 ? (
                            counterWiseData.counters.map((counter) => (
                              <TableRow key={counter.counterId}>
                                <TableCell className="font-medium">{counter.counterName}</TableCell>
                                <TableCell>{counter.storeName}</TableCell>
                                <TableCell>{counter.receiptCount}</TableCell>
                                <TableCell>{counter.itemCount}</TableCell>
                                <TableCell>₹{counter.totalSubtotal?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{counter.totalDiscount?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>₹{counter.totalGst?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="font-bold">₹{counter.totalFinal?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1 text-xs">
                                    {Object.entries(counter.paymentStats || {}).map(([method, amount]) => (
                                      <span key={method}>
                                        {method}: ₹{Number(amount).toFixed(2)}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No counter data found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}

