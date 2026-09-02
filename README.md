# Resumon — AI Resume Analyzer

> Upload your resume. Get instant AI-powered feedback on keywords, experience, technical depth and presentation quality. Track every scan in your history and watch your scores improve over time.

![Tech Stack](https://img.shields.io/badge/React_19-Vite-61DAFB?style=flat&logo=react)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-10.0-512BD4?style=flat&logo=.net)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat&logo=vercel)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat&logo=render)

---

## ✨ Features

- **AI Resume Scoring** — Upload a PDF and get scored across 4 dimensions: Keywords, Experience, Knowledge Depth and Creativity
- **Gemini AI + Local Fallback** — Powered by Google Gemini. When quota is exceeded, a fully in-house C# evaluation engine kicks in automatically — zero downtime
- **Scan History** — Every scan is saved to MongoDB. View all past scans as clean horizontal cards, latest on top
- **Analytics Page** — Visual breakdown of your most recent scan with animated score bars, dimension cards and highlight chips
- **Profile Stats** — Real-time Total Scans, Average Score and Best Score pulled from the database
- **Custom Authentication** — Highly secure, in-house JWT authentication with sliding sessions, refresh tokens, and strict rate-limiting
- **Email Verification** — SMTP integration for 6-digit OTP verification on Sign-up and Password Recovery
- **Bot Protection** — Cloudflare Turnstile CAPTCHA fully integrated on the client and validated on the backend

---

## 🏗️ Tech Stack

| Layer | Technology | Role |
|:---|:---|:---|
| **Frontend** | React 19 + Vite | UI framework |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **Animations** | Framer Motion | Sidebar, scan overlay, card transitions |
| **Auth** | ASP.NET Identity + JWT | Custom OAuth-like flow with refresh tokens |
| **AI Engine** | Google Gemini | Resume analysis & scoring |
| **Fallback Engine** | Custom C# algorithm | In-house scoring when Gemini quota is exceeded |
| **Database** | MongoDB Atlas | Scan history & user stats |
| **Backend** | ASP.NET Core 10 | Enterprise-grade Web API, rate limiting, dependency injection |
| **PDF Parsing** | `PdfPig` | Extract text from uploaded resume PDFs on the backend |
| **Deployment** | Vercel (Client) + Render (Server) | Decoupled deployment for maximum scalability |

---

## 🧠 How the Scoring Works

Resumes are scored across **4 dimensions** (0–100 each):

| Dimension | What it measures |
|:---|:---|
| 🏷️ **Keywords** | Industry-standard tech stacks, hard skills, tools, certifications — weighted across 9 categories |
| ⚡ **Experience** | Depth of work history — employment date ranges, job titles, action verbs, quantified achievements |
| 💡 **Knowledge Depth** | Technical sophistication — project complexity, certifications, GitHub links, education |
| ⭐ **Creativity** | Standout presentation — metrics, bullet structure, side projects, awards, lexical diversity |

**Overall score** = weighted average (Experience 30% · Keywords 28% · Knowledge 25% · Creativity 17%) + section completeness bonus.

### Gemini AI Path
1. PDF uploaded → text extracted via `PdfPig` in ASP.NET Core
2. Text sent to Gemini with a strict JSON-schema prompt
3. Response parsed → scores + feedback returned to frontend

### Local Fallback Path (when Gemini is unavailable)
1. Same PDF text is passed to our local C# `LocalResumeEvaluator`
2. 200+ regex patterns + curated keyword banks score the resume purely in-house
3. Identical JSON shape returned → UI renders exactly the same

---

## 🗂️ Project Structure

```
resumon/
├── client/                     # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/         # UI Components (Sidebar, DropZone, AuthCard)
│   │   ├── pages/              # Views (Home, Auth, History, Analytics)
│   │   └── lib/                # API wrappers (api.js) handling fetch & JWT rotation
│   └── index.html              # Entry point with SEO meta tags
│
├── server/                     # ASP.NET Core 10 Backend
│   ├── src/Resumon.Api/        
│   │   ├── Controllers/        # API Routes (Auth, Analyze, History)
│   │   ├── Services/           # Business logic (Gemini, Local Fallback, Email, OTP)
│   │   ├── Domain/             # MongoDB document models
│   │   └── Program.cs          # App bootstrapping, CORS, and Rate Limiting
│   └── Dockerfile              # Containerization for deployment (Render/Fly.io)
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- .NET 10.0 SDK
- A [MongoDB Atlas](https://cloud.mongodb.com) free cluster
- A [Google Gemini](https://aistudio.google.com) API key
- A Cloudflare account (for Turnstile)
- An SMTP provider (like Gmail App Passwords)

### Setup

```bash
# 1. Clone
git clone https://github.com/rajvardhan78/resumon.git
cd resumon
```

#### Backend Setup
```bash
cd server/src/Resumon.Api

# Create local settings file
touch appsettings.Local.json
```
Populate `appsettings.Local.json` with your secrets:
```json
{
  "Mongo": { "ConnectionString": "mongodb+srv://..." },
  "Jwt": { "Key": "base64-random-string-at-least-256-bits..." },
  "Gemini": { "ApiKey": "AIza..." },
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "Username": "your_email@gmail.com",
    "Password": "your_app_password",
    "SenderEmail": "your_email@gmail.com"
  }
}
```
Run the backend:
```bash
dotnet run
```
*API will run on `http://localhost:5233`*

#### Frontend Setup
```bash
cd client
npm install
```
Add `.env.local`:
```env
VITE_API_URL=http://localhost:5233
VITE_TURNSTILE_SITE_KEY=your_cloudflare_site_key
```
Run the frontend:
```bash
npm run dev
```
*Client will run on `http://localhost:5173`*

---

## ☁️ Deployment

### 1. Backend (Render / Docker)
- Create a new Web Service on Render from your GitHub repo.
- Select `server` as the Root Directory.
- Render will automatically detect the `Dockerfile`.
- Add all Environment Variables matching your `appsettings.json` structure (e.g. `Mongo__ConnectionString`, `Smtp__Password`, etc.)

### 2. Frontend (Vercel)
- Create a new Project on Vercel.
- Select `client` as the Root Directory.
- Vercel automatically detects the Vite framework.
- Add `VITE_API_URL` (pointing to your live Render backend) and `VITE_TURNSTILE_SITE_KEY` as Environment Variables.

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
