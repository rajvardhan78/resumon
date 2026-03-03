// ─────────────────────────────────────────────────────────────────────────────
// evaluate.js  —  In-house resume scoring engine (Gemini fallback)
// Scoring is purely text-based: regex patterns + curated keyword banks.
// Four dimensions mirror the Gemini prompt exactly so Results.jsx renders
// identically whether the score came from AI or this engine.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Keyword Banks ────────────────────────────────────────────────────────────

const KB = {
  languages: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'go',
    'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
    'matlab', 'perl', 'haskell', 'elixir', 'dart', 'julia', 'lua',
    'assembly', 'fortran', 'cobol', 'groovy', 'objective-c', 'bash',
    'shell', 'powershell', 'vba', 'solidity',
  ],
  frontend: [
    'react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'nextjs',
    'next.js', 'nuxt', 'nuxtjs', 'gatsby', 'remix', 'astro', 'tailwind',
    'tailwindcss', 'bootstrap', 'sass', 'scss', 'less', 'css', 'html',
    'html5', 'css3', 'webpack', 'vite', 'rollup', 'parcel', 'redux',
    'zustand', 'mobx', 'recoil', 'jotai', 'tanstack', 'react query',
    'storybook', 'framer motion', 'threejs', 'three.js', 'd3', 'd3.js',
    'websocket', 'webrtc', 'pwa', 'service worker',
  ],
  backend: [
    'node', 'nodejs', 'node.js', 'express', 'expressjs', 'fastapi',
    'django', 'flask', 'spring', 'spring boot', 'rails', 'ruby on rails',
    'laravel', 'nestjs', 'nest.js', 'hono', 'fastify', 'koa', 'gin',
    'fiber', 'actix', 'rocket', 'graphql', 'rest', 'restful', 'grpc',
    'trpc', 'microservices', 'serverless', 'lambda', 'websockets',
    'message queue', 'rabbitmq', 'kafka', 'celery', 'worker',
  ],
  databases: [
    'mongodb', 'mongoose', 'postgresql', 'postgres', 'mysql', 'mariadb',
    'sqlite', 'redis', 'firebase', 'firestore', 'dynamodb', 'cassandra',
    'elasticsearch', 'opensearch', 'supabase', 'planetscale', 'cockroachdb',
    'neo4j', 'influxdb', 'timescaledb', 'prisma', 'typeorm', 'sequelize',
    'drizzle', 'knex', 'sqlalchemy', 'hibernate', 'orm',
  ],
  devops: [
    'docker', 'kubernetes', 'k8s', 'helm', 'aws', 'gcp', 'azure',
    'google cloud', 'amazon web services', 'ec2', 's3', 'lambda',
    'cloudfront', 'route53', 'rds', 'ecs', 'eks', 'fargate', 'ci/cd',
    'github actions', 'gitlab ci', 'jenkins', 'circleci', 'travis ci',
    'terraform', 'ansible', 'chef', 'puppet', 'nginx', 'apache',
    'linux', 'ubuntu', 'centos', 'vercel', 'netlify', 'heroku',
    'digitalocean', 'cloudflare', 'monitoring', 'prometheus', 'grafana',
    'datadog', 'sentry', 'new relic', 'elk stack', 'logstash',
  ],
  tools: [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'figma', 'sketch', 'adobe xd', 'postman', 'insomnia', 'swagger',
    'openapi', 'jest', 'vitest', 'cypress', 'playwright', 'selenium',
    'mocha', 'chai', 'pytest', 'junit', 'eslint', 'prettier', 'husky',
    'npm', 'yarn', 'pnpm', 'pip', 'cargo', 'maven', 'gradle',
    'makefile', 'linux cli', 'vim', 'vscode', 'intellij',
  ],
  ml_ai: [
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas',
    'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly', 'opencv',
    'hugging face', 'transformers', 'langchain', 'llm', 'gpt', 'bert',
    'machine learning', 'deep learning', 'neural network', 'nlp',
    'natural language processing', 'computer vision', 'reinforcement learning',
    'data science', 'data analysis', 'feature engineering', 'model training',
    'model deployment', 'mlops', 'rag', 'vector database', 'embedding',
    'stable diffusion', 'generative ai', 'fine-tuning',
  ],
  mobile: [
    'react native', 'flutter', 'swift', 'swiftui', 'uikit', 'android',
    'kotlin', 'java android', 'expo', 'ionic', 'xamarin', 'cordova',
    'capacitor', 'mobile app', 'ios', 'android studio', 'xcode',
  ],
  softSkills: [
    'leadership', 'collaboration', 'communication', 'problem-solving',
    'agile', 'scrum', 'kanban', 'sprint', 'teamwork', 'mentoring',
    'mentorship', 'ownership', 'initiative', 'critical thinking',
    'time management', 'adaptability', 'cross-functional', 'stakeholder',
  ],
};


