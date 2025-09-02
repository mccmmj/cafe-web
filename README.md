# Cafe Management System

A comprehensive cafe management platform built with Next.js 15, featuring Square integration for payments, real-time inventory management, order processing, and administrative tools.

## 🚀 Features

### Customer-Facing
- 🎨 **Modern Website** - Clean, professional design with warm cafe aesthetics
- 📱 **Mobile Responsive** - Perfect on all devices
- 🛒 **Order Management** - Browse menu, add to cart, and place orders
- 💳 **Square Payments** - Secure payment processing with Square Web Payments SDK
- 👤 **User Profiles** - Customer accounts with order history and favorites
- 📧 **Email Receipts** - Automated order confirmations via Resend
- 📱 **Real-time Updates** - Live order status and notifications

### Admin Dashboard
- 📊 **Inventory Management** - Real-time stock tracking with low-stock alerts
- 🔄 **Square Integration** - Bidirectional sync with Square catalog and inventory
- 📋 **Order Management** - View, update, and manage customer orders
- 🏪 **Supplier Management** - Track suppliers and purchase orders
- 📈 **Analytics Dashboard** - Comprehensive business insights and reports
- 🧾 **Invoice Processing** - AI-powered invoice scanning and matching
- ⚙️ **Settings & Configuration** - Manage locations, units, and system settings

### Technical Features
- ⚡ **Real-time Webhooks** - Square catalog and inventory synchronization
- 🤖 **AI Integration** - OpenAI for invoice processing and data extraction
- 🔐 **Role-based Access** - Admin authentication and authorization
- 📊 **Comprehensive Reporting** - Export data and analytics
- 🔄 **Hybrid Sync** - Combine Square data with local enrichments
- 📱 **Progressive Web App** - Mobile-optimized experience

## 🛠 Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Payments**: Square Web Payments SDK
- **Email**: Resend API
- **AI**: OpenAI GPT for invoice processing
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Font**: Inter (Google Fonts)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Square Developer Account (sandbox/production)
- Supabase Account
- Resend Account (for emails)
- OpenAI API Key (for invoice processing)

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install

# Or with legacy peer deps if needed
npm install --legacy-peer-deps
```

### 2. Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

# Square Configuration
SQUARE_ENVIRONMENT=sandbox # or 'production'
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# Client-side Square (required for Web Payments SDK)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your_square_application_id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your_square_location_id

# OpenAI (for invoice processing)
OPENAI_API_KEY=your_openai_api_key

# Email Service
RESEND_API_KEY=your_resend_api_key

# Application Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Database Setup

Set up your Supabase database with the required tables. The system includes:
- `profiles` - User accounts and roles
- `inventory_items` - Product inventory tracking
- `suppliers` - Supplier management
- `stock_movements` - Inventory change tracking
- `low_stock_alerts` - Automated alerts
- `orders` - Customer orders
- `webhook_events` - Square webhook audit trail

### 4. Development Commands

```bash
# Start development server (recommended)
npm run dev:webpack

# Alternative development server (may have API issues)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### 5. Square Integration Setup

```bash
# Seed Square catalog with menu items
npm run seed-square

# Clear and reseed Square catalog
npm run clear-and-reseed

# Initialize Square sandbox tax configuration
npm run init-taxes

# Seed local inventory to match Square items
npm run seed-inventory
```

## 📁 Project Structure

```
website/
├── src/
│   ├── app/
│   │   ├── admin/              # Admin dashboard pages
│   │   │   ├── analytics/      # Business analytics
│   │   │   ├── inventory/      # Inventory management
│   │   │   ├── menu/          # Menu management
│   │   │   ├── orders/        # Order management
│   │   │   └── suppliers/     # Supplier management
│   │   ├── api/               # API routes
│   │   │   ├── admin/         # Admin API endpoints
│   │   │   ├── square/        # Square API integration
│   │   │   └── webhooks/      # Webhook handlers
│   │   ├── auth/              # Authentication pages
│   │   ├── cart/              # Shopping cart
│   │   ├── checkout/          # Checkout process
│   │   ├── menu/              # Public menu
│   │   ├── orders/            # Order tracking
│   │   └── profile/           # User profile
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Utility libraries
│   │   └── services/          # Service layer
│   └── styles/               # Global styles
├── public/
│   └── images/               # Static images
├── scripts/                  # Build and deployment scripts
└── docs/                    # Documentation
```

