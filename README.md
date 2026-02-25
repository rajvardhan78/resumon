# 📄 AI Resume Analyzer & Evaluator

A "sober-aesthetic" full-stack application designed to evaluate resumes using LLM-based heuristics and NLP.

---

## 🏗️ Technical Stack

| Layer            | Technology                   | Role                                           |
|:-----------------|:-----------------------------|:-----------------------------------------------|
| **Frontend** | React 19 + Vite              | Core UI Framework                              |
| **Styling** | Tailwind CSS                 | Minimalist design & Utility-first styling      |
| **Animations** | Framer Motion                | Sidebar transitions & "Scanning" micro-effects |
| **Backend** | Node.js + Express            | File handling & API Orchestration              |
| **Database** | PostgreSQL (Supabase/Prisma) | Persistence for Scores & User History          |
| **Auth** | Clerk                        | Google & Email OAuth                           |
| **AI Engine** | OpenAI API (GPT-4o)          | Extraction, Scoring, and Feedback              |

---

## 🧠 The Evaluation Algorithm

To manage the "Evaluation," we utilize a **Hybrid Scoring Model**. Instead of simple keyword matching, we process the text through a multi-dimensional prompt.

### 1. Data Extraction
- **Tool:** `pdf-parse` (Node)
- **Process:** Convert binary PDF data into a clean UTF-8 string, stripping non-standard characters.

### 2. The Scoring Logic (LLM Heuristics)
The "Algorithm" is defined by a JSON-enforced System Prompt. You will categorize the resume into 4 pillars:

* **Keywords:** Matches against industry-standard tech stacks (hard skills).
* **Experience Level:** Analyzes "Impact" over "Tasks" (e.g., "Led a team" vs "Was a member").
* **Knowledge Depth:** Evaluates complexity of projects (e.g., "Built a CRUD app" vs "Optimized DB indexing").
* **Creativity:** Measures lexical diversity and unique project framing.

### 3. Algorithm Flow
1. **User Uploads** -> `POST /api/scan`
2. **Backend** -> Extracts text and sends to LLM with a schema-defined prompt.
3. **LLM Response** -> Returns structured JSON.
4. **Validation** -> Backend ensures scores are within 0-100 range.
5. **Persistence** -> Save results to DB linked to `user_id`.

---

## 🎨 Design & UX Specifications

### Aesthetic: "Sober & Engaging"
- **Primary Palette:** `#0A0A0A` (Background), `#F5F5F7` (Text), `#22C55E` (Success Accents).
- **Typography:** Inter (UI) and JetBrains Mono (Evaluation details).

### Component: The Interactive Sidebar
- **State 1 (Idle):** 64px width. Icons only. Blur background (`backdrop-blur-md`).
- **State 2 (Hover):** 240px width. Smooth spring transition. Labels appear with a slight fade-in.

### Component: The Main Section
- **Instructional Text:** Centered, low-opacity (0.6) text explaining the process.
- **Dropzone:** An `input[type="file"]` wrapped in a Framer Motion `div`.
- **The "Scan" Button:** High-contrast button. Upon click, trigger a "Linear Scan" CSS animation that moves a light-bar down the screen to simulate a physical scanner.

---

## 📂 Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  scans     Scan[]
  createdAt DateTime @default(now())
}

model Scan {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  overallScore    Int
  keywordScore    Int
  experienceScore Int
  knowledgeScore  Int
  creativityScore Int
  feedback        String[] // Array of improvement strings
  rawContent      String?  // Optional: store text for future comparison
  createdAt       DateTime @default(now())
}