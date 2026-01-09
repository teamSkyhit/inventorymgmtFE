'use client'

import { useAuth } from '@/lib/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Package, Plus, Warehouse, FolderTree, Printer, LogOut, Menu } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Loader from '@/components/ui/loader'
import { useEffect, useState } from 'react'
import {
  subscribeToNetworkStatus,
  getActiveRequestCount,
} from '@/lib/network-tracker'

const USER_NAV_ITEMS = [
  { name: 'Add Product', href: '/add-product', icon: Plus },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Shelves', href: '/shelves', icon: Warehouse },
  { name: 'Categories', href: '/categories', icon: FolderTree },
  { name: 'Print Barcodes', href: '/print-barcodes', icon: Printer },
]

export default function UserLayout({ children }) {
  const { user, logout, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [networkBusy, setNetworkBusy] = useState(false)

  useEffect(() => {
    USER_NAV_ITEMS.forEach((item) => {
      try {
        router.prefetch?.(item.href)
      } catch (err) {
        // router.prefetch is not available during SSR
      }
    })
  }, [router])

  useEffect(() => {
    setNetworkBusy(getActiveRequestCount() > 0)
    const unsubscribe = subscribeToNetworkStatus((count) =>
      setNetworkBusy(count > 0)
    )
    return () => unsubscribe && unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Loader message="Loading your workspace..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      {networkBusy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <Loader message="Syncing data..." />
        </div>
      )}
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-28 items-center px-4 gap-4 justify-between">
          {/* Left: Mobile menu + logo */}
          <div className="flex items-center gap-3 min-w-[140px]">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link
              href="/inventory"
              className="flex items-center gap-3 font-bold"
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={96}
                height={96}
                className="w-[6rem] h-[6rem] object-contain"
              />
              <span className="text-lg sm:text-3xl">SRI OM GAYATRI POOJA STORES</span>
            </Link>
          </div>

          {/* Right: Profile */}
          <div className="flex items-center gap-2 min-w-[88px] justify-end">
            {user ? (
              <Avatar>
                <AvatarFallback>
                  {user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Loader />
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background h-[calc(100vh-7rem)] sticky top-28">
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {USER_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t bg-background sticky bottom-0">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-28 bottom-0 w-64 bg-background border-r flex flex-col">
              <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                {USER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="p-4 border-t bg-background">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}