const ACTION_VERBS = [
  // engineering & building
  'built', 'developed', 'engineered', 'architected', 'designed', 'implemented',
  'created', 'wrote', 'coded', 'programmed', 'prototyped', 'shipped',
  // leadership & ownership
  'led', 'managed', 'owned', 'directed', 'coordinated', 'supervised',
  'mentored', 'coached', 'trained', 'guided', 'established', 'founded',
  // impact & improvement
  'optimized', 'improved', 'enhanced', 'reduced', 'increased', 'accelerated',
  'scaled', 'boosted', 'streamlined', 'automated', 'modernized', 'refactored',
  // delivery & collaboration
  'deployed', 'launched', 'delivered', 'released', 'migrated', 'integrated',
  'collaborated', 'contributed', 'partnered', 'supported', 'resolved',
  // analysis & research
  'analyzed', 'researched', 'investigated', 'evaluated', 'reviewed',
  'audited', 'monitored', 'identified', 'diagnosed', 'benchmarked',
];

const JOB_TITLES = [
  'software engineer', 'software developer', 'frontend developer',
  'backend developer', 'fullstack developer', 'full stack developer',
  'full-stack developer', 'data scientist', 'data engineer', 'data analyst',
  'devops engineer', 'sre', 'site reliability', 'platform engineer',
  'cloud engineer', 'ml engineer', 'machine learning engineer',
  'ai engineer', 'product manager', 'product owner', 'ui/ux designer',
  'ux designer', 'ui designer', 'mobile developer', 'android developer',
  'ios developer', 'security engineer', 'qa engineer', 'test engineer',
  'solutions architect', 'technical lead', 'tech lead', 'staff engineer',
  'principal engineer', 'engineering manager', 'cto', 'vp of engineering',
  'intern', 'software intern', 'engineering intern', 'research engineer',
  'embedded engineer', 'systems engineer',
];

const CERT_KEYWORDS = [
  'aws certified', 'google certified', 'microsoft certified', 'azure certified',
  'certified kubernetes', 'cka', 'ckad', 'gcp professional', 'pmp',
  'comptia', 'cissp', 'ceh', 'oscp', 'oracle certified', 'salesforce certified',
  'certified scrum', 'csm', 'professional scrum', 'certification',
  'certificate', 'certified',
];

const SECTION_HEADERS = [
  'experience', 'work experience', 'professional experience', 'employment',
  'education', 'academic background', 'projects', 'personal projects',
  'open source', 'skills', 'technical skills', 'certifications', 'awards',
  'honors', 'publications', 'research', 'volunteering', 'extracurricular',
  'summary', 'objective', 'profile', 'about me', 'internship',
  'achievements', 'accomplishments', 'leadership', 'activities',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s.#+/-]/g, ' ');
}

function countMatches(normText, list) {
  return list.filter((item) => normText.includes(item));
}

function clamp(val, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(val)));
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Count how many lines look like bullet points
function countBullets(text) {
  return (text.match(/^[\s]*[•\-–—*▸▹►✓✔✗→]\s+.+/gm) || []).length;
}

// Extract all numbers with context (used for quantification detection)
function findQuantifiedAchievements(text) {
  const patterns = [
    /\d+\s*%/g,                                      // percentages
    /\d+x\b/gi,                                      // multipliers (3x)
    /\$\s*\d[\d,.]*/g,                               // dollar amounts
    /\d+[\d,]*\s*(users?|customers?|clients?)\b/gi,  // user counts
    /\d+[\d,]*\s*(requests?|transactions?|calls?)\s*(per|\/)\s*(sec|min|hour|day)/gi,
    /reduced\s+by\s+\d+/gi,                          // "reduced by N"
    /increased\s+by\s+\d+/gi,
    /improved\s+by\s+\d+/gi,
    /saved\s+\$?\d+/gi,
    /\d+\s*(ms|milliseconds?|seconds?)\s*(latency|response|faster)/gi,
    /\d+[\d,]*\s*(stars?|forks?|downloads?|installs?)\b/gi,
    /\d+[\d,]*\s*(repos?|repositories|projects?|apps?)\b/gi,
    /\d+[\d,]*\s*[kmb]\b/gi,                        // 5k, 2M, 1B
    /top\s+\d+\s*%/gi,                               // "top 5%"
    /\d+\s*(?:award|prize|scholarship|honor)/gi,
  ];
  const matches = [];
  patterns.forEach((p) => {
    const found = text.match(p);
    if (found) matches.push(...found);
  });
  return [...new Set(matches)];
}

