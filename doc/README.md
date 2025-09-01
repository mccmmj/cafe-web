# Little Cafe Website

A beautiful, modern website for Little Cafe built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Modern Design** - Clean, professional design with warm cafe aesthetics
- 📱 **Mobile Responsive** - Perfect on all devices
- ⚡ **Fast Performance** - Built with Next.js for optimal speed
- 🔍 **SEO Optimized** - Search engine friendly
- 🎯 **Easy Navigation** - Smooth scrolling between sections
- 📸 **Gallery Ready** - Placeholder sections for your photos

## Sections

1. **Hero Section** - Eye-catching welcome with call-to-action buttons
2. **About Us** - Your cafe's story and mission
3. **Menu** - Interactive menu with hot drinks, cold drinks, and pastries
4. **Gallery** - Showcase your cafe, drinks, and pastries
5. **Contact** - Location, hours, and contact information

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the website directory:
   ```bash
   cd website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Customization Guide

### 1. Update Content

#### Cafe Information
- Edit `src/app/page.tsx` to update:
  - Cafe name and taglines
  - About section content
  - Menu items and prices
  - Contact information
  - Business hours

#### Colors and Branding
- Modify the color scheme in `src/app/page.tsx`:
  - Primary color: `amber-600` (can be changed to match your brand)
  - Background colors: `amber-50`, `orange-100`
  - Text colors: `gray-900`, `gray-600`

### 2. Add Your Photos

#### Replace Placeholder Images
The website currently has placeholder sections for images. To add your photos:

1. Create a `public/images` folder
2. Add your images (recommended formats: .jpg, .png, .webp)
3. Replace placeholder sections with actual images:

```jsx
// Example: Replace placeholder with actual image
<Image 
  src="/images/cafe-interior.jpg" 
  alt="Little Cafe Interior"
  width={400}
  height={300}
  className="rounded-2xl"
/>
```

#### Recommended Photos
- Cafe interior/exterior shots
- Coffee and drink photos
- Pastry and food images
- Staff and customer photos
- Atmosphere shots

### 3. Update Menu

Edit the menu section in `src/app/page.tsx` to reflect your actual menu items, descriptions, and prices.

### 4. Contact Information

Update the contact section with:
- Your actual address
- Real phone number
- Correct business hours
- Social media links

## Deployment

### Option 1: Vercel (Recommended - Free)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically

### Option 2: Netlify

1. Build the project: `npm run build`
2. Deploy the `out` folder to Netlify

### Option 3: Other Hosting

1. Build the project: `npm run build`
2. Upload the `out` folder to your hosting provider

## File Structure

```
website/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Main layout and metadata
│   │   ├── page.tsx        # Homepage content
│   │   └── globals.css     # Global styles
│   └── components/
│       └── Navigation.tsx  # Navigation component
├── public/                 # Static assets (images, etc.)
├── package.json
└── README.md
```

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Framer Motion** - Animations (ready to use)

## Performance Features

- ✅ Image optimization
- ✅ Code splitting
- ✅ SEO optimization
- ✅ Mobile-first design
- ✅ Fast loading times

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Support

For questions or customization help, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

## License

This project is created for Little Cafe. Feel free to customize and use for your business.

---

**Little Cafe** - Where every cup tells a story ☕
