import { Router } from 'express';
import { 
  // Admin middleware
  requireAdmin,
  
  // Product management
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  
  // Category management
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  
  // Dashboard
  getDashboardStats
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All admin routes require authentication AND admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Product Management
router.get('/products', getAllProductsAdmin);
router.post('/products', createProduct);
router.put('/products/:productId', updateProduct);
router.delete('/products/:productId', deleteProduct);

// Category Management
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.put('/categories/:categoryId', updateCategory);
router.delete('/categories/:categoryId', deleteCategory);

export default router;