// Detect date ranges for employment periods
function findDateRanges(text) {
  const patterns = [
    // "Jan 2021 – Present", "March 2020 - Dec 2022"
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–—]\s*(present|current|now|\d{4})/gi,
    // "2020 – 2023", "2019 - Present"
    /\b\d{4}\s*[-–—]\s*(present|current|now|\d{4})\b/gi,
    // "Summer 2022", "Fall 2021"
    /\b(summer|fall|spring|winter)\s+\d{4}\b/gi,
  ];
  const matches = [];
  patterns.forEach((p) => {
    const found = text.match(p);
    if (found) matches.push(...found);
  });
  return [...new Set(matches)];
}

// ─── 1. Keyword Score ─────────────────────────────────────────────────────────
// Weights each category differently. Technical + infra categories weigh more.

const CATEGORY_WEIGHTS = {
  languages:   1.4,
  frontend:    1.2,
  backend:     1.2,
  databases:   1.1,
  devops:      1.2,
  tools:       1.0,
  ml_ai:       1.3,
  mobile:      1.0,
  softSkills:  0.7,
};

function scoreKeywords(text) {
  const n = norm(text);
  const categoryResults = {};
  let weightedMatched = 0;
  let weightedTotal = 0;

  for (const [cat, keywords] of Object.entries(KB)) {
    const matched = countMatches(n, keywords);
    const weight = CATEGORY_WEIGHTS[cat] ?? 1.0;
    weightedMatched += matched.length * weight;
    // Cap each category's contribution at 5 matches to avoid one dominant category
    weightedTotal += Math.min(keywords.length, 5) * weight;
    categoryResults[cat] = matched;
  }

  // Base: weighted keyword coverage (70 pts max)
  const baseScore = (weightedMatched / weightedTotal) * 70;

  // Bonus: category breadth — how many categories have at least 1 match (30 pts max)
  const coveredCats = Object.values(categoryResults).filter((m) => m.length > 0).length;
  const totalCats = Object.keys(KB).length;
  const breadthBonus = (coveredCats / totalCats) * 30;

  const score = clamp(baseScore + breadthBonus);

  // Top 6 unique matched keywords for highlights
  const allMatched = Object.values(categoryResults).flat();
  const uniqueMatched = [...new Set(allMatched)];
  const highlights = uniqueMatched.slice(0, 6).map((k) => `"${k}" detected`);
  if (highlights.length === 0) highlights.push('No strong technical keywords found');

  // Missing categories for feedback
  const missingCats = Object.entries(categoryResults)
    .filter(([, m]) => m.length === 0)
    .map(([cat]) => cat.replace('_', '/'));

  let feedback;
  if (score >= 75) {
    feedback = `Excellent keyword coverage — ${uniqueMatched.length} relevant skills across ${coveredCats} categories.`;
  } else if (score >= 50) {
    feedback = `Decent keywords (${uniqueMatched.length} found). Missing coverage in: ${missingCats.slice(0, 3).join(', ')}.`;
  } else {
    feedback = `Weak keyword signal. Add skills from: ${missingCats.slice(0, 4).join(', ')}.`;
  }

  return { score, feedback, highlights, _raw: { coveredCats, uniqueMatched } };
}

// ─── 2. Experience Score ──────────────────────────────────────────────────────

