# Marketo AI — Full Project Documentation

> **D2C Growth Suite** — AI-powered marketing platform for social media scheduling, AI content generation, campaign analytics, and multi-platform posting.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Models](#6-database-models)
7. [API Reference](#7-api-reference)
8. [Authentication System](#8-authentication-system)
9. [Social Media Integrations](#9-social-media-integrations)
10. [AI Features](#10-ai-features)
11. [Dashboard & Analytics](#11-dashboard--analytics)
12. [Environment Variables](#12-environment-variables)
13. [Deployment Guide (Render)](#13-deployment-guide-render)
14. [Cost & Revenue Model](#14-cost--revenue-model)

---

## 1. Project Overview

Marketo AI is a full-stack web app designed for D2C (Direct-to-Consumer) brands to:

- **Schedule and auto-post** content on Facebook, Instagram, LinkedIn, and YouTube
- **Generate AI content** — ad copy (Gemini), images (Gemini Image), and video ads (Veo)
- **Track campaigns** with ROI, ROAS, CAC, revenue, and spend analytics
- **Monitor engagement** — likes, comments, shares, views synced live from platform APIs
- **Dashboard** — unified view of all posted + history content with per-post revenue breakdown

---

## 2. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM modules) |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI | Google Gemini API (text + image + video) |
| Social APIs | Facebook Graph API, Instagram Graph API, LinkedIn REST API |
| Media Hosting | Catbox.moe (free, no setup) or Cloudinary |
| Rate Limiting | express-rate-limit |
| CORS | cors (dynamic origin — allows all `*.onrender.com`) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 (Vite) |
| Styling | Vanilla CSS (custom design system with CSS variables) |
| State | React Context + useState/useEffect hooks |
| API | Fetch API with JWT Bearer token |
| Routing | Single-page app (in-app navigation state) |

---

## 3. Project Structure

```
marketo-ai/
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   ├── corsOptions.js         # CORS config (allows *.onrender.com)
│   │   └── aiCosts.js             # AI generation cost constants (INR)
│   ├── controllers/
│   │   ├── authController.js      # Signup, login, logout, create client
│   │   ├── campaignController.js  # Campaign CRUD + auto-status
│   │   ├── socialController.js    # Posts CRUD + auto-posting + engagement sync
│   │   ├── aiController.js        # Copy/image/video generation + usage tracking
│   │   └── linkedinController.js  # LinkedIn OAuth flow
│   ├── services/
│   │   ├── facebookService.js     # Facebook Graph API post publishing
│   │   ├── instagramService.js    # Instagram Graph API post publishing
│   │   ├── linkedinService.js     # LinkedIn post publishing
│   │   ├── engagementService.js   # Live engagement sync (likes/comments/shares)
│   │   ├── autoCampaignService.js # Auto "AI usage & social" campaign computation
│   │   ├── geminiService.js       # Gemini text generation
│   │   ├── imageService.js        # Gemini image generation
│   │   ├── videoService.js        # Veo video generation
│   │   ├── mediaHostService.js    # Media upload (Catbox/Cloudinary)
│   │   └── linkedinOAuthService.js# LinkedIn OAuth token exchange
│   ├── models/
│   │   ├── User.js                # User schema (bcrypt password hash)
│   │   ├── Campaign.js            # Campaign schema
│   │   ├── Post.js                # Social post schema
│   │   ├── Generation.js          # AI generation history schema
│   │   └── YouTubePost.js         # YouTube post schema
│   ├── middleware/
│   │   ├── auth.js                # requireAuth — JWT verification
│   │   ├── errorHandler.js        # Global error handler
│   │   └── rateLimit.js           # General (1000/15min) + AI (20/min) limiters
│   ├── routes/
│   │   ├── auth.js                # /api/auth/*
│   │   ├── campaigns.js           # /api/campaigns/*
│   │   ├── social.js              # /api/social/*
│   │   ├── ai.js                  # /api/ai/*
│   │   ├── linkedin.js            # /api/linkedin/*
│   │   └── youtube.js             # /api/youtube/*
│   └── utils/
│       └── companyWorkspace.js    # Single shared workspace owner ID
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Root layout, sidebar, topbar, routing
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Campaign ROI dashboard + per-post breakdown
│   │   │   ├── Calendar.jsx       # Social calendar — schedule, post, view history
│   │   │   ├── CopyGenerator.jsx  # AI ad copy generator
│   │   │   ├── ImageGen.jsx       # AI image generator
│   │   │   ├── VideoAds.jsx       # AI video ad generator
│   │   │   ├── Login.jsx          # Login + signup modal
│   │   │   ├── Home.jsx           # Landing/home page
│   │   │   └── Settings.jsx       # Settings page
│   │   ├── components/
│   │   │   ├── Sidebar.jsx        # Navigation sidebar with drawer on mobile
│   │   │   ├── Card.jsx           # Reusable card component
│   │   │   ├── Button.jsx         # Reusable button
│   │   │   ├── Input.jsx          # Input + Select components
│   │   │   ├── Badge.jsx          # Status/label badge
│   │   │   └── BarChart.jsx       # Bar chart for revenue trend
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state provider (login/logout/requireAuth)
│   │   ├── hooks/
│   │   │   ├── useAuth.js         # localStorage-based auth state
│   │   │   ├── useApi.js          # Fetch wrapper (GET/POST/PUT/DELETE)
│   │   │   └── useReminders.js    # Browser notification reminders for posts
│   │   └── utils/
│   │       ├── api.js             # API_BASE URL + apiFetch function
│   │       ├── helpers.js         # formatINR, postSpend, engagementRevenue, etc.
│   │       └── constants.js       # NAV_ITEMS, PLATFORMS, PLATFORM_COLORS
│   ├── public/
│   │   ├── favicon.svg
│   │   └── _redirects             # Render SPA redirect (/* → /index.html)
│   ├── index.css                  # Full design system — CSS variables, components
│   └── vite.config.js             # Vite config (dev proxy to localhost:5000)
├── render.yaml                    # Render Blueprint (auto-configure both services)
└── documentation.md               # This file
```

---

## 4. Backend Architecture

### Entry Point — `server.js`
- Connects to MongoDB via `connectDB()`
- Applies CORS, JSON body parser, rate limiter
- Mounts all route groups
- Health check at `GET /api/health`

### Auto-Posting System (`socialController.js`)
Every time `GET /api/social` is called, `runSocialMaintenance()` runs in the background:

1. **`autoPostDue()`** — Finds all `posted: false, deleted: false` posts where scheduled time has passed → claims them with a lock → publishes via platform API → marks `posted: true`
2. **`syncEngagementDue()`** — For posted FB/IG/LinkedIn posts, fetches real likes/comments/shares every 30 seconds
3. **`recomputeAutoCampaign()`** — Recalculates the auto-tracked "AI usage & social" campaign spend/revenue

### Posting Lock System
- `posting: true` flag prevents duplicate processing
- `postingAt` timestamp with `POSTING_LOCK_TIMEOUT_MS = 15 min` — stale locks auto-expire
- `postAttemptCount` tracks retries
- `nextPostAttemptAt` — failed posts retry after 30 minutes

### Timezone
- `SCHEDULE_TIME_ZONE_OFFSET` env var (default: `+05:30` IST)
- All scheduled times interpreted in this timezone

---

## 5. Frontend Architecture

### Navigation
Single-page app with in-app navigation state (`active` page stored in `localStorage`).

### Auth Flow
1. User sees `Home.jsx` landing page (not logged in)
2. Clicks "Log in" or "Sign up" → `Login.jsx` modal opens
3. On success → JWT stored in `localStorage`, user redirected to dashboard
4. Without signup, login is blocked (no demo mode)

### API Layer
- `useApi()` hook provides `get`, `post`, `put`, `del` methods
- All requests include `Authorization: Bearer <token>` header
- 401 response → auto-logout + login modal reopens

### Mobile Sidebar
- Hamburger (`☰`) button always visible in topbar
- On mobile (≤760px): sidebar is a fixed drawer (`z-index: 80`) sliding from left
- Backdrop (`z-index: 75`) covers content — tap outside to close
- Close button (`×`) visible inside sidebar on mobile

---

## 6. Database Models

### User (`models/User.js`)
| Field | Type | Description |
|-------|------|-------------|
| name | String | Display name |
| email | String | Unique, lowercase. Signup requires `@nxtwave.co.in` |
| password | String | Bcrypt hash (auto on save) |
| role | String | `'user'` (company) or `'client'` |
| createdBy | ObjectId | Ref to User who created this client account |

### Campaign (`models/Campaign.js`)
| Field | Type | Description |
|-------|------|-------------|
| name | String | Campaign name |
| platform | String | Instagram, Facebook, etc. |
| spend | Number | Total spend (INR) |
| revenue | Number | Total revenue (INR) |
| clicks | Number | Click/view count |
| status | String | `active`, `scheduled`, `paused` (auto-computed) |
| start / end | String | Date range (YYYY-MM-DD) |
| auto | Boolean | `true` = auto-managed "AI usage & social" campaign |

### Post (`models/Post.js`)
| Field | Type | Description |
|-------|------|-------------|
| platform | String | Facebook, Instagram, LinkedIn, YouTube |
| type | String | Text message, Image, Video |
| postMethod | String | Feed, Story |
| text | String | Caption/copy |
| mediaUrl | String | Public URL of image/video |
| date / time | String | Scheduled date (YYYY-MM-DD) and time (HH:MM:SS) |
| posted | Boolean | Whether successfully published |
| posting | Boolean | Lock flag during publishing |
| postAttemptCount | Number | Retry count |
| autoPosted | Boolean | Posted by auto-scheduler |
| externalPostId | String | Platform's post ID |
| postError | String | Last error message |
| views/likes/shares/comments | Number | Engagement metrics |
| deleted | Boolean | Soft-deleted from calendar |

### Generation (`models/Generation.js`)
| Field | Type | Description |
|-------|------|-------------|
| kind | String | `copy`, `image`, `video` |
| cost | Number | INR cost of this generation |
| title | String | Description/prompt |
| url | String | Generated media URL |
| preview | String | Text preview (for copy) |

---

## 7. API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | ❌ | Create new account (requires `@nxtwave.co.in` email) |
| POST | `/login` | ❌ | Login with email + password |
| POST | `/logout` | ❌ | Stateless logout (client clears token) |
| POST | `/client` | ✅ | Company creates a client account |

### Campaigns (`/api/campaigns`) — All require auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all campaigns (triggers auto-campaign recompute) |
| POST | `/` | Create new campaign |
| PUT | `/:id` | Update campaign |
| DELETE | `/:id` | Delete campaign (auto-campaign cannot be deleted) |

### Social Posts (`/api/social`) — All require auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all posts (triggers auto-post + engagement sync) |
| POST | `/` | Create/schedule a new post |
| PUT | `/:id` | Update post (use `retryPosting: true` to retry failed posts) |
| DELETE | `/:id` | Delete post (hard delete) |

### AI Generation (`/api/ai`) — All require auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/copy` | Generate ad copy via Gemini |
| POST | `/image` | Generate image via Gemini Image |
| POST | `/video` | Generate video via Veo |
| GET | `/usage` | Get AI generation history + total spend |
| DELETE | `/usage` | Clear generation history |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Returns `{ status: 'ok', timestamp }` |

---

## 8. Authentication System

### Signup Rules
- Email **must** end with `@nxtwave.co.in` (configurable via `ALLOWED_DOMAIN` in `authController.js`)
- Password minimum 6 characters
- Duplicate email returns 409 error

### Login Rules
- **Without signup, login is NOT possible** — no demo mode
- Invalid credentials return 401
- JWT token valid for **7 days**

### Company Workspace
All data (campaigns, posts, AI generations) belongs to a single shared workspace ID:
```
COMPANY_WORKSPACE_ID = process.env.COMPANY_WORKSPACE_ID || '000000000000000000000001'
```
This means all logged-in users see the **same data** — designed for a single company team.

---

## 9. Social Media Integrations

### Facebook
- **Publish**: `POST /{page-id}/photos` (image) or `POST /{page-id}/feed` (text)
- **Required env**: `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`
- **Engagement sync**: likes, comments, shares via Graph API

### Instagram
- **Publish**: Container creation → Publish (two-step)
- **Required env**: `INSTAGRAM_IG_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`
- **Engagement sync**: like_count, comments_count, views via insights API

### LinkedIn
- **Publish**: UGC Post via `/ugcPosts` endpoint
- **Required env**: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AUTHOR_URN`
- **OAuth flow**: `/api/linkedin/auth` → `/api/linkedin/callback`

### YouTube
- **Integration**: via n8n webhook (external workflow)
- **Required env**: `N8N_WEBHOOK_URL`
- **Note**: No direct API — n8n handles the upload

### Timeout Protection
All platform API calls have `AbortSignal.timeout(8000)` — 8 second timeout prevents queue freezing.

---

## 10. AI Features

### Copy Generator
- **Model**: Google Gemini 2.5 Flash
- **Cost**: ₹0.26 per generation
- **Inputs**: Brand, Product, Audience, Tone, Content Type, Keywords, Word Count

### Image Generator
- **Model**: Gemini Flash Image (or fallback to Imagen)
- **Cost**: ₹3.68 per generation
- **Inputs**: Prompt, Product, Style, Size
- **Output**: PNG hosted on Catbox.moe or Cloudinary

### Video Ad Generator
- **Model**: Veo 3.0
- **Cost**: ₹75.46 per generation
- **Inputs**: Prompt, Format, Music, Quality, Voice, Brand, CTA
- **Output**: MP4 video

### Media Hosting
Media uploads go to:
1. **Cloudinary** (if `CLOUDINARY_URL` is set) — preferred for permanent URLs
2. **Catbox.moe** (default) — free, no setup, public HTTPS URLs

---

## 11. Dashboard & Analytics

### Campaign ROI Dashboard
- **Total Spend** = Sum of all posted content costs (active + history/deleted) + AI generation costs
- **Total Revenue** = Sum of engagement revenue from all posted items
- **Avg ROAS** = Total Revenue / Total Spend
- **Per-post breakdown** — all posted items shown with full metrics

### Engagement Revenue Formula
```
Revenue = (views × ₹0.4) + (likes × ₹1) + (shares × ₹2) + (comments × ₹1.5)
```
YouTube: `Revenue = (views / 1000) × RPM`
Image with impressions: `Revenue = impressions × clickRate × conversionRate × avgOrderValue`

### Content Spend
| Content Type | Cost (INR) |
|-------------|------------|
| Text message | ₹0.26 |
| Image | ₹3.68 |
| Video | ₹75.46 |

### Auto Campaign
- Name: `"AI usage & social"` — auto-managed, cannot be manually deleted
- Spend = sum of all posted content costs
- Revenue = sum of all engagement revenue

---

## 12. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=your-secret-key

# Facebook
FACEBOOK_PAGE_ID=your-page-id
FACEBOOK_PAGE_ACCESS_TOKEN=your-token

# Instagram
INSTAGRAM_IG_USER_ID=your-ig-user-id
INSTAGRAM_ACCESS_TOKEN=your-token

# LinkedIn
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-secret
LINKEDIN_REDIRECT_URI=https://your-backend.onrender.com/api/linkedin/callback
LINKEDIN_ACCESS_TOKEN=your-token
LINKEDIN_PERSON_ID=your-person-id
LINKEDIN_AUTHOR_URN=urn:li:person:your-id

# AI
GEMINI_API_KEY=your-gemini-key

# Media (optional — defaults to catbox.moe)
CLOUDINARY_URL=cloudinary://...

# CORS
CLIENT_URL=https://your-frontend.onrender.com

# YouTube via n8n (optional)
N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook/youtube-schedule

# Timezone (default: +05:30 IST)
SCHEDULE_TIME_ZONE_OFFSET=+05:30
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 13. Deployment Guide (Render)

### Backend — Web Service
| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Runtime | Node |

**Required env vars in Render dashboard**: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `GEMINI_API_KEY`, and all social tokens.

### Frontend — Static Site
| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Required env vars**: `VITE_API_URL` → `https://your-backend.onrender.com/api`

> **Note:** `VITE_*` variables are baked into the build — must be set in Render dashboard before building.

### CORS
Backend automatically allows all `*.onrender.com` subdomains — no additional config needed for Render deployments.

---

## 14. Cost & Revenue Model

### AI Generation Costs (INR)
| Type | Model | Cost |
|------|-------|------|
| Copy | Gemini 2.5 Flash | ₹0.26 |
| Image | Gemini Flash Image | ₹3.68 |
| Video | Veo 3.0 | ₹75.46 |

### Social Post Costs
Same as AI costs — charged per post type when content is published.

### Revenue Tracking
Platform engagement is fetched automatically and converted to revenue using configurable values in `backend/config/aiCosts.js` and `frontend/src/utils/helpers.js`.

---

*Last updated: June 2026 | Marketo AI v1.0*
