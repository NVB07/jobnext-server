const { pipeline } = require("@xenova/transformers");
const natural = require("natural");

// Add Gemini AI for intelligent scoring (optional)
let geminiAvailable = false;
let gemini = null;
let geminiQuotaExceeded = false;
let lastQuotaReset = Date.now();

// Reset quota status every hour
const QUOTA_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

function checkQuotaStatus() {
    const now = Date.now();
    if (now - lastQuotaReset > QUOTA_RESET_INTERVAL) {
        geminiQuotaExceeded = false;
        lastQuotaReset = now;
        console.log("🔄 Gemini quota status reset");
    }
}

// Try to load Gemini AI if available
try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    if (process.env.GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        gemini = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        geminiAvailable = true;
        console.log("✅ Gemini AI enabled for intelligent job matching");
        console.log("🔑 API Key found:", process.env.GEMINI_API_KEY ? "Yes" : "No");
        console.log("🤖 Model: gemini-1.5-flash");
    } else {
        console.log("❌ GEMINI_API_KEY not found in environment variables");
    }
} catch (error) {
    console.log("❌ Gemini AI not available:", error.message);
    console.log("📦 Try: npm install @google/generative-ai");
}

// Variable to store the model
let modelPipeline = null;

// Function to load model once
async function loadModel() {
    if (!modelPipeline) {
        console.time("Model loading");
        modelPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        console.timeEnd("Model loading");
        console.log("Model loaded successfully");
    }
    return modelPipeline;
}

async function initializeModel() {
    try {
        await loadModel();
        console.log("NLP Model đã được tải khi khởi động ứng dụng");
    } catch (error) {
        console.error("Lỗi khi tải model lúc khởi động:", error);
        process.exit(1); // Thoát ứng dụng nếu tải model thất bại
    }
}

// Language detection and normalization
function detectLanguage(text) {
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    const vietnameseWords =
        /\b(và|hoặc|nhưng|trong|trên|tại|để|của|với|bởi|cho|từ|là|có|không|được|này|đó|các|một|những|về|sau|trước|khi|nếu|thì|sẽ|đã|đang|rất|nhiều|ít|lớn|nhỏ|tốt|xấu|mới|cũ|cao|thấp|nhanh|chậm)\b/gi;

    const vietnameseCharCount = (text.match(vietnameseChars) || []).length;
    const englishWordCount = (text.match(englishWords) || []).length;
    const vietnameseWordCount = (text.match(vietnameseWords) || []).length;

    const totalChars = text.length;
    const vietnameseRatio = vietnameseCharCount / totalChars;
    const wordRatio = vietnameseWordCount / (englishWordCount + vietnameseWordCount + 1);

    if (vietnameseRatio > 0.05 || wordRatio > 0.3) {
        return "vi";
    }
    return "en";
}

// Technical terms and skills normalization dictionary
const TECH_TERMS_MAP = {
    // Programming Languages
    javascript: ["js", "javascript", "java script"],
    typescript: ["ts", "typescript", "type script"],
    python: ["python", "py"],
    java: ["java"],
    csharp: ["c#", "csharp", "c sharp"],
    cplusplus: ["c++", "cpp", "c plus plus"],
    php: ["php"],
    ruby: ["ruby", "rb"],
    go: ["golang", "go"],
    rust: ["rust"],
    swift: ["swift"],
    kotlin: ["kotlin"],

    // Frameworks & Libraries
    react: ["react", "reactjs", "react js"],
    angular: ["angular", "angularjs"],
    vue: ["vue", "vuejs", "vue js"],
    nodejs: ["node", "nodejs", "node js"],
    express: ["express", "expressjs"],
    django: ["django"],
    flask: ["flask"],
    spring: ["spring", "spring boot"],
    laravel: ["laravel"],
    nextjs: ["next", "nextjs", "next js"],
    nuxtjs: ["nuxt", "nuxtjs", "nuxt js"],

    // Databases
    mysql: ["mysql", "my sql"],
    postgresql: ["postgres", "postgresql", "postgre sql"],
    mongodb: ["mongo", "mongodb", "mongo db"],
    redis: ["redis"],
    elasticsearch: ["elastic", "elasticsearch", "elastic search"],
    sqlite: ["sqlite", "sql lite"],
    oracle: ["oracle"],
    sqlserver: ["sql server", "mssql", "microsoft sql"],

    // Cloud & DevOps
    aws: ["aws", "amazon web services"],
    azure: ["azure", "microsoft azure"],
    gcp: ["gcp", "google cloud", "google cloud platform"],
    docker: ["docker"],
    kubernetes: ["k8s", "kubernetes", "kube"],
    jenkins: ["jenkins"],
    gitlab: ["gitlab"],
    github: ["github"],
    terraform: ["terraform"],

    // Other Technologies
    git: ["git"],
    linux: ["linux"],
    nginx: ["nginx"],
    apache: ["apache"],
    microservices: ["microservice", "microservices", "micro services"],
    api: ["api", "rest api", "restful"],
    graphql: ["graphql", "graph ql"],
    json: ["json"],
    xml: ["xml"],
    html: ["html"],
    css: ["css"],
    sass: ["sass", "scss"],
    webpack: ["webpack"],
    babel: ["babel"],
    eslint: ["eslint"],

    // Vietnamese to English tech terms
    lap_trinh: ["lập trình", "lapTrinh", "programming"],
    phat_trien: ["phát triển", "phatTrien", "development", "dev"],
    ung_dung: ["ứng dụng", "ungDung", "application", "app"],
    website: ["website", "web site", "trang web"],
    mobile: ["mobile", "di động", "điện thoại"],
    frontend: ["frontend", "front end", "giao diện"],
    backend: ["backend", "back end", "máy chủ"],
    fullstack: ["fullstack", "full stack", "toàn stack"],
    database: ["database", "cơ sở dữ liệu", "db"],
    server: ["server", "máy chủ"],
    client: ["client", "khách hàng"],
    framework: ["framework", "khung làm việc"],
    library: ["library", "thư viện"],
};