function scoreExperience(text) {
  const n = norm(text);
  let score = 0;
  const highlights = [];

  // ── A. Explicit years of experience stated (0–20 pts)
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(of\s*)?(professional\s*)?(experience|exp|work)/i);
  if (yearsMatch) {
    const yrs = parseInt(yearsMatch[1]);
    const pts = clamp(yrs * 4, 0, 20);
    score += pts;
    highlights.push(`${yrs}+ years of experience stated`);
  }

  // ── B. Employment date ranges (0–20 pts, capped at 3 ranges)
  const dateRanges = findDateRanges(text);
  if (dateRanges.length > 0) {
    const pts = clamp(dateRanges.length * 7, 0, 20);
    score += pts;
    highlights.push(`${dateRanges.length} employment period(s) with dates`);
  }

  // ── C. Job titles found (0–15 pts)
  const titlesFound = JOB_TITLES.filter((t) => n.includes(t));
  if (titlesFound.length > 0) {
    const pts = clamp(titlesFound.length * 5, 0, 15);
    score += pts;
    highlights.push(`Roles: ${titlesFound.slice(0, 3).join(', ')}`);
  }

  // ── D. Action verbs (0–20 pts) — shows active ownership
  const verbsFound = countMatches(n, ACTION_VERBS);
  if (verbsFound.length > 0) {
    const pts = clamp(verbsFound.length * 2, 0, 20);
    score += pts;
    highlights.push(`${verbsFound.length} strong action verbs used`);
  }

  // ── E. Quantified achievements (0–25 pts) — biggest differentiator
  const quantified = findQuantifiedAchievements(text);
  if (quantified.length > 0) {
    const pts = clamp(quantified.length * 5, 0, 25);
    score += pts;
    highlights.push(`${quantified.length} quantified achievement(s) with numbers`);
  }

  score = clamp(score);

  let feedback;
  if (score >= 75) {
    feedback = 'Strong experience section — clear roles, timelines and measurable impact.';
  } else if (score >= 50) {
    feedback = 'Moderate experience shown. Add more date ranges, titles or impact numbers.';
  } else if (quantified.length === 0) {
    feedback = 'No quantified achievements found. Add metrics like "reduced load time by 40%".';
  } else {
    feedback = 'Limited experience signals. Expand work history with titles and date ranges.';
  }

  return { score, feedback, highlights };
}

// ─── 3. Knowledge Depth Score ─────────────────────────────────────────────────