## 🔧 Key Features Deep Dive

### Inventory Management
- **Real-time Tracking**: Live inventory updates with Square synchronization
- **Low Stock Alerts**: Automated notifications when items run low
- **Supplier Management**: Track suppliers, contacts, and purchase orders
- **Stock Movements**: Complete audit trail of all inventory changes
- **Bulk Operations**: Upload and manage inventory in bulk
- **Analytics**: Comprehensive reporting and insights

### Square Integration
- **Bidirectional Sync**: Real-time webhooks for catalog and inventory updates
- **Payment Processing**: Secure payments with Square Web Payments SDK
- **Order Management**: Seamless order processing and tracking
- **Webhook Handling**: Robust webhook processing with signature verification
- **Sandbox/Production**: Easy switching between environments

### Admin Dashboard
- **Role-based Access**: Secure admin authentication and authorization
- **Comprehensive Analytics**: Business insights, sales reports, and trends
- **Order Management**: View, update, and manage all customer orders
- **Menu Management**: Update items, prices, and availability
- **Settings**: Configure locations, units, taxes, and system preferences

### AI-Powered Features
- **Invoice Processing**: OCR and AI extraction of invoice data
- **Smart Matching**: Automatically match invoice items to inventory
- **Data Enrichment**: AI-assisted data entry and validation

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Connect to Vercel**: Import your repository to Vercel
3. **Environment Variables**: Add all required environment variables in Vercel dashboard
4. **Deploy**: Automatic deployment on every push

### Environment Variables for Production

Make sure to update these for production deployment:
- `SQUARE_ENVIRONMENT=production`
- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
- Use production Square credentials
- Configure production webhook URLs

## 🔄 Development Workflow

### For Square Integration
1. Use sandbox environment for development
2. Test webhook endpoints locally with tools like ngrok
3. Verify payment flows in Square sandbox
4. Test inventory synchronization

### For Database Changes
1. Update Supabase schema as needed
2. Test migrations in development
3. Update TypeScript types
4. Run database seeders

### For API Development
1. All API routes are in `src/app/api/`
2. Use TypeScript for type safety
3. Include proper error handling
4. Add authentication where required

## 🧪 Testing

### Manual Testing Checklist
- [ ] Customer can browse menu and place orders
- [ ] Payment processing works correctly
- [ ] Admin can manage inventory and view analytics
- [ ] Square webhooks update local inventory
- [ ] Email receipts are sent successfully
- [ ] All responsive breakpoints work

### API Testing
- Use the built-in API documentation endpoints (GET requests)
- Test webhook endpoints with Square's webhook testing tools
- Verify authentication and authorization

## 📚 API Documentation

The system includes self-documenting API endpoints. Send GET requests to any API route for documentation:

- `GET /api/admin/inventory` - Inventory management API docs
- `GET /api/square/config` - Square integration docs
- `GET /api/webhooks/square/catalog` - Webhook documentation

## 🔐 Security Features

- **Environment Variable Validation**: Runtime validation prevents build failures
- **Webhook Signature Verification**: Secure webhook processing
- **Role-based Access Control**: Admin-only endpoints protected
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Comprehensive request validation

## 🐛 Common Issues & Solutions

### Build Errors
- Use `npm install --legacy-peer-deps` for dependency conflicts
- Ensure all environment variables are properly configured
- Check TypeScript compilation errors

### Square Integration
- Verify webhook URLs are accessible from Square
- Check Square application permissions
- Ensure location IDs match between environments

### Deployment Issues
- Use runtime environment variable validation
- Check Vercel function timeout limits
- Verify all required environment variables are set

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is created as a comprehensive cafe management solution. Feel free to customize and use for your business.

---

**Cafe Management System** - Complete cafe management solution ☕