// Experience terms normalization
const EXPERIENCE_TERMS_MAP = {
    intern: ["intern", "internship", "thực tập", "thực tập sinh", "sinh viên"],
    junior: ["junior", "jr", "entry level", "fresher", "mới ra trường"],
    mid: ["mid", "middle", "intermediate", "trung cấp"],
    senior: ["senior", "sr", "experienced", "kinh nghiệm", "cao cấp"],
    lead: ["lead", "leader", "trưởng", "trưởng nhóm", "team lead"],
    manager: ["manager", "quản lý", "giám đốc"],
    director: ["director", "giám đốc"],
    head: ["head", "trưởng"],
    chief: ["chief", "chủ tịch"],
    principal: ["principal", "chính"],
};

// Normalize technical terms in text
function normalizeTechTerms(text) {
    let normalizedText = text.toLowerCase();

    // Normalize technical terms
    for (const [canonical, variants] of Object.entries(TECH_TERMS_MAP)) {
        for (const variant of variants) {
            const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
            normalizedText = normalizedText.replace(regex, canonical);
        }
    }

    // Normalize experience terms
    for (const [canonical, variants] of Object.entries(EXPERIENCE_TERMS_MAP)) {
        for (const variant of variants) {
            const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
            normalizedText = normalizedText.replace(regex, canonical);
        }
    }

    return normalizedText;
}

