'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, Mail, Phone } from 'lucide-react'
import { shareReceipt, generateReceiptMessage } from '@/lib/sharingService'
import { toast } from 'sonner'

export default function SharingDialog({ open, onOpenChange, receiptData }) {
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [smsPhone, setSmsPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Pre-fill from receipt data if available
  const customerPhone = receiptData?.customerPhone || receiptData?.sale?.customerPhone || ''
  const customerEmail = receiptData?.customerEmail || receiptData?.sale?.customerEmail || ''

  const handleShare = async (method, contact) => {
    if (!contact || !contact.trim()) {
      toast.error(`Please enter a ${method === 'email' ? 'email address' : 'phone number'}`)
      return
    }

    setLoading(true)
    try {
      shareReceipt(receiptData, method, contact)
      toast.success(`Opening ${method.toUpperCase()} to share receipt`)
      
      // Reset form after a delay
      setTimeout(() => {
        setWhatsappPhone('')
        setSmsPhone('')
        setEmail('')
        onOpenChange(false)
      }, 1000)
    } catch (error) {
      console.error('Error sharing receipt:', error)
      toast.error('Failed to share receipt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Receipt</DialogTitle>
          <DialogDescription>
            Share receipt via WhatsApp, SMS, or Email
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="whatsapp" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="sms">
              <Phone className="h-4 w-4 mr-2" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Phone Number</Label>
              <Input
                id="whatsapp-phone"
                type="tel"
                placeholder="+91 9876543210"
                value={whatsappPhone || customerPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +91 for India)
              </p>
            </div>
            <Button
              onClick={() => handleShare('whatsapp', whatsappPhone || customerPhone)}
              disabled={loading || (!whatsappPhone && !customerPhone)}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Share via WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-phone">Phone Number</Label>
              <Input
                id="sms-phone"
                type="tel"
                placeholder="+91 9876543210"
                value={smsPhone || customerPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +91 for India)
              </p>
            </div>
            <Button
              onClick={() => handleShare('sms', smsPhone || customerPhone)}
              disabled={loading || (!smsPhone && !customerPhone)}
              className="w-full"
            >
              <Phone className="h-4 w-4 mr-2" />
              Share via SMS
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={email || customerEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleShare('email', email || customerEmail)}
              disabled={loading || (!email && !customerEmail)}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Share via Email
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

