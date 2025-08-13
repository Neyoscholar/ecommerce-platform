"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All admin routes require authentication AND admin role
router.use(auth_1.authenticateToken);
router.use(adminController_1.requireAdmin);
// Dashboard
router.get('/dashboard', adminController_1.getDashboardStats);
// Product Management
router.get('/products', adminController_1.getAllProductsAdmin);
router.post('/products', adminController_1.createProduct);
router.put('/products/:productId', adminController_1.updateProduct);
router.delete('/products/:productId', adminController_1.deleteProduct);
// Category Management
router.get('/categories', adminController_1.getAllCategories);
router.post('/categories', adminController_1.createCategory);
router.put('/categories/:categoryId', adminController_1.updateCategory);
router.delete('/categories/:categoryId', adminController_1.deleteCategory);
exports.default = router;
