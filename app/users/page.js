'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/protected-route'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { usersAPI } from '@/lib/api'
import { userSchema, formatZodError, getFieldErrors } from '@/lib/validations'
import logger from '@/lib/logger'
import Loader from '@/components/ui/loader'

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    status: 'ACTIVE'
  })

  useEffect(() => {
    if (user?.token) {
      fetchUsers()
    }
  }, [user?.token])

  const fetchUsers = async () => {
    if (!user?.token) return
    try {
      setLoading(true)
      const response = await usersAPI.getAll(user.token)
      if (response.success) {
        setUsers(response.data || [])
      } else {
        toast.error(response.message || 'Failed to load users')
      }
    } catch (error) {
      logger.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setErrors({})
    setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE' })
    setIsDialogOpen(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setErrors({})
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't pre-fill password
      role: user.role || 'USER',
      status: user.status || 'ACTIVE'
    })
    setIsDialogOpen(true)
  }

  const handleSaveUser = async () => {
    setErrors({})
    if (!user?.token) {
      toast.error('You must be logged in')
      return
    }

    try {
      // Validate input
      const dataToValidate = {
        ...formData,
        role: formData.role.toUpperCase(),
        status: formData.status.toUpperCase(),
      }

      // For edit, password is optional
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

      const validatedData = validationResult.data

      if (editingUser) {
        // Update user
        const updateData = { ...validatedData }
        if (!updateData.password) {
          delete updateData.password
        }
        const response = await usersAPI.update(editingUser.id, updateData, user.token)
        if (response.success) {
          logger.info('User updated successfully:', { id: editingUser.id })
          toast.success('User updated successfully')
          setIsDialogOpen(false)
          fetchUsers()
        } else {
          logger.error('User update failed:', response.message)
          toast.error(response.message || 'Failed to update user')
        }
      } else {
        // Create user
        const response = await usersAPI.create(validatedData, user.token)
        if (response.success) {
          logger.info('User created successfully:', { email: validatedData.email })
          toast.success('User added successfully')
          setIsDialogOpen(false)
          fetchUsers()
        } else {
          logger.error('User creation failed:', response.message)
          toast.error(response.message || 'Failed to create user')
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
        logger.info('User deleted successfully:', { id: userId })
        toast.success('User deleted successfully')
        fetchUsers()
      } else {
        logger.error('User deletion failed:', response.message)
        toast.error(response.message || 'Failed to delete user')
      }
    } catch (error) {
      logger.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader message="Loading users..." />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage system users and permissions</p>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((usr) => (
                    <TableRow key={usr.id}>
                      <TableCell className="font-medium">{usr.name}</TableCell>
                      <TableCell>{usr.email}</TableCell>
                      <TableCell>
                        <Badge variant={usr.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {usr.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usr.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {usr.status}
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
              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                    required
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
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
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
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
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
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
                      className={errors.password ? 'border-destructive' : ''}
                      placeholder="Leave blank to keep current password"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => handleFormChange('role', value)}>
                    <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleFormChange('status', value)}>
                    <SelectTrigger className={errors.status ? 'border-destructive' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-destructive">{errors.status}</p>
                  )}
                </div>
              </form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveUser}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}