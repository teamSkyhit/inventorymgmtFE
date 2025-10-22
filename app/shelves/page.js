'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/protected-route'
import AdminLayout from '@/components/admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Warehouse } from 'lucide-react'
import { mockShelves, mockProducts } from '@/lib/mock-data'

export default function ShelvesPage() {
  const [selectedShelf, setSelectedShelf] = useState(null)

  const getProductsForShelf = (shelfId) => {
    return mockProducts.filter(product => product.shelf === shelfId)
  }

  const shelfProducts = selectedShelf ? getProductsForShelf(selectedShelf) : []

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Shelf Management</h1>
            <p className="text-muted-foreground">View and manage warehouse shelf locations</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shelf Locations */}
            <Card>
              <CardHeader>
                <CardTitle>Shelf Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {mockShelves.map((shelf) => (
                    <Button
                      key={shelf.id}
                      variant={selectedShelf === shelf.id ? 'default' : 'outline'}
                      className="h-24 flex flex-col items-center justify-center"
                      onClick={() => setSelectedShelf(shelf.id)}
                    >
                      <Warehouse className="h-8 w-8 mb-2" />
                      <div className="font-bold text-lg">{shelf.name}</div>
                      <div className="text-xs">{shelf.productCount} items</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Products in Selected Shelf */}
            <Card>
              <CardHeader>
                <CardTitle>Select a Shelf to View Products</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedShelf ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Warehouse className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>Please select a shelf from the left to view its contents.</p>
                  </div>
                ) : shelfProducts.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Shelf {selectedShelf}</h3>
                      <p className="text-sm text-muted-foreground">{shelfProducts.length} products</p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shelfProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-muted-foreground">{product.category}</TableCell>
                              <TableCell>{product.quantity}</TableCell>
                              <TableCell>${product.price.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No products on shelf {selectedShelf}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}