function scoreKnowledgeDepth(text) {
  const n = norm(text);
  let score = 0;
  const highlights = [];

  // ── A. Word count — proxy for detail (0–15 pts)
  const wc = wordCount(text);
  if (wc > 700) {
    score += 15;
    highlights.push(`Rich detail (${wc} words)`);
  } else if (wc > 400) {
    score += 9;
    highlights.push(`Adequate length (${wc} words)`);
  } else if (wc > 200) {
    score += 4;
  } else {
    highlights.push(`Resume is very short (${wc} words) — expand it`);
  }

  // ── B. Certifications (0–20 pts)
  const certsFound = CERT_KEYWORDS.filter((c) => n.includes(c));
  if (certsFound.length > 0) {
    const pts = clamp(certsFound.length * 8, 0, 20);
    score += pts;
    highlights.push(`${certsFound.length} certification(s) detected`);
  }

  // ── C. Project mentions (0–20 pts)
  const projectMatches = (text.match(/\bprojects?\b/gi) || []).length;
  if (projectMatches > 0) {
    const pts = clamp(projectMatches * 4, 0, 20);
    score += pts;
    highlights.push(`${projectMatches} project mention(s)`);
  }

  // ── D. Technical stack breadth — backend + DB + devops + ML (0–20 pts)
  const techHits =
    countMatches(n, KB.backend).length +
    countMatches(n, KB.databases).length +
    countMatches(n, KB.devops).length +
    countMatches(n, KB.ml_ai).length;
  if (techHits > 0) {
    const pts = clamp(techHits * 2, 0, 20);
    score += pts;
    highlights.push(`${techHits} backend/infra/AI tools detected`);
  }

  // ── E. Education signals (0–10 pts)
  if (/\b(b\.?s\.?|b\.?e\.?|b\.?tech|bachelor|master|m\.?s\.?|m\.?e\.?|phd|ph\.d|mba|degree|university|college|institute)\b/i.test(text)) {
    score += 10;
    highlights.push('Educational qualification detected');
  }

  // ── F. Portfolio / GitHub / publications (0–15 pts)
  if (/github\.com\/[a-z0-9_-]+/i.test(text)) {
    score += 8;
    highlights.push('GitHub profile linked');
  }
  if (/https?:\/\/(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(text) && !/github\.com/i.test(text)) {
    score += 5;
    highlights.push('Portfolio / personal website linked');
  }
  if (/\b(publication|research paper|arxiv|ieee|acm|journal|conference|presented at)\b/i.test(text)) {
    score += 7;
    highlights.push('Research or publication mentioned');
  }

  score = clamp(score);

  let feedback;
  if (score >= 75) {
    feedback = 'Deep technical profile — strong stack breadth, projects and credentials.';
  } else if (score >= 50) {
    feedback = 'Good depth. Add certifications, more projects or a portfolio link.';
  } else if (projectMatches === 0) {
    feedback = 'No projects detected. Add a Projects section with descriptions.';
  } else {
    feedback = 'Low technical depth. Show more tools, certs and project complexity.';
  }

  return { score, feedback, highlights };
}

// ─── 4. Creativity / Presentation Score ──────────────────────────────────────

function scoreCreativity(text) {
  const n = norm(text);
  let score = 0;
  const highlights = [];

  // ── A. Quantified impact — biggest creativity differentiator (0–25 pts)
  const quantified = findQuantifiedAchievements(text);
  if (quantified.length > 0) {
    const pts = clamp(quantified.length * 5, 0, 25);
    score += pts;
    highlights.push(`${quantified.length} metric-driven statement(s)`);
  }

  // ── B. Bullet point structure (0–15 pts)
  const bullets = countBullets(text);
  if (bullets > 10) {
    score += 15;
    highlights.push(`Well-structured (${bullets} bullet points)`);
  } else if (bullets > 4) {
    score += 9;
    highlights.push(`${bullets} bullet points found`);
  } else if (bullets > 0) {
    score += 4;
  }

  // ── C. Side projects / hackathons / open source (0–20 pts)
  const sideSignals = [
    'hackathon', 'open source', 'open-source', 'side project', 'personal project',
    'indie', 'freelance', 'freelancer', 'npm package', 'published package',
    'built from scratch', 'launched', 'shipped', '1st place', 'winner',
    'runner-up', 'finalist',
  ];
  const sideHits = countMatches(n, sideSignals);
  if (sideHits.length > 0) {
    const pts = clamp(sideHits.length * 7, 0, 20);
    score += pts;
    highlights.push(`${sideHits.length} side project / open-source signal(s)`);
  }

  // ── D. Awards, recognition, scholarships (0–15 pts)
  if (/\b(award|prize|honor|honour|recognition|scholarship|fellowship|grant|nominated|nominee|won|winner)\b/i.test(text)) {
    score += 15;
    highlights.push('Awards or recognition mentioned');
  }

  // ── E. Volunteering / community / teaching (0–10 pts)
  if (/\b(volunteer|community|mentor|teach|coach|nonprofit|non-profit|club|society|organiz)\b/i.test(text)) {
    score += 10;
    highlights.push('Community involvement or volunteering noted');
  }

  // ── F. Unique lexical diversity — non-repetitive writing (0–15 pts)
  const words = n.split(/\s+/).filter((w) => w.length > 4);
  const uniqueWords = new Set(words);
  const diversity = words.length > 0 ? uniqueWords.size / words.length : 0;
  if (diversity > 0.72) {
    score += 15;
    highlights.push('High vocabulary diversity — writing feels fresh');
  } else if (diversity > 0.58) {
    score += 8;
  } else if (words.length > 50) {
    highlights.push('Repetitive phrasing detected — vary your language');
  }

  score = clamp(score);

  let feedback;
  if (score >= 75) {
    feedback = 'Standout presentation — metrics, side projects and unique voice.';
  } else if (score >= 50) {
    feedback = 'Decent presentation. Add numbers and link projects or achievements.';
  } else if (quantified.length === 0) {
    feedback = 'No measurable impact found. Add % improvements, user counts, etc.';
  } else {
    feedback = 'Presentation needs work. Structure bullets and show awards/side projects.';
  }

  return { score, feedback, highlights };
}

// ─── Section Completeness Bonus ───────────────────────────────────────────────
// Rewards resumes with well-defined sections (up to +5 pts on overall)

function sectionCompletenessBonus(text) {
  const n = norm(text);
  const found = SECTION_HEADERS.filter((h) => n.includes(h));
  // Core sections: experience, education, skills, projects
  const corePresent = ['experience', 'education', 'skills', 'projects'].filter((s) =>
    n.includes(s)
  ).length;
  return { bonus: corePresent >= 3 ? 5 : corePresent >= 2 ? 2 : 0, sectionsFound: found };
}

// ─── Overall Summary Generator ────────────────────────────────────────────────

function generateSummary(overallScore, scores) {
  const weak = Object.entries(scores)
    .filter(([, v]) => v.score < 50)
    .map(([k]) =>
      k === 'knowledgeDepth' ? 'knowledge depth' : k
    );

  if (overallScore >= 80) {
    return `Excellent resume with strong technical depth, clear experience progression and measurable impact. It is well-positioned for competitive roles.`;
  }
  if (overallScore >= 65) {
    return `Good resume that covers the essentials well. ${
      weak.length > 0
        ? `Focus on improving ${weak.join(' and ')} to push it to the next level.`
        : 'Minor refinements can elevate it further.'
    }`;
  }
  if (overallScore >= 45) {
    return `Average resume with noticeable gaps in ${weak.join(', ')}. Adding quantified achievements, more keywords and projects will significantly boost your score.`;
  }
  return `The resume needs substantial work — particularly in ${weak.join(', ')}. Start by expanding your experience section, listing technical skills and adding measurable results.`;
}

// ─── Top Strengths & Improvements ────────────────────────────────────────────

function deriveStrengthsAndImprovements(scores, sectionBonus) {
  const dimensionLabels = {
    keywords: 'keyword coverage',
    experience: 'work experience',
    knowledgeDepth: 'technical depth',
    creativity: 'impact & presentation',
  };

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b.score - a.score);

  const topStrengths = sorted
    .filter(([, v]) => v.score >= 55)
    .slice(0, 3)
    .map(([k, v]) => `${dimensionLabels[k]} (${v.score}/100)`);

  if (sectionBonus.sectionsFound.length >= 4 && topStrengths.length < 3) {
    topStrengths.push(`Well-organised with ${sectionBonus.sectionsFound.length} clear sections`);
  }

  if (topStrengths.length === 0) {
    topStrengths.push('Resume submitted — that is the first step!');
  }

  // Improvements: lowest scoring dimensions + specific actionable tips
  const improvements = [];
  sorted
    .slice()
    .reverse()
    .forEach(([key, val]) => {
      if (val.score < 60) {
        if (key === 'keywords')
          improvements.push('Add more tech keywords — languages, frameworks, tools and cloud services');
        if (key === 'experience')
          improvements.push('Quantify experience: "reduced load time by 35%" beats "improved performance"');
        if (key === 'knowledgeDepth')
          improvements.push('Add a Projects section with GitHub links and certifications');
        if (key === 'creativity')
          improvements.push('Include metrics, side projects, hackathons or open-source contributions');
      }
    });

  // Universal tips if still short
  if (improvements.length < 2) {
    improvements.push('Use strong action verbs: built, deployed, led, optimised, scaled');
  }
  if (improvements.length < 3) {
    improvements.push('Link your GitHub, portfolio or LinkedIn prominently at the top');
  }

  return { topStrengths: topStrengths.slice(0, 3), improvements: improvements.slice(0, 3) };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * evaluateResume(resumeText: string) → analysis object
 * Shape is identical to what Gemini returns so Results.jsx works unchanged.
 */
export function evaluateResume(resumeText) {
  if (!resumeText || typeof resumeText !== 'string') {
    throw new Error('evaluateResume: resumeText must be a non-empty string');
  }

  const keywords     = scoreKeywords(resumeText);
  const experience   = scoreExperience(resumeText);
  const knowledgeDepth = scoreKnowledgeDepth(resumeText);
  const creativity   = scoreCreativity(resumeText);

  const scores = { keywords, experience, knowledgeDepth, creativity };

  // Weighted overall: experience & keywords matter most
  const rawOverall =
    keywords.score      * 0.28 +
    experience.score    * 0.30 +
    knowledgeDepth.score * 0.25 +
    creativity.score    * 0.17;

  const sectionBonus = sectionCompletenessBonus(resumeText);
  const overallScore = clamp(rawOverall + sectionBonus.bonus);

  const summary = generateSummary(overallScore, scores);
  const { topStrengths, improvements } = deriveStrengthsAndImprovements(scores, sectionBonus);

  // Strip internal _raw fields before returning
  Object.values(scores).forEach((s) => delete s._raw);

  return {
    overallScore,
    summary,
    scores,
    topStrengths,
    improvements,
    _source: 'local', // lets the UI optionally badge the result
  };
}

