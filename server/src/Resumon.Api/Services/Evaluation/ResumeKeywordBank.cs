namespace Resumon.Api.Services.Evaluation;

/// <summary>
/// Curated keyword banks behind the in-house scoring engine. Ported verbatim from the previous
/// Node implementation (<c>api/evaluate.js</c>) so a resume scored before the migration gets the
/// same numbers afterwards.
/// </summary>
/// <remarks>
/// Category order matters: it drives the order of matched-keyword highlights and, because the
/// dimension sort is stable, the tie-breaking in strengths and improvements.
/// </remarks>
public static class ResumeKeywordBank
{
    /// <summary>One keyword category with the weight it carries in the keyword score.</summary>
    public sealed record Category(string Name, double Weight, string[] Keywords);

    public static readonly string[] Languages =
    [
        "javascript", "typescript", "python", "java", "c++", "c#", "c", "go",
        "golang", "rust", "ruby", "php", "swift", "kotlin", "scala", "r",
        "matlab", "perl", "haskell", "elixir", "dart", "julia", "lua",
        "assembly", "fortran", "cobol", "groovy", "objective-c", "bash",
        "shell", "powershell", "vba", "solidity",
    ];

    public static readonly string[] Frontend =
    [
        "react", "reactjs", "vue", "vuejs", "angular", "svelte", "nextjs",
        "next.js", "nuxt", "nuxtjs", "gatsby", "remix", "astro", "tailwind",
        "tailwindcss", "bootstrap", "sass", "scss", "less", "css", "html",
        "html5", "css3", "webpack", "vite", "rollup", "parcel", "redux",
        "zustand", "mobx", "recoil", "jotai", "tanstack", "react query",
        "storybook", "framer motion", "threejs", "three.js", "d3", "d3.js",
        "websocket", "webrtc", "pwa", "service worker",
    ];

    public static readonly string[] Backend =
    [
        "node", "nodejs", "node.js", "express", "expressjs", "fastapi",
        "django", "flask", "spring", "spring boot", "rails", "ruby on rails",
        "laravel", "nestjs", "nest.js", "hono", "fastify", "koa", "gin",
        "fiber", "actix", "rocket", "graphql", "rest", "restful", "grpc",
        "trpc", "microservices", "serverless", "lambda", "websockets",
        "message queue", "rabbitmq", "kafka", "celery", "worker",
    ];

    public static readonly string[] Databases =
    [
        "mongodb", "mongoose", "postgresql", "postgres", "mysql", "mariadb",
        "sqlite", "redis", "firebase", "firestore", "dynamodb", "cassandra",
        "elasticsearch", "opensearch", "supabase", "planetscale", "cockroachdb",
        "neo4j", "influxdb", "timescaledb", "prisma", "typeorm", "sequelize",
        "drizzle", "knex", "sqlalchemy", "hibernate", "orm",
    ];

    public static readonly string[] DevOps =
    [
        "docker", "kubernetes", "k8s", "helm", "aws", "gcp", "azure",
        "google cloud", "amazon web services", "ec2", "s3", "lambda",
        "cloudfront", "route53", "rds", "ecs", "eks", "fargate", "ci/cd",
        "github actions", "gitlab ci", "jenkins", "circleci", "travis ci",
        "terraform", "ansible", "chef", "puppet", "nginx", "apache",
        "linux", "ubuntu", "centos", "vercel", "netlify", "heroku",
        "digitalocean", "cloudflare", "monitoring", "prometheus", "grafana",
        "datadog", "sentry", "new relic", "elk stack", "logstash",
    ];

    public static readonly string[] Tools =
    [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "figma", "sketch", "adobe xd", "postman", "insomnia", "swagger",
        "openapi", "jest", "vitest", "cypress", "playwright", "selenium",
        "mocha", "chai", "pytest", "junit", "eslint", "prettier", "husky",
        "npm", "yarn", "pnpm", "pip", "cargo", "maven", "gradle",
        "makefile", "linux cli", "vim", "vscode", "intellij",
    ];

    public static readonly string[] MachineLearning =
    [
        "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas",
        "numpy", "scipy", "matplotlib", "seaborn", "plotly", "opencv",
        "hugging face", "transformers", "langchain", "llm", "gpt", "bert",
        "machine learning", "deep learning", "neural network", "nlp",
        "natural language processing", "computer vision", "reinforcement learning",
        "data science", "data analysis", "feature engineering", "model training",
        "model deployment", "mlops", "rag", "vector database", "embedding",
        "stable diffusion", "generative ai", "fine-tuning",
    ];

