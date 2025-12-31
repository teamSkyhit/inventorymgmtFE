'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import Loader from '@/components/ui/loader'
import { loginSchema, formatZodError, getFieldErrors } from '@/lib/validations'
import logger from '@/lib/logger'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login, user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const userRole = user.role?.toLowerCase()
      if (userRole === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/inventory')
      }
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      // Validate input
      const validationResult = loginSchema.safeParse({
        email,
        password,
        role,
      })

      if (!validationResult.success) {
        const fieldErrors = getFieldErrors(validationResult.error)
        setErrors(fieldErrors)
        const firstError = formatZodError(validationResult.error)
        toast.error(firstError)
        setLoading(false)
        return
      }

      const validatedData = validationResult.data
      logger.info('Login attempt:', { email: validatedData.email, role: validatedData.role })

      const result = await login(validatedData.email, validatedData.password, validatedData.role)
      
      if (!result.success) {
        logger.warn('Login failed:', result.message)
        toast.error(result.message || 'Login failed')
        setLoading(false)
      } else {
        logger.info('Login successful:', { email: validatedData.email, role: validatedData.role })
        toast.success('Login successful!')
        // Don't set loading to false here as redirect is happening
      }
    } catch (error) {
      logger.error('Login error:', error)
      toast.error('An error occurred during login')
      setLoading(false)
    }
  }

  // Show loading state while checking auth
  const isBlocking = authLoading || loading

  if (isBlocking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader message={authLoading ? 'Preparing your account...' : 'Signing you in...'} />
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader message="Redirecting..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={128}
              height={128}
              className="w-[8rem] h-[8rem] object-contain"
            />
          </div>
          <CardDescription>Welcome back! Please login to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email/Username</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors({ ...errors, email: null })
                }}
                className={errors.email ? 'border-destructive' : ''}
                required
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: null })
                }}
                className={errors.password ? 'border-destructive' : ''}
                required
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">General User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}