# Next.js + shadcn/ui Component Showcase

A beautiful, modern Next.js 15 boilerplate with shadcn/ui components, built with TypeScript and Tailwind CSS v4.

## ✨ Features

- **Next.js 15** - Latest version with App Router
- **TypeScript** - Full type safety
- **Tailwind CSS v4** - Latest version with modern CSS features
- **shadcn/ui** - Beautiful, accessible UI components
- **Dark Mode Support** - Built-in dark/light theme switching
- **Responsive Design** - Mobile-first approach
- **ESLint** - Code quality and consistency

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd image-to-pdf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Available Components

This boilerplate includes the following shadcn/ui components:

### Basic Components
- **Button** - Multiple variants (default, secondary, destructive, outline, ghost, link)
- **Card** - Content containers with header, content, and description
- **Input** - Form input fields
- **Label** - Form labels
- **Textarea** - Multi-line text input
- **Select** - Dropdown selection component

### Interactive Components
- **Dialog** - Modal dialogs
- **Sheet** - Slide-out panels
- **Dropdown Menu** - Context menus
- **Tabs** - Tabbed interfaces

### Display Components
- **Badge** - Status indicators
- **Avatar** - User profile images
- **Separator** - Visual dividers

## 🛠️ Adding More Components

To add additional shadcn/ui components:

```bash
npx shadcn@latest add <component-name>
```

### Popular Components You Might Want to Add:

```bash
# Navigation
npx shadcn@latest add navigation-menu breadcrumb

# Data Display
npx shadcn@latest add table data-table

# Feedback
npx shadcn@latest add toast alert-dialog progress

# Layout
npx shadcn@latest add accordion collapsible

# Forms
npx shadcn@latest add checkbox radio-group switch slider
```

## 🎯 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles with shadcn/ui CSS variables
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page with component showcase
├── components/             # Reusable components
│   └── ui/                # shadcn/ui components
│       ├── button.tsx     # Button component
│       ├── card.tsx       # Card component
│       ├── input.tsx      # Input component
│       └── ...            # Other components
└── lib/                   # Utility functions
    └── utils.ts           # shadcn/ui utility functions
```

## 🎨 Customization

### Colors and Themes

The project uses CSS custom properties for theming. You can customize colors in `src/app/globals.css`:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.129 0.042 264.695);
  --primary: oklch(0.208 0.042 265.755);
  /* ... more variables */
}
```

### Adding Custom Components

Create new components in `src/components/`:

```tsx
// src/components/ui/custom-component.tsx
import { cn } from "@/lib/utils"

interface CustomComponentProps {
  className?: string
  children: React.ReactNode
}

export function CustomComponent({ className, children }: CustomComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {children}
    </div>
  )
}
```

## 📱 Responsive Design

The showcase is fully responsive and includes:
- Mobile-first design approach
- Responsive grid layouts
- Adaptive component sizing
- Touch-friendly interactions

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🎯 Next Steps

1. **Customize the theme** - Modify colors and styles in `globals.css`
2. **Add more components** - Use `npx shadcn@latest add` to add new components
3. **Create your own components** - Build custom components using the existing patterns
4. **Add animations** - Integrate Framer Motion or CSS animations
5. **Add state management** - Integrate Zustand, Redux, or other state solutions

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ using Next.js, Tailwind CSS, and shadcn/ui
