"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ordersController_1 = require("../controllers/ordersController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All order routes require authentication
router.use(auth_1.authenticateToken);
// Create a new order
router.post('/', ordersController_1.createOrder);
// Get current user's orders
router.get('/my-orders', ordersController_1.getUserOrders);
// Get specific order details (for current user)
router.get('/:orderId', ordersController_1.getOrderDetails);
// Admin routes
router.get('/admin/all', ordersController_1.getAllOrders);
router.patch('/admin/:orderId/status', ordersController_1.updateOrderStatus);
exports.default = router;
