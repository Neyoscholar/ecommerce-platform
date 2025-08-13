"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/server.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // load .env before anything else
const app_1 = __importDefault(require("./app"));
const port = Number(process.env.PORT || 4000);
app_1.default.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
