'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Warehouse, RefreshCw, PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { shelvesAPI } from '@/lib/api'
import Loader from '@/components/ui/loader'
import logger from '@/lib/logger'
import { toast } from 'sonner'
import { shelfSchema, formatZodError, getFieldErrors } from '@/lib/validations'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const emptyForm = {
  id: '',
  name: '',
  description: '',
}

export default function ShelvesPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [selectedShelfId, setSelectedShelfId] = useState(null)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [mode, setMode] = useState('create')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [errors, setErrors] = useState({})

  const { data: shelves = [], isLoading: loading } = useQuery({
    queryKey: ['shelves'],
    queryFn: async () => {
      const response = await shelvesAPI.getAll(user.token)
      if (!response.success) throw new Error(response.message || 'Failed to fetch shelves')
      return response.data || []
    },
    enabled: !!user?.token,
  })

  const refreshShelves = () => qc.invalidateQueries({ queryKey: ['shelves'] })

  const selectedShelf = useMemo(
    () => shelves.find((shelf) => shelf.id === selectedShelfId) || null,
    [shelves, selectedShelfId]
  )

  const cleanShelfName = useCallback((name) => {
    if (!name) return ''
    const parts = name.split(' - ')
    return parts[0]?.trim() || name
  }, [])

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setMode('create')
  }

  const openCreateModal = () => {
    setMode('create')
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const openEditModal = () => {
    if (!selectedShelf) return
    setMode('edit')
    setFormData({
      id: selectedShelf.id,
      name: cleanShelfName(selectedShelf.name) || '',
      description: selectedShelf.description || '',
    })
    setFormOpen(true)
  }

  const selectShelf = (shelfId) => {
    setSelectedShelfId(shelfId)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    if (!user?.token) {
      toast.error('You must be logged in')
      return
    }

    try {
      // Validate input
      const validationResult = shelfSchema.safeParse(formData)
      
      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error)
        setErrors(fieldErrors)
        const firstError = formatZodError(validationResult.error)
        toast.error(firstError)
        logger.warn('Shelf validation failed:', validationResult.error.errors)
        return
      }

      const validatedData = validationResult.data
      setSaving(true)
      
      if (mode === 'create') {
        logger.info('Creating shelf:', { id: validatedData.id, name: validatedData.name })
        const payload = {
          id: validatedData.id,
          name: validatedData.name,
          description: validatedData.description || null,
        }
        const response = await shelvesAPI.create(payload, user.token)
        if (!response.success) {
          throw new Error(response.error || response.message || 'Failed to create shelf')
        }
        logger.info('Shelf created successfully:', { id: validatedData.id })
        toast.success('Shelf created successfully')
        setFormOpen(false)
        resetForm()
      } else {
        logger.info('Updating shelf:', { id: formData.id, name: validatedData.name })
        const response = await shelvesAPI.update(
          formData.id,
          {
            name: validatedData.name,
            description: validatedData.description || null,
          },
          user.token
        )
        if (!response.success) {
          throw new Error(response.error || response.message || 'Failed to update shelf')
        }
        logger.info('Shelf updated successfully:', { id: formData.id })
        toast.success('Shelf updated successfully')
        setFormOpen(false)
        resetForm()
      }
      refreshShelves()
    } catch (err) {
      logger.error('Shelf save failed', err)
      toast.error(err.message || 'Failed to save shelf')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedShelf || !user?.token) return
    try {
      setDeleting(true)
      const response = await shelvesAPI.delete(selectedShelf.id, user.token)
      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to delete shelf')
      }
      toast.success('Shelf deleted')
      setSelectedShelfId(null)
      if (mode === 'edit') {
        resetForm()
      }
      setDeleteOpen(false)
      refreshShelves()
    } catch (err) {
      logger.error('Shelf delete failed', err)
      toast.error(err.message || 'Failed to delete shelf')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'user']}>
          <div className="flex items-center justify-center h-64">
            <Loader message="Loading shelf data..." />
          </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'user']}>
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-red-500 font-medium">{error}</p>
            <Button variant="outline" onClick={refreshShelves}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
      </ProtectedRoute>
    )
  }

  return (
      <ProtectedRoute allowedRoles={['admin', 'user']}>
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Shelf Management</h1>
              <p className="text-muted-foreground">
                Live view of shelf capacity, linked products, and maintenance actions
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreateModal} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Shelf
              </Button>
              <Button variant="outline" onClick={openEditModal} disabled={!selectedShelf}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={!selectedShelf}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="secondary" onClick={refreshShelves}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shelf Locations</CardTitle>
                <CardDescription>
                  Each shelf can store any mix of categories—name it by location.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shelves.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Warehouse className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>No shelves found. Use "Add Shelf" to create one.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {shelves.map((shelf) => (
                      <Button
                        key={shelf.id}
                        variant={shelf.id === selectedShelfId ? 'default' : 'outline'}
                        className="h-28 flex flex-col items-center justify-center gap-2"
                        onClick={() => selectShelf(shelf.id)}
                      >
                        <Warehouse className="h-8 w-8" />
                        <div className="text-center">
                          <div className="font-bold">
                            {cleanShelfName(shelf.name) || shelf.name}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {shelf.products?.length || 0} products
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Products in Shelf</CardTitle>
                <CardDescription>
                  {selectedShelf
                    ? `${selectedShelf.products?.length || 0} products linked to ${
                        cleanShelfName(selectedShelf.name) || selectedShelf.name
                      }`
                    : 'Select a shelf from the list to view inventory'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedShelf ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Warehouse className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>Select a shelf to view associated products.</p>
                  </div>
                ) : (selectedShelf.products?.length || 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                  <p>
                    No products currently assigned to{' '}
                    {cleanShelfName(selectedShelf.name) || selectedShelf.name}.
                  </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedShelf.products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-muted-foreground">{product.barcode || '—'}</TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) {
              resetForm()
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{mode === 'create' ? 'Add Shelf' : `Edit ${formData.id}`}</DialogTitle>
              <DialogDescription>
                {mode === 'create'
                  ? 'Create a new shelf location for organizing products.'
                  : 'Update the shelf name or description.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="shelf-id">
                  Shelf ID
                </label>
                <Input
                  id="shelf-id"
                  placeholder="E.g., A1"
                  value={formData.id}
                  onChange={(event) => handleFormChange('id', event.target.value)}
                  disabled={mode === 'edit'}
                  className={errors.id ? 'border-destructive' : ''}
                />
                {errors.id && (
                  <p className="text-sm text-destructive">{errors.id}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="shelf-name">
                  Shelf Name
                </label>
                <Input
                  id="shelf-name"
                  placeholder="Storage Rack A1"
                  value={formData.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="shelf-description">
                  Description
                </label>
                <Textarea
                  id="shelf-description"
                  placeholder="Optional context for this location"
                  value={formData.description}
                  className={errors.description ? 'border-destructive' : ''}
                  onChange={(event) => handleFormChange('description', event.target.value)}
                  rows={4}
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setFormOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {mode === 'create' ? 'Create Shelf' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) {
              setDeleting(false)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shelf</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedShelf
                  ? `Delete shelf "${cleanShelfName(selectedShelf.name) || selectedShelf.name}"? Products assigned to this shelf will lose the association.`
                  : 'Select a shelf before deleting.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </ProtectedRoute>
  )
}