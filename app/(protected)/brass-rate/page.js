'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth-context'
import { invalidateFor } from '@/lib/cacheSync'
import { brassRateAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { IndianRupee, TrendingUp, TrendingDown, RefreshCw, History, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTime = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatRate = (r) => {
  if (r == null) return '—'
  return `₹${Number(r).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g`
}

export default function BrassRatePage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const [page, setPage]                 = useState(1)
  const [submitting, setSubmitting]     = useState(false)

  // New rate form
  const today = new Date().toISOString().split('T')[0]
  const [formRate, setFormRate]         = useState('')
  const [formDate, setFormDate]         = useState(today)
  const [formNotes, setFormNotes]       = useState('')

  // Inline edit state
  const [editingId, setEditingId]       = useState(null)
  const [editRate, setEditRate]         = useState('')

  const currentQuery = useQuery({
    queryKey: ['brassRate', 'current'],
    queryFn: async () => {
      const res = await brassRateAPI.getCurrent(user.token)
      if (!res.success) throw new Error(res.message || 'Failed to load brass rate')
      return res.data || null
    },
    enabled: !!user?.token,
  })
  const historyQuery = useQuery({
    queryKey: ['brassRate', 'history', page],
    queryFn: async () => {
      const res = await brassRateAPI.getHistory(user.token, page, 15)
      if (!res.success) throw new Error(res.message || 'Failed to load brass rate history')
      return res.data
    },
    enabled: !!user?.token,
    placeholderData: (prev) => prev,
  })
  const currentRate = currentQuery.data ?? null
  const history = historyQuery.data?.rates || []
  const pagination = historyQuery.data?.pagination || { page: 1, pages: 1, total: 0 }
  const loading = currentQuery.isFetching || historyQuery.isFetching
  const refresh = () => { currentQuery.refetch(); historyQuery.refetch() }

  useEffect(() => {
    if (currentQuery.isError || historyQuery.isError) toast.error('Failed to load brass rate data')
  }, [currentQuery.isError, historyQuery.isError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formRate || isNaN(Number(formRate)) || Number(formRate) <= 0) {
      toast.error('Please enter a valid rate')
      return
    }
    setSubmitting(true)
    try {
      const res = await brassRateAPI.create(
        { rate: Number(formRate), effectiveDate: formDate, notes: formNotes || undefined },
        user.token
      )
      if (res.success) {
        toast.success('Brass rate updated successfully')
        setFormRate('')
        setFormNotes('')
        setFormDate(today)
        setPage(1)
        invalidateFor(qc, 'brassRate')
      } else {
        toast.error(res.message || 'Failed to update rate')
      }
    } catch {
      toast.error('Failed to update rate')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSave = async (id) => {
    if (!editRate || isNaN(Number(editRate)) || Number(editRate) <= 0) {
      toast.error('Please enter a valid rate')
      return
    }
    try {
      const res = await brassRateAPI.update(id, { rate: Number(editRate) }, user.token)
      if (res.success) {
        toast.success('Rate corrected')
        setEditingId(null)
        invalidateFor(qc, 'brassRate')
      } else {
        toast.error(res.message || 'Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  const rateChange = currentRate?.previousRate != null
    ? Number(currentRate.rate) - Number(currentRate.previousRate)
    : null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brass Rate Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Set and track daily brass rate per gram</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Current Rate Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Brass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {currentRate ? (
              <div className="space-y-1">
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold tracking-tight">
                    ₹{Number(currentRate.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-muted-foreground text-lg mb-1">/gram</span>
                  {rateChange !== null && (
                    <Badge variant={rateChange >= 0 ? 'default' : 'destructive'} className="mb-1">
                      {rateChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {rateChange >= 0 ? '+' : ''}{Number(rateChange).toFixed(2)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Effective: {formatDate(currentRate.effectiveDate)}
                  {currentRate.updatedBy && ` · Updated by ${currentRate.updatedBy.name}`}
                  {` · ${formatTime(currentRate.createdAt)}`}
                </p>
                {currentRate.previousRate != null && (
                  <p className="text-xs text-muted-foreground">Previous: {formatRate(currentRate.previousRate)}</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No rate set yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Formula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="bg-muted rounded p-3 font-mono text-xs">
              Price = Weight (g) × Rate (/g)
            </div>
            {currentRate && (
              <div className="text-muted-foreground space-y-1">
                <p>100g → ₹{(100 * Number(currentRate.rate)).toLocaleString('en-IN')}</p>
                <p>250g → ₹{(250 * Number(currentRate.rate)).toLocaleString('en-IN')}</p>
                <p>500g → ₹{(500 * Number(currentRate.rate)).toLocaleString('en-IN')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Rate Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5" />
            Update Today's Brass Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="rate">Rate per gram (₹) <span className="text-destructive">*</span></Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 750.00"
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date <span className="text-destructive">*</span></Label>
              <Input
                id="effectiveDate"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. Market rate update"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Updating...' : 'Set Rate'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Rate History
            <Badge variant="secondary" className="ml-auto">{pagination.total} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Previous Rate</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No rate history yet
                  </TableCell>
                </TableRow>
              ) : (
                history.map((entry) => {
                  const change = entry.previousRate != null
                    ? Number(entry.rate) - Number(entry.previousRate)
                    : null
                  const isEditing = editingId === entry.id
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{formatDate(entry.effectiveDate)}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-28 h-8"
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold">{formatRate(entry.rate)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatRate(entry.previousRate)}</TableCell>
                      <TableCell>
                        {change != null ? (
                          <Badge variant={change >= 0 ? 'default' : 'destructive'} className="text-xs">
                            {change >= 0 ? '+' : ''}{Number(change).toFixed(2)}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{entry.updatedBy?.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatTime(entry.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[160px] truncate">
                        {entry.notes || '—'}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditSave(entry.id)}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Correct this entry"
                            onClick={() => { setEditingId(entry.id); setEditRate(Number(entry.rate).toString()) }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
