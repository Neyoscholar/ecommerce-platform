import { Router } from 'express';
import { 
  createOrder, 
  getUserOrders, 
  getOrderDetails, 
  updateOrderStatus, 
  getAllOrders 
} from '../controllers/ordersController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All order routes require authentication
router.use(authenticateToken);

// Create a new order
router.post('/', createOrder);

// Get current user's orders
router.get('/my-orders', getUserOrders);

// Get specific order details (for current user)
router.get('/:orderId', getOrderDetails);

// Admin routes
router.get('/admin/all', getAllOrders);
router.patch('/admin/:orderId/status', updateOrderStatus);

export default router;
