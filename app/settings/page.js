'use client'

import ProtectedRoute from '@/components/protected-route'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function SettingsPage() {
  const handleSave = () => {
    toast.success('Settings saved successfully')
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your application settings</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" defaultValue="UniTrack Inventory" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" defaultValue="admin@unitrackinventory.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStock">Low Stock Threshold</Label>
                <Input id="lowStock" type="number" defaultValue="10" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive alerts when products are running low
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive email notifications for important events
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Product Updates</Label>
                  <div className="text-sm text-muted-foreground">
                    Get notified when products are added or updated
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}