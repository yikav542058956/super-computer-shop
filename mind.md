# 🧠 Project Mind Map — Super Computer

> Last analyzed: June 30, 2026

---

## 📌 Project क्या है?

**Super Computer** एक e-commerce web app है जो laptops और computer accessories बेचने के लिए बनाया गया है।
इसमें customer-facing storefront और एक full admin dashboard दोनों हैं।

---

## 🗂️ Monorepo Structure

```
workspace/
├── artifacts/
│   ├── super-computer/       ← React frontend (main app, preview path: /)
│   ├── api-server/           ← Express backend (preview path: /api)
│   └── mockup-sandbox/       ← UI component preview (preview path: /__mockup)
│
├── lib/
│   ├── db/                   ← Drizzle ORM + PostgreSQL config (currently unused, schema empty)
│   ├── api-spec/             ← OpenAPI YAML contract
│   ├── api-client-react/     ← Orval-generated React Query hooks
│   └── api-zod/              ← Orval-generated Zod schemas
│
├── scripts/                  ← Utility scripts
├── vercel.json               ← Vercel deploy config
├── .vercel/project.json      ← Vercel project ID
├── pnpm-workspace.yaml       ← Workspace + catalog pins
├── tsconfig.base.json        ← Shared strict TS config
└── tsconfig.json             ← Root solution file (libs only)
```

---

## 🎨 Frontend — `artifacts/super-computer`

**Package:** `@workspace/super-computer`
**Tech:** React 18 + Vite + Tailwind CSS + Radix UI + Wouter (routing) + Firebase

### 📁 Source Structure

```
src/
├── main.tsx              ← Entry point
├── App.tsx               ← All routes defined here
├── index.css             ← Global styles
├── pages/
│   ├── Home.tsx
│   ├── ProductListing.tsx
│   ├── ProductDetail.tsx
│   ├── Cart.tsx
│   ├── Wishlist.tsx
│   ├── Checkout.tsx
│   ├── Login.tsx
│   ├── Profile.tsx
│   ├── About.tsx
│   ├── Contact.tsx
│   ├── not-found.tsx
│   └── admin/            ← Admin panel pages
├── components/
│   ├── auth/             ← Auth-related components
│   ├── layout/           ← Header, Footer, Layout wrappers
│   ├── ui/               ← Radix UI + shadcn components
│   └── WhatsAppButton.tsx
├── contexts/
│   ├── AuthContext.tsx    ← Firebase Auth state
│   ├── CartContext.tsx    ← Cart state management
│   └── WishlistContext.tsx
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
└── lib/                  ← Utility functions
```

### 🛣️ Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Public | Home page |
| `/products` | Public | Product listing |
| `/products/:id` | Public | Product detail |
| `/cart` | Public | Shopping cart |
| `/wishlist` | Public | Wishlist |
| `/login` | Public | Login / OTP auth |
| `/about` | Public | About page |
| `/contact` | Public | Contact page |
| `/checkout` | Protected | Checkout (login required) |
| `/profile` | Protected | User profile |
| `/admin/login` | Public | Admin login |
| `/admin/dashboard` | Admin | Dashboard overview |
| `/admin/products` | Admin | Product management |
| `/admin/orders` | Admin | Order management |
| `/admin/categories` | Admin | Category management |
| `/admin/banners` | Admin | Banner management |
| `/admin/customers` | Admin | Customer list |
| `/admin/coupons` | Admin | Coupon management |
| `/admin/reviews` | Admin | Review moderation |
| `/admin/reports` | Admin | Sales reports (Recharts) |
| `/admin/settings` | Admin | App settings |
| `/admin/announcements` | Admin | Announcements |

### 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `firebase` | Auth + Realtime Database (primary storage) |
| `wouter` | Client-side routing |
| `@radix-ui/*` | UI primitives (30+ packages) |
| `tailwindcss` | Styling |
| `framer-motion` | Animations |
| `recharts` | Admin charts/reports |
| `react-hook-form` | Form management |
| `@tanstack/react-query` | Server state / API calls |
| `embla-carousel-react` | Product image carousel |
| `input-otp` | OTP input component |
| `sonner` | Toast notifications |
| `cloudinary` | Image uploads (`upload_preset: "ml_default"`) |

---

## ⚙️ Backend — `artifacts/api-server`

**Package:** `@workspace/api-server`
**Tech:** Express 5 + TypeScript + esbuild (CJS bundle) + Pino (logging)

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/healthz` | Health check — returns `{ status: "ok" }` |
| `GET` | `/api/proxy/sendotp?phone=XXXXXXXXXX` | OTP भेजना — external service को proxy करता है |
| `GET` | `/api/proxy/otpverify?phone=...&otp=...&device_id=...` | OTP verify करना |

### Proxy Target
```
https://rozgarapinew.teachx.in/get
auth-key: appxapi
origin: https://www.rojgarwithankit.co.in
```
> API server सिर्फ OTP proxy का काम करता है। Firebase सीधे frontend से connect होता है।

### Source Structure
```
src/
├── index.ts          ← Server entry, PORT env bind
├── app.ts            ← Express setup, CORS, pino-http
├── routes/
│   ├── index.ts      ← Route aggregator
│   ├── health.ts     ← /healthz
│   └── proxy.ts      ← /proxy/sendotp + /proxy/otpverify
├── middlewares/      ← Custom middlewares
└── lib/
    └── logger.ts     ← Pino logger singleton
