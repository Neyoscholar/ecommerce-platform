import { useState, useEffect, useCallback } from 'react'
import { cartAPI, authAPI, productsAPI } from './api'
import Login from './pages/Login'
import Register from './pages/Register'
import Cart from './pages/Cart'

interface Product {
  id: number
  name: string
  description: string
  price: string
  image_url?: string
}

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'register' | 'cart'>('home')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [user, setUser] = useState(authAPI.getCurrentUser())

  // Memoize fetchProducts to prevent infinite loops
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use the productsAPI instead of fetch
      const data = await productsAPI.getProducts({ page: 1, limit: 8 })
      
      if (data && data.items) {
        setProducts(data.items)
        setError(null)
      } else {
        setError('Invalid response format from server')
      }
    } catch (err: any) {
      console.error('Error fetching products:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load products'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoize updateCartCount to prevent unnecessary re-renders
  const updateCartCount = useCallback(() => {
    setCartItemCount(cartAPI.getCartItemCount())
  }, [])

  // Fetch products when component mounts and when on home page
  useEffect(() => {
    if (currentPage === 'home') {
      fetchProducts()
    }
  }, [currentPage, fetchProducts])

  // Update cart count once when component mounts
  useEffect(() => {
    updateCartCount()
  }, []) // Only run once on mount

  // Update cart count periodically (every 10 seconds instead of every 5)
  useEffect(() => {
    const interval = setInterval(updateCartCount, 10000)
    return () => clearInterval(interval)
  }, [updateCartCount])

  const addToCart = (productId: number) => {
    cartAPI.addToCart(productId, 1)
    updateCartCount() // Update immediately when adding to cart
  }

  const handleLogout = () => {
    authAPI.logout()
    setUser(null)
    setCurrentPage('home')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login />
      case 'register':
        return <Register />
      case 'cart':
        return <Cart />
      default:
        return renderHomePage()
    }
  }

  const renderHomePage = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-gray-600 mb-4">Loading products...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <div className="text-sm text-gray-500 mt-2">This may take a few seconds</div>
            <button 
              onClick={() => {
                setLoading(false)
                setError(null)
                setTimeout(() => fetchProducts(), 100)
              }}
              className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel & Retry
            </button>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-red-600 mb-4">Error: {error}</div>
            <button 
              onClick={fetchProducts}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => {
                setError(null)
                setProducts([])
                fetchProducts()
              }}
              className="ml-3 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Reset & Retry
            </button>
          </div>
        </div>
      )
    }

    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-1 aspect-h-1 w-full">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-green-600">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <button 
                    onClick={() => addToCart(product.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        )}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 
              className="text-3xl font-bold text-gray-900 cursor-pointer"
              onClick={() => setCurrentPage('home')}
            >
              E-Commerce Platform
            </h1>
            
            <nav className="flex items-center space-x-6">
              <button
                onClick={() => setCurrentPage('home')}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Products
              </button>
              
              <button
                onClick={fetchProducts}
                disabled={loading}
                className={`text-gray-600 hover:text-gray-800 px-2 py-1 rounded text-xs border border-gray-300 hover:border-gray-400 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={loading ? 'Loading products...' : 'Refresh products'}
              >
                {loading ? '⏳' : '🔄'}
              </button>
              
              <button
                onClick={() => setCurrentPage('cart')}
                className="relative text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.first_name}!
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage('login')}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setCurrentPage('register')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Register
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>
      
      {renderPage()}
    </div>
  )
}

export default App
