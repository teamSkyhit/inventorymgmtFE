'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/protected-route'
import AdminLayout from '@/components/admin-layout'
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
import { storesAPI, settingsAPI, deviceSettingsAPI } from '@/lib/api'
import logger from '@/lib/logger'
import Loader from '@/components/ui/loader'
import { RefreshCw, Monitor, Printer, Wifi, WifiOff, Edit } from 'lucide-react'

const PRINTER_STATUS_COLORS = {
  READY: 'default',
  ERROR: 'destructive',
  OFFLINE: 'secondary',
  UNKNOWN: 'outline',
}

export default function SettingsPage() {
  const { user } = useAuth()

  // Stores list + selected store
  const [stores, setStores] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [storesLoading, setStoresLoading] = useState(true)

  // Store settings
  const [storeSettings, setStoreSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Device management
  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [editingDevice, setEditingDevice] = useState(null)
  const [deviceForm, setDeviceForm] = useState({})
  const [deviceSaving, setDeviceSaving] = useState(false)

  // Load stores on mount
  useEffect(() => {
    if (user?.token) {
      loadStores()
      loadDevices()
    }
  }, [user?.token])

  // Load store settings when store changes
  useEffect(() => {
    if (selectedStoreId && user?.token) {
      loadStoreSettings(selectedStoreId)
    }
  }, [selectedStoreId, user?.token])

  const loadStores = async () => {
    try {
      setStoresLoading(true)
      const res = await storesAPI.getAll(user.token)
      if (res.success) {
        const list = res.data || []
        setStores(list)
        if (list.length > 0) setSelectedStoreId(list[0].id)
      } else {
        toast.error('Failed to load stores')
      }
    } catch (err) {
      logger.error('loadStores error:', err)
    } finally {
      setStoresLoading(false)
    }
  }

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

  const loadDevices = async () => {
    try {
      setDevicesLoading(true)
      const res = await deviceSettingsAPI.getAllDevices(user.token)
      if (res.success) {
        setDevices(res.data || [])
      } else {
        toast.error('Failed to load devices')
      }
    } catch (err) {
      logger.error('loadDevices error:', err)
    } finally {
      setDevicesLoading(false)
    }
  }

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
        loadDevices()
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

  const formatDate = (val) => {
    if (!val) return '—'
    return new Date(val).toLocaleString()
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6 max-w-5xl">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage store settings and registered POS devices</p>
          </div>

          <Tabs defaultValue="store">
            <TabsList>
              <TabsTrigger value="store">Store Settings</TabsTrigger>
              <TabsTrigger value="devices">Device Management</TabsTrigger>
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
                <Button variant="outline" size="sm" onClick={loadDevices} disabled={devicesLoading}>
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
      </AdminLayout>
    </ProtectedRoute>
  )
}
