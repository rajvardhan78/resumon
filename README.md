# Resumon — AI Resume Analyzer

> Upload your resume. Get instant AI-powered feedback on keywords, experience, technical depth and presentation quality. Track every scan in your history and watch your scores improve over time.

![Tech Stack](https://img.shields.io/badge/React_19-Vite-61DAFB?style=flat&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat&logo=vercel)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat&logo=clerk)

---

## ✨ Features

- **AI Resume Scoring** — Upload a PDF and get scored across 4 dimensions: Keywords, Experience, Knowledge Depth and Creativity
- **Gemini AI + Local Fallback** — Powered by Google Gemini. When quota is exceeded, a fully in-house evaluation engine kicks in automatically — zero downtime
- **Scan History** — Every scan is saved to MongoDB. View all past scans as clean horizontal cards, latest on top
- **Analytics Page** — Visual breakdown of your most recent scan with animated score bars, dimension cards and highlight chips
- **Profile Stats** — Real-time Total Scans, Average Score and Best Score pulled from the database
- **Auth** — Google & email sign-in via Clerk
- **Fully Serverless** — Deployed on Vercel with API routes as serverless functions

---

## 🏗️ Tech Stack

| Layer | Technology | Role |
|:---|:---|:---|
| **Frontend** | React 19 + Vite | UI framework |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **Animations** | Framer Motion | Sidebar, scan overlay, card transitions |
| **Auth** | Clerk | Google & email OAuth |
| **AI Engine** | Google Gemini (`gemini-2.0-flash-lite`) | Resume analysis & scoring |
| **Fallback Engine** | Custom NLP algorithm (`api/evaluate.js`) | In-house scoring when Gemini quota is exceeded |
| **Database** | MongoDB Atlas | Scan history & user stats |
| **Backend** | Vercel Serverless Functions (`/api`) | PDF parsing, AI calls, DB writes |
| **PDF Parsing** | `pdf-parse` | Extract text from uploaded resume PDFs |
| **Deployment** | Vercel | Frontend + API, zero config |

---

## 🧠 How the Scoring Works

Resumes are scored across **4 dimensions** (0–100 each):

| Dimension | What it measures |
|:---|:---|
| 🏷️ **Keywords** | Industry-standard tech stacks, hard skills, tools, certifications — weighted across 9 categories (languages, frontend, backend, databases, DevOps, ML/AI, mobile, tools, soft skills) |
| ⚡ **Experience** | Depth of work history — employment date ranges, job titles, action verbs, quantified achievements (e.g. "reduced load time by 40%") |
| 💡 **Knowledge Depth** | Technical sophistication — project complexity, certifications, GitHub links, education, word count, stack breadth |
| ⭐ **Creativity** | Standout presentation — metrics, bullet structure, side projects, hackathons, awards, lexical diversity |

**Overall score** = weighted average (Experience 30% · Keywords 28% · Knowledge 25% · Creativity 17%) + section completeness bonus.

### Gemini AI Path
1. PDF uploaded → text extracted via `pdf-parse`
2. Text sent to Gemini with a strict JSON-schema prompt
3. Response parsed → scores + feedback returned to frontend

### Local Fallback Path (when Gemini is unavailable)
1. Same PDF text is passed to `api/evaluate.js`
2. 200+ regex patterns + curated keyword banks score the resume purely in-house
3. Identical JSON shape returned → UI renders exactly the same

---

## 🗂️ Project Structure

```
resumon/
├── api/                      # Vercel serverless functions
│   ├── analyze.js            # POST /api/analyze — PDF parse + Gemini/fallback
│   ├── evaluate.js           # In-house scoring engine (Gemini fallback)
│   ├── db.js                 # MongoDB Atlas client + helpers
│   ├── stats.js              # GET /api/stats — aggregated user stats
│   └── history.js            # GET /api/history — recent scans list
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx       # Collapsible nav (64px → 240px on hover)
│   │   ├── DropZone.jsx      # PDF drag & drop upload
│   │   ├── ScanButton.jsx    # Animated scan trigger
│   │   └── ScannerOverlay.jsx# Linear light-bar scan animation
│   └── pages/
│       ├── Home.jsx          # Upload + scan flow
│       ├── Results.jsx       # Full analysis results
│       ├── Analytics.jsx     # Latest scan visual breakdown
│       ├── History.jsx       # All scans — horizontal cards
│       └── Profile.jsx       # User info + live stats from DB
├── public/
│   └── logo.svg              # Custom R favicon (green gradient)
├── index.html                # SEO meta + OG tags
└── vercel.json               # Build + rewrite config
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- A [MongoDB Atlas](https://cloud.mongodb.com) free cluster
- A [Clerk](https://clerk.com) account
- A [Google Gemini](https://aistudio.google.com) API key

### Setup

```bash
# 1. Clone
git clone https://github.com/rajvardhan78/resumon.git
cd resumon

# 2. Install dependencies
npm install

# 3. Copy env template and fill in your values
cp .env.example .env.local
```

Fill in `.env.local`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
GEMINI_API_KEY=AIza...
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/resumon?retryWrites=true&w=majority
```

```bash
# 4. Run with Vercel dev (serves both frontend + API functions)
vercel dev
```

App runs at `http://localhost:3000`

---

## ☁️ Deployment (Vercel)

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel Dashboard → Settings → Environment Variables:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Deploy — Vercel auto-detects Vite, API routes become serverless functions automatically
5. Add your Vercel domain to **Clerk Dashboard → Domains**
6. Add `0.0.0.0/0` to **MongoDB Atlas → Network Access** (Vercel uses dynamic IPs)

---

## 🎨 Design System

| Token | Value | Usage |
|:---|:---|:---|
| `--color-primary` | `#0a0a0a` | Page background |
| `--color-text` | `#f5f5f7` | Body text |
| `--color-success` | `#22c55e` | Accents, scores, CTAs |
| Font UI | Inter | All UI text |
| Font Mono | JetBrains Mono | Code / score values |

---

## 📄 License

MIT
