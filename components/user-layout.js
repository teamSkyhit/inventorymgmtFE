'use client'

import { useAuth } from '@/lib/auth-context'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Scan, TrendingUp, User as UserIcon, Package } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function UserLayout({ children }) {
  const { user } = useAuth()
  const pathname = usePathname()

  const navigation = [
    { name: 'Scan', href: '/scan', icon: Scan },
    { name: 'Update Sale', href: '/update-sale', icon: TrendingUp },
    { name: 'Profile', href: '/profile', icon: UserIcon }
  ]

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 justify-between">
          <Link href="/scan" className="flex items-center gap-2 font-bold text-xl">
            <Package className="h-6 w-6 text-primary" />
            <span>UniTrackInventory</span>
          </Link>
          <Avatar>
            <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex items-center justify-around h-16">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 flex-1 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}