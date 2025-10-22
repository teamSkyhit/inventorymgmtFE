'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'sonner'

const CartContext = createContext({})

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  useEffect(() => {
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        // Check if adding more would exceed available stock
        const newQuantity = existingItem.quantity + quantity
        if (newQuantity > product.quantity) {
          toast.error(`Only ${product.quantity} units available`)
          return prevCart
        }
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      } else {
        if (quantity > product.quantity) {
          toast.error(`Only ${product.quantity} units available`)
          return prevCart
        }
        return [...prevCart, { ...product, quantity }]
      }
    })
    toast.success(`${product.name} added to cart`)
  }

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
    toast.success('Item removed from cart')
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          if (quantity > item.quantity) {
            toast.error(`Only ${item.quantity} units available in stock`)
            return item
          }
          return { ...item, quantity }
        }
        return item
      })
    )
  }

  const clearCart = () => {
    setCart([])
    toast.success('Cart cleared')
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartItemsCount,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)