    public static readonly string[] Mobile =
    [
        "react native", "flutter", "swift", "swiftui", "uikit", "android",
        "kotlin", "java android", "expo", "ionic", "xamarin", "cordova",
        "capacitor", "mobile app", "ios", "android studio", "xcode",
    ];

    public static readonly string[] SoftSkills =
    [
        "leadership", "collaboration", "communication", "problem-solving",
        "agile", "scrum", "kanban", "sprint", "teamwork", "mentoring",
        "mentorship", "ownership", "initiative", "critical thinking",
        "time management", "adaptability", "cross-functional", "stakeholder",
    ];

    /// <summary>
    /// Categories in scoring order, each with its weight. Technical and infrastructure skills
    /// outweigh soft skills, matching <c>CATEGORY_WEIGHTS</c> in the original engine.
    /// </summary>
    public static readonly Category[] Categories =
    [
        new("languages", 1.4, Languages),
        new("frontend", 1.2, Frontend),
        new("backend", 1.2, Backend),
        new("databases", 1.1, Databases),
        new("devops", 1.2, DevOps),
        new("tools", 1.0, Tools),
        new("ml_ai", 1.3, MachineLearning),
        new("mobile", 1.0, Mobile),
        new("softSkills", 0.7, SoftSkills),
    ];

    public static readonly string[] ActionVerbs =
    [
        // engineering & building
        "built", "developed", "engineered", "architected", "designed", "implemented",
        "created", "wrote", "coded", "programmed", "prototyped", "shipped",
        // leadership & ownership
        "led", "managed", "owned", "directed", "coordinated", "supervised",
        "mentored", "coached", "trained", "guided", "established", "founded",
        // impact & improvement
        "optimized", "improved", "enhanced", "reduced", "increased", "accelerated",
        "scaled", "boosted", "streamlined", "automated", "modernized", "refactored",
        // delivery & collaboration
        "deployed", "launched", "delivered", "released", "migrated", "integrated",
        "collaborated", "contributed", "partnered", "supported", "resolved",
        // analysis & research
        "analyzed", "researched", "investigated", "evaluated", "reviewed",
        "audited", "monitored", "identified", "diagnosed", "benchmarked",
    ];

    public static readonly string[] JobTitles =
    [
        "software engineer", "software developer", "frontend developer",
        "backend developer", "fullstack developer", "full stack developer",
        "full-stack developer", "data scientist", "data engineer", "data analyst",
        "devops engineer", "sre", "site reliability", "platform engineer",
        "cloud engineer", "ml engineer", "machine learning engineer",
        "ai engineer", "product manager", "product owner", "ui/ux designer",
        "ux designer", "ui designer", "mobile developer", "android developer",
        "ios developer", "security engineer", "qa engineer", "test engineer",
        "solutions architect", "technical lead", "tech lead", "staff engineer",
        "principal engineer", "engineering manager", "cto", "vp of engineering",
        "intern", "software intern", "engineering intern", "research engineer",
        "embedded engineer", "systems engineer",
    ];

    public static readonly string[] Certifications =
    [
        "aws certified", "google certified", "microsoft certified", "azure certified",
        "certified kubernetes", "cka", "ckad", "gcp professional", "pmp",
        "comptia", "cissp", "ceh", "oscp", "oracle certified", "salesforce certified",
        "certified scrum", "csm", "professional scrum", "certification",
        "certificate", "certified",
    ];

    public static readonly string[] SectionHeaders =
    [
        "experience", "work experience", "professional experience", "employment",
        "education", "academic background", "projects", "personal projects",
        "open source", "skills", "technical skills", "certifications", "awards",
        "honors", "publications", "research", "volunteering", "extracurricular",
        "summary", "objective", "profile", "about me", "internship",
        "achievements", "accomplishments", "leadership", "activities",
    ];

    /// <summary>The four headers that count toward the section-completeness bonus.</summary>
    public static readonly string[] CoreSections = ["experience", "education", "skills", "projects"];

    /// <summary>Signals of self-directed work, used by the creativity dimension.</summary>
    public static readonly string[] SideProjectSignals =
    [
        "hackathon", "open source", "open-source", "side project", "personal project",
        "indie", "freelance", "freelancer", "npm package", "published package",
        "built from scratch", "launched", "shipped", "1st place", "winner",
        "runner-up", "finalist",
    ];
}
