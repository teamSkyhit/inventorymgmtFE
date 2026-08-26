'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProtectedRoute from '@/components/protected-route'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Edit, Trash2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { usersAPI } from '@/lib/api'
import { useStores } from '@/lib/hooks/useStores'
import { userSchema, formatZodError, getFieldErrors } from '@/lib/validations'
import logger from '@/lib/logger'
import Loader from '@/components/ui/loader'

export default function UsersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: stores = [] } = useStores()
  const { data: usersData, isLoading: loading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersAPI.getAll(user.token)
      if (!res.success) throw new Error(res.message || 'Failed to load users')
      return res.data || []
    },
    enabled: !!user?.token,
  })
  const users = usersData || []
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE',
    storeId: '',
  })

  // PIN dialog state
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pinTargetUser, setPinTargetUser] = useState(null)
  const [pinValue, setPinValue] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const handleAddUser = () => {
    setEditingUser(null)
    setErrors({})
    setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE', storeId: '' })
    setIsDialogOpen(true)
  }

  const handleEditUser = (usr) => {
    setEditingUser(usr)
    setErrors({})
    setFormData({
      name: usr.name || '',
      email: usr.email || '',
      password: '',
      role: usr.role || 'USER',
      status: usr.status || 'ACTIVE',
      storeId: usr.storeId || '',
    })
    setIsDialogOpen(true)
  }

  const handleSetPin = (usr) => {
    setPinTargetUser(usr)
    setPinValue('')
    setPinConfirm('')
    setPinError('')
    setIsPinDialogOpen(true)
  }

  const handleSaveUser = async () => {
    setErrors({})
    if (!user?.token) {
      toast.error('You must be logged in')
      return
    }

    try {
      const dataToValidate = {
        ...formData,
        role: formData.role.toUpperCase(),
        status: formData.status.toUpperCase(),
      }

      // Zod .optional() accepts undefined, not ''. Strip blank password when editing
      // so the min(6) rule doesn't fire on an intentionally empty field.
      if (editingUser && !dataToValidate.password) {
        delete dataToValidate.password
      }

      const validationSchema = editingUser
        ? userSchema.partial({ password: true })
        : userSchema

      const validationResult = validationSchema.safeParse(dataToValidate)

      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error)
        setErrors(fieldErrors)
        const firstError = formatZodError(validationResult.error)
        toast.error(firstError)
        logger.warn('User validation failed:', validationResult.error.errors)
        return
      }

      const validatedData = {
        ...validationResult.data,
        storeId: formData.storeId || null,
      }

      if (validatedData.role === 'USER' && !validatedData.storeId) {
        toast.warning('This user has no store assigned. They will not be able to log in via POS PIN until a store is assigned.')
      }

      if (editingUser) {
        const updateData = { ...validatedData }
        if (!updateData.password) delete updateData.password
        const response = await usersAPI.update(editingUser.id, updateData, user.token)
        if (response.success) {
          toast.success('User updated successfully')
          setIsDialogOpen(false)
          qc.invalidateQueries({ queryKey: ['users'] })
        } else {
          toast.error(response.message || response.error || 'Failed to update user')
        }
      } else {
        const response = await usersAPI.create(validatedData, user.token)
        if (response.success) {
          toast.success('User added successfully')
          setIsDialogOpen(false)
          qc.invalidateQueries({ queryKey: ['users'] })
        } else {
          toast.error(response.message || response.error || 'Failed to create user')
        }
      }
    } catch (error) {
      logger.error('Error saving user:', error)
      toast.error('An error occurred while saving the user')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!user?.token) return
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      const response = await usersAPI.delete(userId, user.token)
      if (response.success) {
        toast.success('User deleted successfully')
        fetchUsers()
      } else {
        toast.error(response.message || 'Failed to delete user')
      }
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const handleSavePin = async () => {
    setPinError('')
    if (!/^\d{4,6}$/.test(pinValue)) {
      setPinError('PIN must be 4–6 digits (numbers only)')
      return
    }
    if (pinValue !== pinConfirm) {
      setPinError('PINs do not match')
      return
    }
    if (!user?.token || !pinTargetUser) return
    setPinLoading(true)
    try {
      const response = await usersAPI.updatePin(pinTargetUser.id, pinValue, user.token)
      if (response.success) {
        toast.success(`POS PIN updated for ${pinTargetUser.name}`)
        setIsPinDialogOpen(false)
        fetchUsers()
      } else {
        toast.error(response.error || 'Failed to set PIN')
      }
    } catch (error) {
      toast.error('Failed to set PIN')
    } finally {
      setPinLoading(false)
    }
  }

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
    }
  }

  const getStoreName = (usr) => {
    if (usr.store?.name) return usr.store.name
    if (usr.storeId) return stores.find((s) => s.id === usr.storeId)?.name || usr.storeId.slice(0, 8) + '…'
    return <span className="text-muted-foreground italic">All stores</span>
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Loading users..." />
          </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage system users, store assignments, and POS PINs</p>
            </div>
            <Button onClick={handleAddUser}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Store</TableHead>
                    <TableHead>POS PIN</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((usr) => (
                    <TableRow key={usr.id}>
                      <TableCell className="font-medium">{usr.name}</TableCell>
                      <TableCell>{usr.email}</TableCell>
                      <TableCell>
                        <Badge variant={usr.role === 'ADMIN' ? 'default' : 'secondary'}>{usr.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usr.status === 'ACTIVE' ? 'default' : 'secondary'}>{usr.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getStoreName(usr)}</TableCell>
                      <TableCell>
                        <Badge variant={usr.pin ? 'outline' : 'secondary'} className="text-xs">
                          {usr.pin ? 'Set' : 'Not set'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(usr)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetPin(usr)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Set POS PIN
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteUser(usr.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add/Edit User Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Update user information' : 'Add a new user to the system'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser() }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                    required
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      className={errors.password ? 'border-destructive' : ''}
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                )}
                {editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password (optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(v) => handleFormChange('role', v)}>
                    <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => handleFormChange('status', v)}>
                    <SelectTrigger className={errors.status ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeId">
                    Assigned Store
                    {formData.role === 'USER' && <span className="text-amber-600 ml-1">*required for POS login</span>}
                  </Label>
                  <Select
                    value={formData.storeId || 'none'}
                    onValueChange={(v) => handleFormChange('storeId', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className={formData.role === 'USER' && !formData.storeId ? 'border-amber-400' : ''}>
                      <SelectValue placeholder="Select store (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No store (global)</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.role === 'USER' && !formData.storeId ? (
                    <p className="text-xs text-amber-600">
                      Without a store, this user cannot log in via POS PIN.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Assign to a store so this user can log in via PIN at that store&apos;s counters.
                    </p>
                  )}
                </div>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveUser}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Set POS PIN Dialog */}
          <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Set POS PIN</DialogTitle>
                <DialogDescription>
                  {pinTargetUser
                    ? `Set a 4–6 digit PIN for ${pinTargetUser.name} to log into the POS terminal.`
                    : 'Set a 4–6 digit PIN for POS login.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">New PIN (4–6 digits)</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinValue}
                    onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setPinError('') }}
                    placeholder="e.g. 1234"
                    className={pinError ? 'border-destructive' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pinConfirm">Confirm PIN</Label>
                  <Input
                    id="pinConfirm"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, '')); setPinError('') }}
                    placeholder="Re-enter PIN"
                    className={pinError ? 'border-destructive' : ''}
                  />
                </div>
                {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPinDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSavePin} disabled={pinLoading}>
                  {pinLoading ? 'Saving...' : 'Set PIN'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    </ProtectedRoute>
  )
}
