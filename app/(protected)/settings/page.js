'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { settingsAPI, deviceSettingsAPI, publicApiKeyAPI } from '@/lib/api'
import { useStores } from '@/lib/hooks/useStores'
import logger from '@/lib/logger'
import Loader from '@/components/ui/loader'
import { RefreshCw, Monitor, Printer, Wifi, WifiOff, Edit, Copy, Eye, EyeOff, KeyRound, Globe, CheckCircle } from 'lucide-react'

const PRINTER_STATUS_COLORS = {
  READY: 'default',
  ERROR: 'destructive',
  OFFLINE: 'secondary',
  UNKNOWN: 'outline',
}

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Stores from cache via hook
  const { data: stores = [], isLoading: storesLoading } = useStores()
  const [selectedStoreId, setSelectedStoreId] = useState('')

  // Auto-select first store when stores load
  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id)
    }
  }, [stores])

  // Store settings — local state for editing
  const [storeSettings, setStoreSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Load store settings when store changes
  useEffect(() => {
    if (selectedStoreId && user?.token) {
      loadStoreSettings(selectedStoreId)
    }
  }, [selectedStoreId, user?.token])

  const loadStoreSettings = async (storeId) => {
    try {
      setSettingsLoading(true)
      const res = await settingsAPI.getStoreSettings(storeId, user.token)
      if (res.success) {
        setStoreSettings(res.data)
      } else {
        toast.error('Failed to load store settings')
      }
    } catch (err) {
      logger.error('loadStoreSettings error:', err)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Devices — cached via React Query, parallel to stores
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['settings', 'devices'],
    queryFn: async () => {
      const res = await deviceSettingsAPI.getAllDevices(user.token)
      if (!res.success) throw new Error('Failed to load devices')
      return res.data || []
    },
    enabled: !!user?.token,
  })

  // Device management UI state
  const [editingDevice, setEditingDevice] = useState(null)
  const [deviceForm, setDeviceForm] = useState({})
  const [deviceSaving, setDeviceSaving] = useState(false)

  const handleSettingChange = (field, value) => {
    setStoreSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveStoreSettings = async () => {
    if (!selectedStoreId || !storeSettings) return
    setSettingsSaving(true)
    try {
      const res = await settingsAPI.updateStoreSettings(selectedStoreId, storeSettings, user.token)
      if (res.success) {
        toast.success('Store settings saved')
        setStoreSettings(res.data)
      } else {
        toast.error(res.error || 'Failed to save settings')
      }
    } catch (err) {
      logger.error('saveStoreSettings error:', err)
      toast.error('Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleEditDevice = (device) => {
    setEditingDevice(device)
    setDeviceForm({
      deviceName: device.deviceName || '',
      deviceType: device.deviceType || '',
      apiBaseUrl: device.apiBaseUrl || '',
    })
  }

  const handleSaveDevice = async () => {
    if (!editingDevice) return
    setDeviceSaving(true)
    try {
      const res = await deviceSettingsAPI.updateDevice(editingDevice.deviceId, deviceForm, user.token)
      if (res.success) {
        toast.success('Device updated')
        setEditingDevice(null)
        qc.invalidateQueries({ queryKey: ['settings', 'devices'] })
      } else {
        toast.error(res.error || 'Failed to update device')
      }
    } catch (err) {
      logger.error('saveDevice error:', err)
      toast.error('Failed to update device')
    } finally {
      setDeviceSaving(false)
    }
  }

  // Public API key state
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [fullKey, setFullKey] = useState(null)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [apiKeyGenerating, setApiKeyGenerating] = useState(false)

  const { data: apiKeyData, isLoading: apiKeyLoading, refetch: refetchApiKey } = useQuery({
    queryKey: ['settings', 'api-key'],
    queryFn: async () => {
      const res = await publicApiKeyAPI.getKey(user.token)
      if (!res.success) throw new Error('Failed to load API key')
      return res.data
    },
    enabled: !!user?.token,
  })

  const handleGenerateKey = async () => {
    setApiKeyGenerating(true)
    try {
      const res = await publicApiKeyAPI.generateKey(user.token)
      if (res.success) {
        setFullKey(res.data.fullKey)
        setApiKeyVisible(true)
        toast.success('New API key generated — copy it now, it will be masked after you leave this tab')
        refetchApiKey()
      } else {
        toast.error(res.error || 'Failed to generate API key')
      }
    } catch (err) {
      toast.error('Failed to generate API key')
    } finally {
      setApiKeyGenerating(false)
    }
  }

  const handleCopyKey = async () => {
    const keyToCopy = fullKey || (apiKeyVisible ? null : null)
    if (!keyToCopy) return
    await navigator.clipboard.writeText(keyToCopy)
    setApiKeyCopied(true)
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  const displayedKey = fullKey || apiKeyData?.maskedKey || ''
  const BASE_URL = 'https://api.yourstore.com'

  const formatDate = (val) => {
    if (!val) return '—'
    return new Date(val).toLocaleString()
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
        <div className="space-y-6 max-w-5xl">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage store settings and registered POS devices</p>
          </div>

          <Tabs defaultValue="store">
            <TabsList>
              <TabsTrigger value="store">Store Settings</TabsTrigger>
              <TabsTrigger value="devices">Device Management</TabsTrigger>
              <TabsTrigger value="website">Website Integration</TabsTrigger>
            </TabsList>

            {/* ── Store Settings Tab ── */}
            <TabsContent value="store" className="space-y-4 mt-4">
              {/* Store selector */}
              <div className="flex items-center gap-4">
                <Label className="shrink-0">Store</Label>
                {storesLoading ? (
                  <Loader />
                ) : (
                  <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {settingsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader message="Loading settings..." />
                </div>
              ) : storeSettings ? (
                <>
                  {/* Receipt Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Receipt</CardTitle>
                      <CardDescription>Customize what appears on printed receipts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Receipt Header</Label>
                        <Textarea
                          value={storeSettings.receiptHeader || ''}
                          onChange={(e) => handleSettingChange('receiptHeader', e.target.value)}
                          placeholder="Header text on receipts"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Receipt Footer</Label>
                        <Textarea
                          value={storeSettings.receiptFooter || ''}
                          onChange={(e) => handleSettingChange('receiptFooter', e.target.value)}
                          placeholder="Footer text on receipts"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label>Show Logo</Label>
                          <Switch
                            checked={!!storeSettings.receiptShowLogo}
                            onCheckedChange={(v) => handleSettingChange('receiptShowLogo', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Show GSTIN</Label>
                          <Switch
                            checked={!!storeSettings.receiptShowGstin}
                            onCheckedChange={(v) => handleSettingChange('receiptShowGstin', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Show Address</Label>
                          <Switch
                            checked={!!storeSettings.receiptShowAddress}
                            onCheckedChange={(v) => handleSettingChange('receiptShowAddress', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Show Phone</Label>
                          <Switch
                            checked={!!storeSettings.receiptShowPhone}
                            onCheckedChange={(v) => handleSettingChange('receiptShowPhone', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Auto Print Receipt</Label>
                          <Switch
                            checked={!!storeSettings.autoPrintReceipt}
                            onCheckedChange={(v) => handleSettingChange('autoPrintReceipt', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Print After Payment</Label>
                          <Switch
                            checked={!!storeSettings.printAfterPayment}
                            onCheckedChange={(v) => handleSettingChange('printAfterPayment', v)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tax & Discount Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tax &amp; Discounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Default GST Rate (%)</Label>
                          <Input
                            type="number"
                            value={storeSettings.defaultGstRate ?? ''}
                            onChange={(e) => handleSettingChange('defaultGstRate', e.target.value)}
                            placeholder="e.g. 18"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Discount (%)</Label>
                          <Input
                            type="number"
                            value={storeSettings.maxDiscountPercent ?? ''}
                            onChange={(e) => handleSettingChange('maxDiscountPercent', e.target.value)}
                            placeholder="e.g. 10"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label>GST Inclusive Pricing</Label>
                          <Switch
                            checked={!!storeSettings.gstInclusive}
                            onCheckedChange={(v) => handleSettingChange('gstInclusive', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Show Tax Breakdown</Label>
                          <Switch
                            checked={!!storeSettings.showTaxBreakdown}
                            onCheckedChange={(v) => handleSettingChange('showTaxBreakdown', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Allow Manual Discount</Label>
                          <Switch
                            checked={!!storeSettings.allowManualDiscount}
                            onCheckedChange={(v) => handleSettingChange('allowManualDiscount', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Round Off Enabled</Label>
                          <Switch
                            checked={!!storeSettings.roundOffEnabled}
                            onCheckedChange={(v) => handleSettingChange('roundOffEnabled', v)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Orders &amp; Inventory</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Draft Order Expiry (hours)</Label>
                          <Input
                            type="number"
                            value={storeSettings.orderExpiryHoursDraft ?? 2}
                            onChange={(e) => handleSettingChange('orderExpiryHoursDraft', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Handed-Off Expiry (hours)</Label>
                          <Input
                            type="number"
                            value={storeSettings.orderExpiryHoursHandedOff ?? 4}
                            onChange={(e) => handleSettingChange('orderExpiryHoursHandedOff', Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Low Stock Threshold</Label>
                          <Input
                            type="number"
                            value={storeSettings.lowStockThreshold ?? 10}
                            onChange={(e) => handleSettingChange('lowStockThreshold', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label>Auto Cancel Expired Orders</Label>
                          <Switch
                            checked={!!storeSettings.autoCancelExpiredOrders}
                            onCheckedChange={(v) => handleSettingChange('autoCancelExpiredOrders', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Allow Negative Stock</Label>
                          <Switch
                            checked={!!storeSettings.allowNegativeStock}
                            onCheckedChange={(v) => handleSettingChange('allowNegativeStock', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Reserve Stock on Handoff</Label>
                          <Switch
                            checked={!!storeSettings.reserveStockOnHandoff}
                            onCheckedChange={(v) => handleSettingChange('reserveStockOnHandoff', v)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Enable Low Stock Alert</Label>
                          <Switch
                            checked={!!storeSettings.enableLowStockAlert}
                            onCheckedChange={(v) => handleSettingChange('enableLowStockAlert', v)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveStoreSettings} disabled={settingsSaving}>
                      {settingsSaving ? 'Saving...' : 'Save Store Settings'}
                    </Button>
                  </div>
                </>
              ) : (
                !storesLoading && stores.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No stores found. Create a store first.</p>
                ) : null
              )}
            </TabsContent>

            {/* ── Device Management Tab ── */}
            <TabsContent value="devices" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Registered POS Devices</h2>
                  <p className="text-sm text-muted-foreground">
                    Devices register automatically when the POS app connects. Use this panel to review or rename them.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['settings', 'devices'] })} disabled={devicesLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${devicesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {devicesLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader message="Loading devices..." />
                </div>
              ) : devices.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                    <Monitor className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No devices registered yet.</p>
                    <p className="text-xs text-muted-foreground">
                      Devices appear here automatically when the POS app first connects.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Connection</TableHead>
                          <TableHead>Printer</TableHead>
                          <TableHead>Last Seen</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((device) => (
                          <TableRow key={device.deviceId}>
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                              {device.deviceId}
                            </TableCell>
                            <TableCell className="font-medium">
                              {device.deviceName || <span className="text-muted-foreground italic">Unnamed</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {device.deviceType || 'POS'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {device.connectionType === 'OFFLINE' ? (
                                  <WifiOff className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <Wifi className="h-3 w-3 text-green-500" />
                                )}
                                <span className="text-sm">{device.connectionType || '—'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={PRINTER_STATUS_COLORS[device.printerStatus] || 'outline'}>
                                {device.printerConnected ? (device.printerStatus || 'Connected') : 'No Printer'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(device.lastSyncAt)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleEditDevice(device)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            {/* ── Website Integration Tab ── */}
            <TabsContent value="website" className="space-y-6 mt-4">
              {/* API Key Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Public API Key</CardTitle>
                  </div>
                  <CardDescription>
                    Use this key to authenticate requests from your ecommerce website to the public product catalogue API.
                    Keep it secret — it authenticates all public API calls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {apiKeyLoading ? (
                    <Loader message="Loading API key..." />
                  ) : !apiKeyData?.configured ? (
                    <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                      <KeyRound className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No API key configured yet. Generate one to get started.</p>
                      <Button onClick={handleGenerateKey} disabled={apiKeyGenerating}>
                        {apiKeyGenerating ? 'Generating...' : 'Generate API Key'}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 font-mono text-sm bg-muted rounded-md px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap select-all">
                            {fullKey ? displayedKey : (apiKeyData?.maskedKey || '—')}
                          </div>
                          {fullKey && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleCopyKey}
                              title="Copy key"
                            >
                              {apiKeyCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                        {apiKeyData?.updatedAt && (
                          <p className="text-xs text-muted-foreground">
                            Last generated: {formatDate(apiKeyData.updatedAt)}
                          </p>
                        )}
                        {!fullKey && (
                          <p className="text-xs text-amber-600">
                            For security, the full key is only shown immediately after generation.
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleGenerateKey}
                          disabled={apiKeyGenerating}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${apiKeyGenerating ? 'animate-spin' : ''}`} />
                          {apiKeyGenerating ? 'Generating...' : 'Regenerate Key'}
                        </Button>
                      </div>
                      {apiKeyData?.configured && (
                        <p className="text-xs text-muted-foreground">
                          Warning: regenerating invalidates the current key immediately. Update your website&apos;s configuration after regenerating.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* API Documentation Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Public API Reference</CardTitle>
                  </div>
                  <CardDescription>
                    These endpoints can be called from your ecommerce website. Pass your API key in the{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">x-api-key</code> header on every request.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Base URL */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Base URL</Label>
                    <div className="font-mono text-sm bg-muted rounded-md px-3 py-2">
                      http://your-server:8000
                    </div>
                  </div>

                  <Separator />

                  {/* Endpoint 1: GET /products */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">GET</Badge>
                      <code className="text-sm font-mono">/api/public/products</code>
                    </div>
                    <p className="text-sm text-muted-foreground">List all website-enabled products with pagination and optional category filter.</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Query params:</strong> <code>page</code>, <code>limit</code>, <code>category</code> (slug), <code>search</code></p>
                    </div>
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">{`fetch('http://your-server:8000/api/public/products?limit=20&page=1', {
  headers: { 'x-api-key': 'YOUR_API_KEY' }
})
  .then(r => r.json())
  .then(data => console.log(data.data.products))`}</pre>
                  </div>

                  <Separator />

                  {/* Endpoint 2: GET /products/:slug */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">GET</Badge>
                      <code className="text-sm font-mono">/api/public/products/:slug</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Fetch a single product by its URL slug. Returns full details including images and category.</p>
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">{`fetch('http://your-server:8000/api/public/products/blue-cotton-shirt', {
  headers: { 'x-api-key': 'YOUR_API_KEY' }
})
  .then(r => r.json())
  .then(data => console.log(data.data))`}</pre>
                  </div>

                  <Separator />

                  {/* Endpoint 3: GET /categories */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">GET</Badge>
                      <code className="text-sm font-mono">/api/public/categories</code>
                    </div>
                    <p className="text-sm text-muted-foreground">List all website-enabled categories for building navigation menus and filters.</p>
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">{`fetch('http://your-server:8000/api/public/categories', {
  headers: { 'x-api-key': 'YOUR_API_KEY' }
})
  .then(r => r.json())
  .then(data => console.log(data.data))`}</pre>
                  </div>

                  <Separator />

                  {/* Endpoint 4: POST /enquiry */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">POST</Badge>
                      <code className="text-sm font-mono">/api/public/enquiry</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Submit a customer product enquiry. Triggers a WhatsApp notification to your store. Rate limited to 5 submissions per IP per hour.</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Body (JSON):</strong> <code>name</code> (required), <code>phone</code> (required), <code>email</code>, <code>message</code>, <code>productId</code></p>
                    </div>
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">{`fetch('http://your-server:8000/api/public/enquiry', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Rahul Kumar',
    phone: '9876543210',
    email: 'rahul@example.com',
    message: 'Is this available in size L?',
    productId: 'product-uuid-here'
  })
})
  .then(r => r.json())
  .then(data => console.log(data))`}</pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Device Dialog */}
        <Dialog open={!!editingDevice} onOpenChange={(open) => { if (!open) setEditingDevice(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Device</DialogTitle>
              <DialogDescription>
                Update the display name or API base URL for this device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Device Name</Label>
                <Input
                  value={deviceForm.deviceName || ''}
                  onChange={(e) => setDeviceForm((f) => ({ ...f, deviceName: e.target.value }))}
                  placeholder="e.g. Counter 1 Terminal"
                />
              </div>
              <div className="space-y-2">
                <Label>Device Type</Label>
                <Input
                  value={deviceForm.deviceType || ''}
                  onChange={(e) => setDeviceForm((f) => ({ ...f, deviceType: e.target.value }))}
                  placeholder="e.g. BILLING, FLOOR"
                />
              </div>
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input
                  value={deviceForm.apiBaseUrl || ''}
                  onChange={(e) => setDeviceForm((f) => ({ ...f, apiBaseUrl: e.target.value }))}
                  placeholder="e.g. http://192.168.1.10:8000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDevice(null)}>Cancel</Button>
              <Button onClick={handleSaveDevice} disabled={deviceSaving}>
                {deviceSaving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </ProtectedRoute>
  )
}