```

---

## 🔥 Firebase (Primary Database)

App **PostgreSQL/Drizzle use नहीं करता** — वो infra है लेकिन schema अभी खाली है।
असली data **Firebase Realtime Database** में है।

### Firebase Data Structure

```
Firebase Realtime DB
├── users/{uid}
│   ├── name, email, role, phone
│   └── wishlist: []
├── categories/{id}
│   ├── name, displayOrder, image
├── products/{id}
│   ├── name, brand, category, price, discountPrice
│   ├── stock, description
│   ├── specs: {}
│   ├── images: []
│   ├── rating, reviewsCount
│   ├── isFeatured, isNewArrival, status
├── banners/{id}
│   ├── title, subtitle, buttonText, buttonLink
│   ├── imageUrl, order, isActive
├── coupons/{code}
│   ├── code, discountType, discountValue
│   ├── minOrderValue, isActive, maxUses, usedCount
└── orders/{id}
    └── (order details, purchase history, status)
```

### Firebase Auth
- Phone OTP login (via proxy API + Firebase Phone Auth)
- Role-based: `user` / `admin`

---

## 🖼️ Image Storage — Cloudinary

- Upload preset: `ml_default`
- Admin panel से product/banner images upload होती हैं

---

## 🚀 Deployment (Vercel)

**यह project Vercel पर deploy हुआ है।**

### Vercel Config (`vercel.json`)
```json
{
  "buildCommand": "PORT=3000 BASE_PATH=/ pnpm --filter @workspace/super-computer run build",
  "outputDirectory": "artifacts/super-computer/dist/public",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Vercel Project Details (`.vercel/project.json`)
```json
{
  "projectId":   "prj_ThwkqaaMLZk232khHOehPj2SxM75",
  "orgId":       "team_KQAwALG1UUnsjBLdOpqQpDMz",
  "projectName": "super-computer"
}
```

### क्या deploy होता है?
| Item | Deploy होता है? | Notes |
|------|----------------|-------|
| `artifacts/super-computer` | ✅ हाँ | Main React app — Vercel पर static build |
| `artifacts/api-server` | ❌ नहीं | Vercel config में नहीं है |
| Database (PostgreSQL) | ❌ नहीं | Schema खाली है |
| Firebase | ✅ हाँ | Firebase cloud पर, frontend से directly connect |

> ⚠️ **API server Vercel deploy में नहीं है।** Production में OTP proxy काम नहीं करेगा जब तक api-server अलग से deploy न हो।

---

## 🔧 Shared Libraries (`lib/`)

| Package | Status | Purpose |
|---------|--------|---------|
| `@workspace/db` | ⚠️ Schema खाली | Drizzle ORM + PostgreSQL (infra ready, data नहीं) |
| `@workspace/api-spec` | ✅ | OpenAPI YAML — सिर्फ `/healthz` define है |
| `@workspace/api-client-react` | ✅ | React Query hooks (generated from spec) |
| `@workspace/api-zod` | ✅ | Zod schemas (generated from spec) |

---

## 🛠️ Key Commands

```bash
# Frontend dev
pnpm --filter @workspace/super-computer run dev

# API server dev
pnpm --filter @workspace/api-server run dev

# DB schema push (dev only)
pnpm --filter @workspace/db run push

# API codegen (OpenAPI → hooks + Zod)
pnpm --filter @workspace/api-spec run codegen

# Full typecheck
pnpm run typecheck
```

---

## ⚠️ Important Gotchas

1. **Firebase primary है, PostgreSQL secondary** — schema अभी खाली है, data Firebase में है
2. **API server Vercel deploy में नहीं** — अगर OTP production में चाहिए तो api-server को अलग deploy करना होगा
3. **Drizzle infra तैयार है** — `DATABASE_URL` env चाहिए, लेकिन app अभी use नहीं कर रहा
4. **`console.log` मत लगाओ server में** — `req.log` और `logger` use करो
5. **Paths rewire होते हैं** — Vercel पर सब `/index.html` पर जाता है (SPA)
6. **`PORT` env variable जरूरी है** — api-server बिना इसके crash करेगा

---

## 📊 Summary

```
App Type:        E-commerce (Laptops & Computer Accessories)
Frontend:        React + Vite + Tailwind + Firebase
Backend:         Express 5 (OTP proxy only)
Auth:            Firebase Phone Auth (OTP)
Storage:         Firebase Realtime Database
Images:          Cloudinary
Deployment:      Vercel (frontend only)
Vercel Project:  super-computer (prj_ThwkqaaMLZk232khHOehPj2SxM75)
Last Deployed:   June 30, 2026 (based on .vercel config)
```
