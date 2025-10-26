# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev:webpack` - Start development server with webpack (recommended for stability)
- `npm run dev` - Start development server with Turbopack (may have API runtime issues)
- `npm run build` - Build the production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality

### Installation
- `npm install` - Install all dependencies

### Square Integration
- `npm run seed-square` - Seed Square catalog with menu items
- `npm run clear-and-reseed` - Clear and reseed Square catalog
- `npm run init-taxes` - Initialize Square sandbox tax configuration

### Inventory Management
- `npm run seed-inventory` - Seed database with inventory items matching menu items

### Admin Features
- **Inventory Management**: Complete inventory tracking with stock levels, alerts, and restock functionality
- **Suppliers Management**: Full CRUD operations for suppliers with contact information and payment terms
- **Menu Management**: Square integration for menu items and categories management
- **Order Management**: View and manage customer orders with status tracking

## Architecture

This is a Next.js 15 cafe website built with:

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Framer Motion (installed but not heavily used)
- **Font**: Inter (Google Fonts)

### Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata and Inter font
│   ├── page.tsx         # Main homepage with all sections (Hero, About, Menu, Gallery, Contact)
│   └── globals.css      # Global Tailwind styles
└── components/
    └── Navigation.tsx   # Fixed navigation with mobile menu
```

### Key Features

- **Single Page Application**: All content on homepage with smooth scrolling navigation
- **Gallery**: Dynamic lightbox modal for Starbucks slideshow images (33 images in `/public/images/starbucks-slideshow/`)
- **Menu**: Comprehensive cafe menu with breakfast, pastries, drinks, and pricing
- **Responsive**: Mobile-first design with responsive navigation
- **Images**: Located in `/public/images/` including cafe photos and product slideshow

### Code Conventions

- Client components use `'use client'` directive
- TypeScript strict mode enabled
- Path aliases: `@/*` maps to `./src/*`
- Component naming: PascalCase for components, camelCase for variables
- Styling: Tailwind classes with amber/orange color scheme
- Image optimization through Next.js Image component

### Business Context

Little Cafe is located inside Kaiser Permanente medical complex at 10400 E Alameda Ave, Denver, CO. Hours: 8AM-6PM Monday-Friday. The site features actual menu items, pricing, and location details that should be preserved when making updates.