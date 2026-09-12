# Scatch Web App 🛍️

A full-stack modern e-commerce web application for luxury bags built using Node.js, Express.js, MongoDB, EJS, and Tailwind CSS.

This project delivers a seamless shopping experience with secure JWT & bcrypt authentication, real-time cart quantity adjustments, one-click checkout, customer order history, and a complete administrator dashboard for managing products and inventory.

---

## 🚀 Features

- **Customer Authentication**: Secure signup and login with bcrypt salted password hashing and JWT cookies.
- **Product Catalog**: Dynamic catalog browsing with sorting (popular/newest) and discount filtering.
- **Interactive Shopping Cart**: AJAX-powered instant quantity increment/decrement, line-item totals, and real-time order calculations.
- **Checkout & Order Management**: One-click order placement with automatic order ID generation, date stamping, and persistent order history in the customer dashboard.
- **Admin Control Center**:
  - Dedicated administrator authentication with protected routes.
  - **Hardened Admin Security**: Administrator accounts **cannot** be created through the web application. Admin accounts can only be provisioned via secure server CLI.
  - Inventory management dashboard displaying current products with deletion controls.
  - Product creator with image upload (Multer memory storage) and customizable color themes (background, panel, text).
  - Bulk inventory clearing option.
- **Cloud Deployment Ready**: Preconfigured for instant deployment to Render, Railway, Heroku, or Docker with automatic proxy trust, flexible MongoDB URI parsing, and environment fallback defaults.
- **Database Seeding & Provisioning CLI**: Included starter script with pre-configured bag images, default admin seed, and dedicated CLI for provisioning admin accounts.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose
- **Frontend / Templates**: EJS, Tailwind CSS, Remix Icons
- **Security & Auth**: JSON Web Tokens (`jsonwebtoken`), `bcrypt`, `cookie-parser`, `express-session`
- **File Uploads**: `multer`
- **Testing**: Built-in end-to-end integration test suite

---

## 📂 Project Structure

```bash
scatch-web-app/
│── config/
│   ├── default.json              # Default configuration
│   ├── mongoose-connection.js    # Resilient MongoDB connection handler
│   └── multer-config.js          # Memory storage configuration for uploads
│── controllers/
│   └── authController.js         # User registration and login controllers
│── middlewares/
│   ├── isLoggedIn.js             # Customer authentication middleware
│   └── isOwnerLoggedIn.js        # Admin / Owner authentication middleware
│── models/
│   ├── owner-model.js            # Owner / Admin schema
│   ├── product-model.js          # Product schema (with Buffer image)
│   └── user-model.js             # Customer schema (with Cart & Orders)
│── public/
│   └── images/                   # Sample product image assets
│── routes/
│   ├── index.js                  # Shop, cart, checkout, and account routes
│   ├── ownersRouter.js           # Admin login, dashboard, and management
│   ├── productsRouter.js         # Product creation and deletion routes
│   └── usersRouter.js             # User auth routes
│── utils/
│   ├── create-admin.js           # Secure CLI for provisioning administrators
│   ├── generateToken.js          # JWT generator helpers
│   ├── seed.js                   # Database seed script
│   └── test-suite.js             # End-to-end integration test suite
│── views/
│   ├── partials/                 # Header & footer templates
│   ├── account.ejs               # Customer profile & past orders
│   ├── admin.ejs                 # Admin inventory dashboard
│   ├── cart.ejs                  # Shopping cart & checkout
│   ├── createproducts.ejs        # Product creation form
│   ├── index.ejs                 # Customer login & registration
│   ├── owner-login.ejs           # Admin login portal
│   └── shop.ejs                  # Product catalog
│── .env.example                  # Environment variable reference
│── app.js                        # Main Express application entrypoint
└── package.json                  # Dependencies & run scripts
```

---

## ⚙️ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Himanshupal15/scatch-web-app.git
cd scatch-web-app
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/scatch
JWT_KEY=your_jwt_secret_key_here
EXPRESS_SESSION_SECRET=your_session_secret_key_here
```

### 3. Seed Starter Products & Default Admin

Populate the database with luxury bag products and the default administrator account:

```bash
npm run seed
```

Default Admin Credentials:
- **Email**: `admin@scatch.com`
- **Password**: `admin123`

### 4. Create New Admin Accounts (CLI Only)

For security, **administrator accounts cannot be created directly through the web application**. All admin accounts must be provisioned via the server CLI:

```bash
# Interactive mode (prompts for name, email, and password):
npm run create-admin

# Or with command line arguments:
node utils/create-admin.js --name "Store Owner" --email "owner@scatch.com" --password "securepassword123"
```

### 5. Start the Application

For production / normal run:
```bash
npm start
```

For development with hot-reload:
```bash
npm run dev
```

Visit the app in your browser at:
- Customer Store: [http://localhost:3000](http://localhost:3000)
- Admin Portal: [http://localhost:3000/owners/login](http://localhost:3000/owners/login)

---

## 🧪 Automated Testing

Run the full end-to-end integration test suite verifying customer auth, shopping cart, checkout, admin security enforcement, and product management:

```bash
npm test
```

---

## ☁️ Deployment Guide

### Deploying to Render / Railway

1. Push your repository to GitHub.
2. In your deployment dashboard (e.g. [Render](https://render.com) or [Railway](https://railway.app)), create a new **Web Service**.
3. Set the build and start settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In the **Environment Variables** section, configure:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/scatch?retryWrites=true&w=majority`)
   - `JWT_KEY`: A long, random secret string
   - `EXPRESS_SESSION_SECRET`: A long, random secret string
5. Provision your admin account or seed inventory once via SSH or remote console:
   ```bash
   node utils/create-admin.js --name "Production Admin" --email "admin@scatch.com" --password "YourStrongPassword"
   node utils/seed.js
   ```
6. Open your deployed live URL and sign in!

### Deployment Troubleshooting

If the service fails during startup, verify that the hosting provider has all of these environment variables configured for the service, not only in a local `.env` file:

- `NODE_ENV=production`
- `MONGODB_URI` set to a reachable MongoDB Atlas connection string
- `JWT_KEY` set to a long random secret
- `EXPRESS_SESSION_SECRET` set to a different long random secret

The application listens on the platform-provided `PORT` and binds to `0.0.0.0`. After adding or changing environment variables, trigger a new deployment.

### Deploying to Vercel

Import the repository as a Vercel project with the repository root as the project root. Vercel uses `api/index.js` as the serverless Express entrypoint and `vercel.json` to route the application from the site root.

In Vercel Project Settings > Environment Variables, add `MONGODB_URI`, `JWT_KEY`, `EXPRESS_SESSION_SECRET`, and `NODE_ENV=production` for the Production environment. The MongoDB Atlas network settings must allow connections from Vercel.