// Enhanced text preprocessing with multilingual support
function preprocessText(text) {
    if (!text) return "";

    let processedText = text
        // Remove HTML tags
        .replace(/<[^>]*>/g, " ")
        // Remove special characters but keep alphanumeric, spaces, Vietnamese chars, and common punctuation
        .replace(/[^\w\sÀ-ỹ\u00C0-\u017F.,;:()\-+#]/g, " ")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim();

    // Normalize technical terms and experience levels
    processedText = normalizeTechTerms(processedText);

    // Convert to lowercase after normalization
    return processedText.toLowerCase();
}

// Enhanced technical skills extraction with multilingual support
function extractTechnicalSkills(text) {
    const normalizedText = preprocessText(text);
    const foundSkills = new Set();

    // Extract from normalized tech terms
    for (const [canonical, variants] of Object.entries(TECH_TERMS_MAP)) {
        const regex = new RegExp(`\\b${canonical}\\b`, "gi");
        if (regex.test(normalizedText)) {
            foundSkills.add(canonical);
        }
    }

    return Array.from(foundSkills);
}

// Multilingual experience level extraction
function extractExperienceLevel(text) {
    const normalizedText = preprocessText(text);

    // Enhanced regex patterns for both languages
    const experiencePatterns = [
        // English patterns
        /(\d+)\s*(\+)?\s*(?:year[s]?)\s*(?:of\s*)?(?:experience)/i,
        /(?:experience)\s*(?:of\s*)?(\d+)\s*(\+)?\s*(?:year[s]?)/i,
        /(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year[s]?)\s*(?:experience)/i,
        /(?:over|above)\s*(\d+)\s*(?:year[s]?)/i,

        // Vietnamese patterns
        /(\d+)\s*(\+)?\s*(?:năm)\s*(?:kinh\s*nghiệm)/i,
        /(?:kinh\s*nghiệm)\s*(\d+)\s*(\+)?\s*(?:năm)/i,
        /(\d+)\s*(?:-|đến)\s*(\d+)\s*(?:năm)\s*(?:kinh\s*nghiệm)/i,
        /(?:từ)\s*(\d+)\s*(?:năm)/i,
        /(?:trên)\s*(\d+)\s*(?:năm)/i,
    ];

    let yearsOfExperience = 0;
    let hasExperienceRequirement = false;

    for (const pattern of experiencePatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            hasExperienceRequirement = true;
            if (match[2] && !isNaN(parseInt(match[2]))) {
                yearsOfExperience = Math.max(parseInt(match[1]), parseInt(match[2]));
            } else {
                yearsOfExperience = parseInt(match[1]);
            }
            break;
        }
    }

    // Detect level using normalized terms
    const levelTerms = {
        intern: /\bintern\b/i,
        junior: /\bjunior\b/i,
        mid: /\bmid\b/i,
        senior: /\bsenior\b/i,
        lead: /\blead\b/i,
        manager: /\bmanager\b/i,
    };

    let positionLevel = "unknown";
    let detectedLevels = [];

    for (const [level, regex] of Object.entries(levelTerms)) {
        if (regex.test(normalizedText)) {
            detectedLevels.push(level);
        }
    }

    // Determine position level based on detected terms and years
    if (detectedLevels.includes("intern") || (hasExperienceRequirement && yearsOfExperience === 0)) {
        positionLevel = "intern";
    } else if (detectedLevels.includes("manager")) {
        positionLevel = "manager";
    } else if (detectedLevels.includes("lead")) {
        positionLevel = "lead";
    } else if (detectedLevels.includes("senior") || yearsOfExperience >= 5) {
        positionLevel = "senior";
    } else if (detectedLevels.includes("mid") || (yearsOfExperience >= 2 && yearsOfExperience < 5)) {
        positionLevel = "mid";
    } else if (detectedLevels.includes("junior") || yearsOfExperience > 0 || (!detectedLevels.length && hasExperienceRequirement)) {
        positionLevel = "junior";
    }

    return {
        yearsOfExperience,
        positionLevel,
        hasExperienceRequirement,
        detectedLevels,
        language: detectLanguage(text),
    };
}

// Get embedding with enhanced preprocessing
async function getEmbedding(text, id) {
    try {
        const model = await loadModel();
        const cleanText = preprocessText(text);

        // The model can handle multilingual text well, so we don't need to translate
        const output = await model(cleanText, { pooling: "mean", normalize: true });
        const embedding = Array.from(output.data);
        return embedding;
    } catch (error) {
        console.error("Error creating embedding:", error);
        throw error;
    }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        console.warn("Vector length mismatch");
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

// Enhanced missing requirements extraction with multilingual support
function extractMissingRequirements(cvText, jobText) {
    const stemmer = natural.PorterStemmer;
    const tokenizer = new natural.WordTokenizer();

    const cleanCvText = preprocessText(cvText);
    const cleanJobText = preprocessText(jobText);

    const cvTokens = tokenizer.tokenize(cleanCvText);
    const jobTokens = tokenizer.tokenize(cleanJobText);

    // Enhanced stopwords for both languages
    const stopWords = new Set([
        // English
        "the",
        "a",
        "an",
        "and",
        "but",
        "if",
        "or",
        "because",
        "as",
        "what",
        "which",
        "this",
        "that",
        "these",
        "those",
        "then",
        "just",
        "so",
        "than",
        "such",
        "when",
        "who",
        "whom",
        "how",
        "where",
        "why",
        "with",
        "from",
        "to",
        "for",
        "of",
        "by",
        "about",
        "against",
        "between",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "up",
        "down",
        "in",
        "out",
        "on",
        "off",
        "over",
        "under",
        "again",
        "further",
        "then",
        "once",
        "here",
        "there",
        "all",
        "any",
        "both",
        "each",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "too",
        "very",
        "can",
        "will",
        "just",
        "should",
        "now",
        "experience",
        "work",
        "working",
        "job",
        "candidate",
        "applicant",
        "position",
        "must",
        "required",
        "requirement",
        "skill",
        "skills",
        "able",
        "ability",
        "etc",
        "good",
        "well",
        "strong",
        "excellent",
        "team",
        "years",
        "year",
        "company",
        "role",
        "responsibilities",
        "looking",
        "seeking",
        "ideal",
        "perfect",

        // Vietnamese
        "là",
        "của",
        "có",
        "được",
        "trong",
        "với",
        "từ",
        "cho",
        "về",
        "sau",
        "trước",
        "khi",
        "nếu",
        "thì",
        "sẽ",
        "đã",
        "đang",
        "rất",
        "nhiều",
        "ít",
        "lớn",
        "nhỏ",
        "tốt",
        "xấu",
        "mới",
        "cũ",
        "cao",
        "thấp",
        "nhanh",
        "chậm",
        "và",
        "hoặc",
        "nhưng",
        "này",
        "đó",
        "các",
        "một",
        "những",
        "kinh",
        "nghiệm",
        "làm",
        "việc",
        "công",
        "ty",
        "ứng",
        "viên",
        "vị",
        "trí",
        "cần",
        "yêu",
        "cầu",
        "kỹ",
        "năng",
        "khả",
        "đội",
        "nhóm",
        "năm",
        "tháng",
        "ngày",
        "giờ",
    ]);

    // Extract technical skills from both texts
    const cvTechSkills = new Set(extractTechnicalSkills(cvText));
    const jobTechSkills = new Set(extractTechnicalSkills(jobText));

    // Find missing technical skills
    const missingTechSkills = [...jobTechSkills].filter((skill) => !cvTechSkills.has(skill));

    // Create stemmed CV tokens
    const cvStems = new Set(cvTokens.filter((word) => word.length > 2 && !stopWords.has(word) && /[a-z]/i.test(word)).map((word) => stemmer.stem(word)));

    // Use TF-IDF for other important terms
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    tfidf.addDocument(cleanJobText);

    const keyTerms = [];
    tfidf.listTerms(0).forEach((item) => {
        const term = item.term;
        if (term.length > 2 && !stopWords.has(term) && isNaN(Number(term)) && /[a-z]/i.test(term)) {
            const stemmedTerm = stemmer.stem(term);
            if (!cvStems.has(stemmedTerm) && !jobTechSkills.has(term)) {
                keyTerms.push({
                    term,
                    tfidf: item.tfidf,
                    type: "general",
                });
            }
        }
    });

    // Combine and prioritize missing requirements
    const allMissing = [
        ...missingTechSkills.map((skill) => ({ term: skill, type: "technical", priority: "high" })),
        ...keyTerms.slice(0, 8).map((item) => ({ ...item, priority: "medium" })),
    ];

    return allMissing.slice(0, 10);
}

// Enhanced keyword matching with multilingual support
function extractCommonKeywords(cvText, jobText) {
    const tokenizer = new natural.WordTokenizer();
    const cvTokens = new Set(tokenizer.tokenize(preprocessText(cvText)));
    const jobTokens = new Set(tokenizer.tokenize(preprocessText(jobText)));

    const commonWords = new Set([
        "with",
        "that",
        "this",
        "have",
        "from",
        "your",
        "they",
        "been",
        "were",
        "when",
        "the",
        "and",
        "for",
        "are",
        "not",
        "etc",
        "will",
        "our",
        "you",
        "can",
        "would",
        "should",
        "could",
        "may",
        "might",
        "must",
        "shall",
        "need",
        "want",
        "like",
        // Vietnamese common words
        "với",
        "mà",
        "này",
        "có",
        "từ",
        "của",
        "họ",
        "đã",
        "là",
        "khi",
        "và",
        "cho",
        "không",
        "sẽ",
        "chúng",
        "bạn",
        "có thể",
        "nên",
        "cần",
        "muốn",
        "thích",
    ]);

    const commonKeywords = [...cvTokens].filter((word) => jobTokens.has(word) && word.length > 3 && !commonWords.has(word) && /[a-z]/i.test(word));

    return commonKeywords;
}

// Enhanced BM25 filtering with multilingual preprocessing
function performBM25Filtering(cvText, jobTexts) {
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    // Add all jobs to TF-IDF model with enhanced preprocessing
    jobTexts.forEach((jobText) => {
        const cleanJobText = preprocessText(jobText);
        tfidf.addDocument(cleanJobText);
    });

    const cleanCvText = preprocessText(cvText);
    const scores = [];
    tfidf.tfidfs(cleanCvText, (i, measure) => {
        scores.push({ index: i, score: measure });
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.map((item) => item.index);
}

// Main processing function - enhanced for multilingual support with skill filtering
async function matchCVtoJobs(cvText, jobTexts, requiredSkills = []) {
    console.time("Step 1: Fast filtering");

    // Extract CV skills first for better filtering logic
    const cvTechSkills = new Set(extractTechnicalSkills(cvText));

    // Step 1: Apply different filtering strategies based on whether skills are specified
    let filteredJobIndices = [];
    let skillFilterApplied = false;

    if (requiredSkills && requiredSkills.length > 0) {
        skillFilterApplied = true;
        console.log(`Filtering jobs by required skills: ${requiredSkills.join(", ")}`);

        // Normalize required skills
        const normalizedRequiredSkills = requiredSkills.map((skill) => normalizeTechTerms(skill.toLowerCase()));

        // Softer filtering: Include jobs that have ANY mention of the skills (not just exact tech skills)
        filteredJobIndices = jobTexts
            .map((jobText, index) => {
                const jobTechSkills = extractTechnicalSkills(jobText);
                const normalizedJobText = preprocessText(jobText);

                // Score based on skill relevance
                let skillRelevanceScore = 0;

                // Check exact tech skill matches
                const exactMatches = normalizedRequiredSkills.filter((reqSkill) =>
                    jobTechSkills.some((jobSkill) => jobSkill.includes(reqSkill) || reqSkill.includes(jobSkill))
                ).length;

                // Check text mentions (broader matching)
                const textMentions = normalizedRequiredSkills.filter((reqSkill) => normalizedJobText.includes(reqSkill)).length;

                // Calculate relevance score
                skillRelevanceScore = exactMatches * 2 + textMentions; // Exact matches worth 2x

                return {
                    index,
                    skillRelevanceScore,
                    exactMatches,
                    textMentions,
                    hasAnyRelevance: skillRelevanceScore > 0,
                };
            })
            .filter((job) => job.hasAnyRelevance) // Keep jobs with any skill relevance
            .sort((a, b) => b.skillRelevanceScore - a.skillRelevanceScore)
            .map((job) => job.index);

        console.log(`Skill filtering: ${filteredJobIndices.length}/${jobTexts.length} jobs have skill relevance`);

        // If too few results with strict filtering, expand to semantic similarity
        if (filteredJobIndices.length < 15) {
            console.log("Expanding skill search with semantic similarity...");
            const semanticJobIndices = performBM25Filtering(cvText, jobTexts);
            const additionalJobs = semanticJobIndices.filter((index) => !filteredJobIndices.includes(index)).slice(0, 15 - filteredJobIndices.length);
            filteredJobIndices = [...filteredJobIndices, ...additionalJobs];
        }
    } else {
        // No skill filtering - use BM25 for general matching
        filteredJobIndices = performBM25Filtering(cvText, jobTexts);
    }

    // Step 2: Limit processing based on filter type
    let rankedJobIndices;
    if (skillFilterApplied) {
        // For skill-filtered results, process more jobs but prioritize skill matches
        rankedJobIndices = filteredJobIndices.slice(0, Math.min(30, filteredJobIndices.length));
    } else {
        // For general search, use standard limit
        rankedJobIndices = filteredJobIndices.slice(0, Math.min(50, filteredJobIndices.length));
    }

    console.timeEnd("Step 1: Fast filtering");
    console.time("Step 2: Semantic matching");

    try {
        // Extract CV information with multilingual support
        const cvExpInfo = extractExperienceLevel(cvText);

        // Create embedding for CV
        const cvEmbedding = await getEmbedding(cvText, "cv");

        // Get Gemini AI scores for top jobs if available
        let geminiScores = [];
        if (geminiAvailable && !geminiQuotaExceeded && rankedJobIndices.length > 0) {
            const topJobTexts = rankedJobIndices.map((index) => jobTexts[index]);
            const topJobSkills = rankedJobIndices.map((index) => {
                const jobTechSkills = extractTechnicalSkills(jobTexts[index]);
                return [...jobTechSkills];
            });

            // Smart limiting: fewer jobs for large datasets to avoid quota
            let maxGeminiJobs = 15;
            if (rankedJobIndices.length > 20) {
                maxGeminiJobs = 8; // Reduce to 8 for large datasets
            } else if (rankedJobIndices.length > 10) {
                maxGeminiJobs = 12; // Reduce to 12 for medium datasets
            }

            console.log(`🧠 Gemini will score top ${maxGeminiJobs} out of ${rankedJobIndices.length} jobs`);

            geminiScores = await batchGeminiScoring(cvText, topJobTexts, [...cvTechSkills], topJobSkills, maxGeminiJobs);
        } else if (geminiQuotaExceeded) {
            console.log("⏸️ Gemini API temporarily disabled due to quota limits");
        }

        // Process top job candidates
        const results = await Promise.all(
            rankedJobIndices.map(async (index, jobIndex) => {
                const jobId = `job_${index + 1}`;
                const jobText = jobTexts[index];

                // Extract job requirements with multilingual support
                const jobExpInfo = extractExperienceLevel(jobText);
                const jobTechSkills = new Set(extractTechnicalSkills(jobText));

                // Create embedding for job
                const jobEmbedding = await getEmbedding(jobText, jobId);

                // Calculate semantic similarity
                const similarity = cosineSimilarity(cvEmbedding, jobEmbedding);

                // Enhanced multilingual keyword matching
                const commonKeywords = extractCommonKeywords(cvText, jobText);

                // Technical skills matching - improved logic
                const commonTechSkills = [...cvTechSkills].filter((skill) => jobTechSkills.has(skill));
                const missingTechSkills = [...jobTechSkills].filter((skill) => !cvTechSkills.has(skill));

                // Enhanced technical skills scoring with significant skill filter bonus
                let techSkillsScore = 0;
                let skillFilterBonus = 1.0;

                if (skillFilterApplied && requiredSkills.length > 0) {
                    // When skills are filtered, give MAJOR bonus for any skill relevance
                    const normalizedRequiredSkills = requiredSkills.map((skill) => normalizeTechTerms(skill.toLowerCase()));

                    // Check CV skills match with required skills
                    const cvMatchedRequiredSkills = normalizedRequiredSkills.filter((reqSkill) =>
                        [...cvTechSkills].some((cvSkill) => cvSkill.includes(reqSkill) || reqSkill.includes(cvSkill))
                    );

                    // Check job skills match with required skills
                    const jobMatchedRequiredSkills = normalizedRequiredSkills.filter((reqSkill) =>
                        [...jobTechSkills].some((jobSkill) => jobSkill.includes(reqSkill) || reqSkill.includes(jobSkill))
                    );

                    const cvRequiredSkillRatio = cvMatchedRequiredSkills.length / requiredSkills.length;
                    const jobRequiredSkillRatio = jobMatchedRequiredSkills.length / requiredSkills.length;

                    // Massive bonus for skill-targeted search
                    if (cvRequiredSkillRatio >= 0.8) {
                        skillFilterBonus = 1.6; // 60% bonus for excellent CV skill match
                    } else if (cvRequiredSkillRatio >= 0.6) {
                        skillFilterBonus = 1.5; // 50% bonus for good CV skill match
                    } else if (cvRequiredSkillRatio >= 0.4) {
                        skillFilterBonus = 1.4; // 40% bonus for fair CV skill match
                    } else if (cvRequiredSkillRatio > 0) {
                        skillFilterBonus = 1.3; // 30% bonus for some CV skill match
                    } else if (jobRequiredSkillRatio > 0) {
                        skillFilterBonus = 1.2; // 20% bonus if job has required skills
                    }
                }

                if (jobTechSkills.size === 0) {
                    // No technical requirements in job
                    techSkillsScore = skillFilterApplied ? 0.8 : 0.7; // Higher baseline for skill search
                } else if (cvTechSkills.size === 0) {
                    // CV has no tech skills but job requires them
                    techSkillsScore = skillFilterApplied ? 0.4 : 0.3; // More lenient for skill search
                } else {
                    // Calculate base match ratio
                    const matchRatio = commonTechSkills.length / jobTechSkills.size;

                    // Enhanced bonuses for skill-filtered search
                    const hasRelevantSkills = commonTechSkills.length > 0;
                    const relevantSkillsBonus = hasRelevantSkills ? (skillFilterApplied ? 0.3 : 0.2) : 0;

                    // Bonus for CV having additional skills
                    const additionalSkillsCount = cvTechSkills.size - commonTechSkills.length;
                    const additionalSkillsBonus = Math.min(additionalSkillsCount * 0.04, 0.2);

                    // More generous progressive scoring for skill searches
                    let progressiveScore = 0;
                    if (matchRatio >= 0.8) {
                        progressiveScore = 1.0;
                    } else if (matchRatio >= 0.6) {
                        progressiveScore = 0.9; // Higher than before
                    } else if (matchRatio >= 0.4) {
                        progressiveScore = 0.8; // Higher than before
                    } else if (matchRatio >= 0.2) {
                        progressiveScore = 0.7; // Higher than before
                    } else if (hasRelevantSkills) {
                        progressiveScore = skillFilterApplied ? 0.6 : 0.4; // Much higher for skill search
                    } else {
                        progressiveScore = skillFilterApplied ? 0.4 : 0.2; // More lenient baseline
                    }

                    techSkillsScore = Math.min(progressiveScore + relevantSkillsBonus + additionalSkillsBonus, 1.0);
                }

                // Find missing requirements
                const missingRequirements = extractMissingRequirements(cvText, jobText);

                // Language compatibility bonus
                let languageBonus = 1.0;
                if (cvExpInfo.language === jobExpInfo.language) {
                    languageBonus = 1.1;
                } else if ((cvExpInfo.language === "vi" && jobExpInfo.language === "en") || (cvExpInfo.language === "en" && jobExpInfo.language === "vi")) {
                    languageBonus = 1.05;
                }

                // More lenient experience penalties for skill-targeted search
                let experiencePenalty = 1.0;
                const expLevels = ["intern", "junior", "mid", "senior", "lead", "manager"];

                if (cvExpInfo.positionLevel !== "unknown" && jobExpInfo.positionLevel !== "unknown") {
                    const cvLevelIndex = expLevels.indexOf(cvExpInfo.positionLevel);
                    const jobLevelIndex = expLevels.indexOf(jobExpInfo.positionLevel);
                    const levelDifference = Math.abs(cvLevelIndex - jobLevelIndex);

                    if (cvLevelIndex < jobLevelIndex) {
                        if (levelDifference >= 3) {
                            experiencePenalty = skillFilterApplied ? 0.75 : 0.6; // More lenient for skill search
                        } else if (levelDifference === 2) {
                            experiencePenalty = skillFilterApplied ? 0.85 : 0.75;
                        } else if (levelDifference === 1) {
                            experiencePenalty = skillFilterApplied ? 0.95 : 0.9;
                        }
                    } else if (cvLevelIndex > jobLevelIndex) {
                        experiencePenalty = 0.98;
                    }
                }

                // More lenient years experience penalties for skill search
                let yearsPenalty = 1.0;
                if (jobExpInfo.hasExperienceRequirement && jobExpInfo.yearsOfExperience > 0) {
                    const yearsDifference = jobExpInfo.yearsOfExperience - cvExpInfo.yearsOfExperience;
                    if (yearsDifference > 3) {
                        yearsPenalty = skillFilterApplied ? 0.8 : 0.7;
                    } else if (yearsDifference > 1) {
                        yearsPenalty = skillFilterApplied ? 0.9 : 0.85;
                    } else if (yearsDifference > 0) {
                        yearsPenalty = skillFilterApplied ? 0.98 : 0.95;
                    }
                }

                // Calculate combined factors
                const combinedPenalty = Math.max(experiencePenalty, yearsPenalty);

                // Boost scoring weights for skill-filtered search
                let semanticWeight, keywordWeight, techSkillsWeight, missingReqWeight;

                if (skillFilterApplied) {
                    // When skills are filtered, boost all components
                    semanticWeight = 0.4; // Higher baseline
                    keywordWeight = 0.25; // Higher baseline
                    techSkillsWeight = 0.3; // Reasonable weight with good scoring
                    missingReqWeight = 0.05; // Lower penalty
                } else {
                    // General search - standard approach
                    semanticWeight = 0.4;
                    keywordWeight = 0.25;
                    techSkillsWeight = 0.25;
                    missingReqWeight = 0.1;
                }

                const keywordFactor = Math.min(commonKeywords.length / 8, 1); // Easier to achieve
                const missingFactor = Math.max(0, 1 - missingRequirements.length * 0.02); // Less penalty

                let finalScore =
                    (similarity * semanticWeight + keywordFactor * keywordWeight + techSkillsScore * techSkillsWeight + missingFactor * missingReqWeight) *
                    combinedPenalty *
                    languageBonus *
                    skillFilterBonus *
                    100;

                // Get Gemini AI score if available
                const geminiScore = geminiScores[jobIndex] || null;
                let hybridScore = finalScore;

                // Universal score boost to make results more realistic
                const universalBoost = 1.15; // 15% boost for all jobs
                finalScore = Math.min(finalScore * universalBoost, 100); // Cap at 100

                if (geminiScore !== null) {
                    console.log(`🤖 Job ${jobIndex + 1}: NLP=${finalScore.toFixed(1)}, Gemini=${geminiScore}, Hybrid calculating...`);

                    // Enhanced hybrid scoring: 60% NLP + 40% Gemini AI
                    hybridScore = finalScore * 0.6 + geminiScore * 0.4;

                    // Apply significant boost if Gemini score is higher, but cap the result
                    if (geminiScore > finalScore) {
                        const boostAmount = Math.min((geminiScore - finalScore) * 0.3, 15); // Max 15 point boost
                        hybridScore = Math.min(finalScore + boostAmount, 100); // Cap at 100
                        console.log(`📈 Gemini boost applied: +${boostAmount.toFixed(1)} points`);
                    }

                    console.log(`✅ Final hybrid score: ${hybridScore.toFixed(1)}`);
                } else {
                    hybridScore = finalScore;
                }

                // Ensure score stays within range
                hybridScore = Math.max(Math.min(hybridScore, 100), 0);

                return {
                    jobId,
                    jobText: jobText.substring(0, 100) + "...",
                    matchScore: hybridScore.toFixed(2),
                    nlpScore: finalScore.toFixed(2),
                    geminiScore: geminiScore ? geminiScore.toFixed(2) : null,
                    semanticScore: (similarity * 100).toFixed(2),
                    skillFilterApplied,
                    skillFilterBonus: skillFilterBonus.toFixed(2),
                    languageInfo: {
                        cvLanguage: cvExpInfo.language,
                        jobLanguage: jobExpInfo.language,
                        languageBonus: languageBonus.toFixed(2),
                    },
                    experienceMatch: {
                        cvLevel: cvExpInfo.positionLevel,
                        jobLevel: jobExpInfo.positionLevel,
                        cvYears: cvExpInfo.yearsOfExperience,
                        jobYears: jobExpInfo.yearsOfExperience,
                        penalty: combinedPenalty.toFixed(2),
                    },
                    skillsMatch: {
                        commonTechSkills,
                        missingTechSkills,
                        techSkillsScore: techSkillsScore.toFixed(2),
                        matchRatio: (jobTechSkills.size > 0 ? commonTechSkills.length / jobTechSkills.size : 0).toFixed(2),
                    },
                    commonKeywords: commonKeywords.slice(0, 10),
                    missingRequirements: missingRequirements.map((req) => req.term || req),
                };
            })
        );

        // Sort results by decreasing score
        results.sort((a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore));

        console.timeEnd("Step 2: Semantic matching");

        return {
            cvText: cvText.substring(0, 100) + "...",
            cvInfo: {
                ...extractExperienceLevel(cvText),
                techSkills: [...cvTechSkills].slice(0, 10),
                language: detectLanguage(cvText),
            },
            searchInfo: {
                skillFilterApplied,
                requiredSkills: requiredSkills || [],
                totalJobsFiltered: skillFilterApplied ? filteredJobIndices.length : jobTexts.length,
                totalJobsProcessed: results.length,
                geminiAIEnabled: geminiAvailable,
                geminiJobsScored: geminiScores.filter((s) => s !== null).length,
            },
            jobMatches: results,
        };
    } catch (error) {
        console.error("Error during matching process:", error);
        throw error;
    }
}

// Gemini AI intelligent scoring function
async function getGeminiScore(cvText, jobText, cvSkills, jobSkills) {
    checkQuotaStatus(); // Check if quota should be reset

    if (!geminiAvailable || geminiQuotaExceeded) {
        return null;
    }

    try {
        const prompt = `
Analyze the compatibility between this CV and job posting. Provide a match score from 0-100.

CV SUMMARY:
${cvText.substring(0, 800)}

JOB POSTING:
${jobText.substring(0, 800)}

CV SKILLS: ${cvSkills.join(", ")}
JOB REQUIREMENTS: ${jobSkills.join(", ")}

Please evaluate:
1. Technical skills alignment
2. Experience level match  
3. Responsibility overlap
4. Industry/domain fit
5. Overall compatibility

Respond with ONLY a number between 0-100 representing the match percentage. Consider:
- 90-100: Excellent match, highly qualified
- 80-89: Very good match, well qualified
- 70-79: Good match, qualified with some gaps
- 60-69: Fair match, qualified but missing some requirements
- 50-59: Moderate match, partially qualified
- 40-49: Weak match, significant gaps
- 0-39: Poor match, not qualified

Score:`;

        const result = await gemini.generateContent(prompt);
        const response = result.response.text().trim();
        const scoreMatch = response.match(/\b([0-9]{1,2}|100)\b/);
        const score = scoreMatch ? parseInt(scoreMatch[0]) : null;

        if (score !== null && score >= 0 && score <= 100) {
            return score;
        }

        console.log(`⚠️ Invalid Gemini response: "${response}"`);
        return null;
    } catch (error) {
        if (error.message.includes("404") || error.message.includes("not found")) {
            console.error("❌ Gemini model not found. Disabling Gemini AI...");
            geminiAvailable = false; // Disable for future calls
        } else if (error.message.includes("quota") || error.message.includes("limit") || error.message.includes("429")) {
            console.error("⚠️ Gemini API quota exceeded. Disabling temporarily...");
            geminiQuotaExceeded = true;
            lastQuotaReset = Date.now();
        } else {
            console.error("❌ Gemini scoring error:", error.message);
        }
        return null;
    }
}

// Batch Gemini scoring for multiple jobs
async function batchGeminiScoring(cvText, jobTexts, cvSkills, jobSkillsArray, maxJobs = 10) {
    if (!geminiAvailable || geminiQuotaExceeded || jobTexts.length === 0) return [];

    try {
        // Limit to top jobs to avoid API rate limits
        const jobsToScore = Math.min(maxJobs, jobTexts.length);
        console.log(`Using Gemini AI to score top ${jobsToScore} jobs...`);

        const geminiScores = [];

        // Process jobs with delay to avoid rate limiting
        for (let i = 0; i < jobsToScore; i++) {
            if (geminiQuotaExceeded) {
                console.log(`⏹️ Stopping Gemini scoring at job ${i + 1} due to quota limit`);
                break;
            }

            const score = await getGeminiScore(cvText, jobTexts[i], cvSkills, jobSkillsArray[i]);
            geminiScores.push(score);

            // Add small delay between requests to avoid rate limiting
            if (i < jobsToScore - 1) {
                await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
            }
        }

        console.log(`Gemini scoring completed: ${geminiScores.filter((s) => s !== null).length}/${jobsToScore} successful`);
        return geminiScores;
    } catch (error) {
        console.error("Batch Gemini scoring error:", error);
        return [];
    }
}

const matchJobsNLP = async (cvText, jobTexts, requiredSkills = []) => {
    try {
        if (!cvText || !jobTexts || !Array.isArray(jobTexts)) {
            console.warn("Invalid input parameters for NLP matching");
            return null;
        }

        console.log("🚀 Starting job matching with enhanced NLP + AI scoring...");
        console.log(`📊 Processing ${jobTexts.length} jobs${requiredSkills.length > 0 ? ` with skills: [${requiredSkills.join(", ")}]` : ""}`);
        console.log(`🤖 Gemini AI: ${geminiAvailable && !geminiQuotaExceeded ? "ENABLED" : geminiQuotaExceeded ? "QUOTA_EXCEEDED" : "DISABLED"}`);

        console.time("Total processing time");
        const result = await matchCVtoJobs(cvText, jobTexts, requiredSkills);
        console.timeEnd("Total processing time");

        if (result && result.jobMatches) {
            const scores = result.jobMatches.map((job) => parseFloat(job.matchScore));
            const maxScore = Math.max(...scores);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

            console.log(`📈 Score Summary:`);
            console.log(`   • Highest: ${maxScore.toFixed(1)}%`);
            console.log(`   • Average: ${avgScore.toFixed(1)}%`);
            console.log(`   • Jobs processed: ${result.jobMatches.length}`);
            console.log(`   • Gemini jobs scored: ${result.searchInfo.geminiJobsScored || 0}`);
            if (geminiQuotaExceeded) {
                console.log(`   ⚠️ Gemini quota exceeded - using NLP only`);
            }
        }

        return result;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

module.exports = { matchJobsNLP, initializeModel };
