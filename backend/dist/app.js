"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json());
app.get('/healthz', async (_req, res) => {
    try {
        await (0, db_1.healthDb)();
        res.json({ ok: true });
    }
    catch {
        res.status(500).json({ ok: false });
    }
});
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
});
exports.default = app;
