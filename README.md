# 🛒 **E-commerce Platform**

> **A full-stack, production-ready e-commerce platform built with modern technologies**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-24-blue.svg)](https://www.docker.com/)

## 🚀 **Live Demo**

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000
- **Monitoring:** http://localhost:3000 (Grafana)

## ✨ **Features**

### 🛍️ **E-commerce Core**
- **User Authentication** - Secure JWT-based login/registration
- **Product Management** - Browse, search, and filter products
- **Shopping Cart** - Add/remove items with real-time updates
- **Order Processing** - Complete checkout with transaction safety
- **Stock Management** - Automatic inventory tracking and updates

### 🏗️ **Technical Features**
- **Full-Stack TypeScript** - Type-safe development
- **RESTful API** - Clean, documented endpoints
- **Database Transactions** - ACID compliance for orders
- **Redis Caching** - High-performance response times
- **Real-time Updates** - Live cart and inventory changes

### 📊 **Monitoring & DevOps**
- **Prometheus Metrics** - System performance monitoring
- **Grafana Dashboards** - Beautiful data visualization
- **Jenkins CI/CD** - Automated testing and deployment
- **Docker Containerization** - Easy deployment anywhere
- **Health Checks** - System status monitoring

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Caching)     │
                       └─────────────────┘
```

## 🛠️ **Tech Stack**

### **Frontend**
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls

### **Backend**
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **JWT** - Authentication tokens
- **Zod** - Schema validation
- **bcrypt** - Password hashing

### **Database & Caching**
- **PostgreSQL** - Primary database
- **Redis** - In-memory caching
- **pg** - PostgreSQL client
- **Redis** - Redis client

### **DevOps & Monitoring**
- **Docker** - Containerization
- **Docker Compose** - Multi-container setup
- **Prometheus** - Metrics collection
- **Grafana** - Data visualization
- **Jenkins** - CI/CD pipeline

## 📁 **Project Structure**

```
ecommerce-platform/
├── 📁 backend/                 # Node.js + Express backend
│   ├── 📁 src/
│   │   ├── 📁 controllers/    # Business logic
│   │   ├── 📁 routes/         # API endpoints
│   │   ├── 📁 middleware/     # Authentication & validation
│   │   ├── 📁 services/       # External services (Redis, etc.)
│   │   └── 📁 types/          # TypeScript type definitions
│   ├── 📁 tests/              # Jest test suite
│   └── package.json
├── 📁 frontend/                # React + Vite frontend
│   ├── 📁 src/
│   │   ├── 📁 pages/          # Page components
│   │   ├── 📁 components/     # Reusable components
│   │   └── 📁 api/            # API client
│   └── package.json
├── 📁 database/                # Database scripts
│   ├── 📁 migrations/         # Schema changes
│   └── 📁 seed/               # Sample data
├── 📁 monitoring/              # Prometheus + Grafana
├── 📁 docker/                  # Docker configurations
├── 📁 deploy/                  # Deployment scripts
└── 📁 docs/                    # Documentation
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### **1. Clone Repository**
```bash
git clone https://github.com/Neyoscholar/ecommerce-platform.git
cd ecommerce-platform
```

### **2. Environment Setup**
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit with your database credentials
nano backend/.env
```

### **3. Start with Docker (Recommended)**
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### **4. Manual Setup**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Database
docker-compose up postgres redis -d
```

## 🔧 **Configuration**

### **Environment Variables**

#### **Backend (.env)**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server
PORT=4000
NODE_ENV=development
```

#### **Frontend (.env)**
```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=E-commerce Platform
```

## 📚 **API Documentation**

### **Authentication**
```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

### **Products**
```http
GET  /api/products?page=1&limit=12
GET  /api/products/:id
GET  /api/products/search?q=keyword
```

### **Orders**
```http
POST /api/orders
GET  /api/orders
GET  /api/orders/:id
```

### **Admin (Protected)**
```http
POST /api/admin/products
PUT  /api/admin/products/:id
DELETE /api/admin/products/:id
GET  /api/admin/users
```

## 🧪 **Testing**

### **Run Tests**
```bash
# Backend tests
cd backend
npm test

# Test coverage
npm run test:coverage

# Frontend tests
cd frontend
npm test
```

### **Test Coverage**
- **Backend:** Jest + Supertest
- **Frontend:** Vitest + Testing Library
- **Integration:** API endpoint testing
- **Unit:** Individual function testing

## 📊 **Monitoring**

### **Access Monitoring**
- **Grafana:** http://localhost:3000 (admin/admin)
- **Prometheus:** http://localhost:9090

### **Key Metrics**
- HTTP request rate
- Response times
- Error rates
- Database performance
- Redis cache hit rate

## 🚀 **Deployment**

### **Production Deployment**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### **CI/CD Pipeline**
- **Jenkins** automation
- **Automated testing**
- **Docker image building**
- **Deployment to staging/prod**

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **Development Workflow**

```bash
# 1. Make changes
git add .

# 2. Commit with descriptive message
git commit -m "feat: add new product search functionality"

# 3. Push to GitHub
git push origin main

# 4. Jenkins automatically runs tests and builds
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Restart database
docker-compose restart postgres
```

#### **Redis Connection Failed**
```bash
# Check Redis status
docker-compose ps redis

# Restart Redis
docker-compose restart redis
```

#### **Port Already in Use**
```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 <PID>
```

## 📈 **Performance**

- **API Response Time:** < 200ms
- **Database Queries:** Optimized with indexes
- **Caching:** Redis with 60s TTL
- **Frontend:** Vite for fast builds
- **Images:** Optimized and compressed

## 🔒 **Security Features**

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt
- **Input Validation** - Zod schema validation
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Controlled cross-origin access
- **Rate Limiting** - API abuse prevention

## 📱 **Browser Support**

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Author**

**Neyoscholar** - [GitHub Profile](https://github.com/Neyoscholar)

## 🙏 **Acknowledgments**

- **Express.js** team for the amazing web framework
- **React** team for the UI library
- **PostgreSQL** team for the database
- **Redis** team for the caching solution
- **Docker** team for containerization

## 📞 **Support**

- **Issues:** [GitHub Issues](https://github.com/Neyoscholar/ecommerce-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Neyoscholar/ecommerce-platform/discussions)
- **Email:** [Your Email]

---

## ⭐ **Star This Repository**

If this project helped you, please give it a ⭐ star on GitHub!

---

**Built with ❤️ by Neyoscholar**
