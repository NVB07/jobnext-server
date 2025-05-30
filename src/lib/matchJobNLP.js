// const { pipeline } = require("@xenova/transformers");
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

let modelPipeline = null;
let pipelineFunction = null;

// // Function to load model once
// async function loadModel() {
//     if (!modelPipeline) {
//         console.time("Model loading");
//         modelPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
//         console.timeEnd("Model loading");
//         console.log("Model loaded successfully");
//     }
//     return modelPipeline;
// }

// async function initializeModel() {
//     try {
//         await loadModel();
//         console.log("NLP Model đã được tải khi khởi động ứng dụng");
//     } catch (error) {
//         console.error("Lỗi khi tải model lúc khởi động:", error);
//         process.exit(1); // Thoát ứng dụng nếu tải model thất bại
//     }
// }
async function initializePipeline() {
    if (!pipelineFunction) {
        const { pipeline } = await import("@xenova/transformers");
        pipelineFunction = pipeline;
    }
    return pipelineFunction;
}

// Function to load model once
async function loadModel() {
    if (!modelPipeline) {
        console.time("Model loading");
        const pipeline = await initializePipeline();
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

// Thêm cache cho embeddings và skills để tránh tính toán lại
const embeddingCache = new Map();
const skillsCache = new Map();
const preprocessCache = new Map();

// Giới hạn cache size để tránh memory leak
const MAX_CACHE_SIZE = 1000;

function cleanCache(cache) {
    if (cache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(cache.entries());
        entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.3)).forEach(([key]) => cache.delete(key));
    }
}

// Tối ưu hóa hàm preprocessing với cache
function preprocessText(text) {
    if (!text) return "";

    const cacheKey = text.substring(0, 100) + text.length; // Simple hash
    if (preprocessCache.has(cacheKey)) {
        return preprocessCache.get(cacheKey);
    }

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
    const result = processedText.toLowerCase();

    preprocessCache.set(cacheKey, result);
    cleanCache(preprocessCache);

    return result;
}

// Tối ưu hóa extraction skills với cache
function extractTechnicalSkills(text) {
    const cacheKey = text.substring(0, 100) + text.length;
    if (skillsCache.has(cacheKey)) {
        return skillsCache.get(cacheKey);
    }

    const normalizedText = preprocessText(text);
    const foundSkills = new Set();

    // Extract from normalized tech terms
    for (const [canonical, variants] of Object.entries(TECH_TERMS_MAP)) {
        const regex = new RegExp(`\\b${canonical}\\b`, "gi");
        if (regex.test(normalizedText)) {
            foundSkills.add(canonical);
        }
    }

    const result = Array.from(foundSkills);
    skillsCache.set(cacheKey, result);
    cleanCache(skillsCache);

    return result;
}

// Tối ưu hóa embedding với cache
async function getEmbedding(text, id) {
    try {
        const cacheKey = text.substring(0, 100) + text.length;
        if (embeddingCache.has(cacheKey)) {
            return embeddingCache.get(cacheKey);
        }

        const model = await loadModel();
        const cleanText = preprocessText(text);

        // The model can handle multilingual text well, so we don't need to translate
        const output = await model(cleanText, { pooling: "mean", normalize: true });
        const embedding = Array.from(output.data);

        embeddingCache.set(cacheKey, embedding);
        cleanCache(embeddingCache);

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

// Multilingual experience level extraction với cache
function extractExperienceLevel(text) {
    const cacheKey = text.substring(0, 100) + text.length;
    if (skillsCache.has(cacheKey + "_exp")) {
        return skillsCache.get(cacheKey + "_exp");
    }

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

    const result = {
        yearsOfExperience,
        positionLevel,
        hasExperienceRequirement,
        detectedLevels,
        language: detectLanguage(text),
    };

    skillsCache.set(cacheKey + "_exp", result);
    cleanCache(skillsCache);

    return result;
}

// Tối ưu hóa missing requirements extraction - giảm complexity
function extractMissingRequirements(cvText, jobText) {
    const stemmer = natural.PorterStemmer;
    const tokenizer = new natural.WordTokenizer();

    const cleanCvText = preprocessText(cvText);
    const cleanJobText = preprocessText(jobText);

    const cvTokens = tokenizer.tokenize(cleanCvText);
    const jobTokens = tokenizer.tokenize(cleanJobText);

    // Simplified stopwords list
    const stopWords = new Set([
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
        "with",
        "from",
        "to",
        "for",
        "of",
        "by",
        "about",
        "in",
        "out",
        "on",
        "off",
        "up",
        "down",
        "experience",
        "work",
        "working",
        "job",
        "candidate",
        "position",
        "must",
        "required",
        "skill",
        "với",
        "mà",
        "này",
        "có",
        "từ",
        "của",
        "và",
        "cho",
        "không",
        "sẽ",
        "kinh",
        "nghiệm",
        "làm",
        "việc",
    ]);

    // Extract technical skills from both texts
    const cvTechSkills = new Set(extractTechnicalSkills(cvText));
    const jobTechSkills = new Set(extractTechnicalSkills(jobText));

    // Find missing technical skills
    const missingTechSkills = [...jobTechSkills].filter((skill) => !cvTechSkills.has(skill));

    // Create stemmed CV tokens
    const cvStems = new Set(cvTokens.filter((word) => word.length > 2 && !stopWords.has(word) && /[a-z]/i.test(word)).map((word) => stemmer.stem(word)));

    // Simplified TF-IDF for other important terms
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    tfidf.addDocument(cleanJobText);

    const keyTerms = [];
    tfidf
        .listTerms(0)
        .slice(0, 5)
        .forEach((item) => {
            // Giới hạn 5 terms
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
        ...missingTechSkills.slice(0, 5).map((skill) => ({ term: skill, type: "technical", priority: "high" })),
        ...keyTerms.slice(0, 3).map((item) => ({ ...item, priority: "medium" })),
    ];

    return allMissing.slice(0, 8);
}

// Tối ưu hóa keyword matching - simplified version
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
    ]);

    const commonKeywords = [...cvTokens].filter((word) => jobTokens.has(word) && word.length > 3 && !commonWords.has(word) && /[a-z]/i.test(word));

    return commonKeywords.slice(0, 8); // Giới hạn 8 keywords
}

// Tối ưu hóa BM25 filtering - chỉ xử lý top jobs
function performBM25Filtering(cvText, jobTexts, limit = 20) {
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    // Giới hạn jobs để xử lý nhanh hơn
    const jobsToProcess = jobTexts.slice(0, Math.min(100, jobTexts.length));

    // Add jobs to TF-IDF model with enhanced preprocessing
    jobsToProcess.forEach((jobText) => {
        const cleanJobText = preprocessText(jobText);
        tfidf.addDocument(cleanJobText);
    });

    const cleanCvText = preprocessText(cvText);
    const scores = [];
    tfidf.tfidfs(cleanCvText, (i, measure) => {
        if (i < jobsToProcess.length) {
            scores.push({ index: i, score: measure });
        }
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit).map((item) => item.index);
}

// Tối ưu hóa hàm chính - giảm số lượng jobs xử lý và parallel processing
async function matchCVtoJobs(cvText, jobTexts, requiredSkills = []) {
    console.time("Step 1: Fast filtering");

    // Giới hạn tổng số jobs xử lý để tối ưu performance
    const MAX_JOBS_TO_PROCESS = Math.min(50, jobTexts.length);
    const SKILL_FILTER_LIMIT = Math.min(25, jobTexts.length);
    const GENERAL_FILTER_LIMIT = Math.min(30, jobTexts.length);

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

        // Tối ưu: chỉ xử lý batch nhỏ để tăng tốc
        const batchSize = 10;
        const skillRelevanceJobs = [];

        for (let i = 0; i < jobTexts.length; i += batchSize) {
            const batch = jobTexts.slice(i, Math.min(i + batchSize, jobTexts.length));

            const batchResults = batch.map((jobText, batchIndex) => {
                const index = i + batchIndex;
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
            });

            skillRelevanceJobs.push(...batchResults);

            // Only break early if we have way more than enough jobs to avoid missing targets
            if (skillRelevanceJobs.length >= MAX_JOBS_TO_PROCESS * 3) break;
        }

        // Sort by skill relevance and take top skill-matching jobs
        const skillMatchingJobs = skillRelevanceJobs
            .filter((job) => job.hasAnyRelevance)
            .sort((a, b) => b.skillRelevanceScore - a.skillRelevanceScore)
            .slice(0, Math.min(SKILL_FILTER_LIMIT, MAX_JOBS_TO_PROCESS * 0.7));

        // Also include some non-skill-matching jobs to reach maxJobs limit
        const nonSkillMatchingJobs = skillRelevanceJobs.filter((job) => !job.hasAnyRelevance).slice(0, Math.max(0, MAX_JOBS_TO_PROCESS - skillMatchingJobs.length));

        // Combine and take up to maxJobs
        filteredJobIndices = [...skillMatchingJobs.map((job) => job.index), ...nonSkillMatchingJobs.map((job) => job.index)].slice(0, MAX_JOBS_TO_PROCESS);

        console.log(
            `Skill filtering: ${skillMatchingJobs.length} skill-matching + ${nonSkillMatchingJobs.length} other jobs = ${filteredJobIndices.length}/${jobTexts.length} total`
        );

        // If still don't have enough jobs, add remaining jobs sequentially
        if (filteredJobIndices.length < MAX_JOBS_TO_PROCESS && filteredJobIndices.length < jobTexts.length) {
            console.log(`Adding remaining jobs to reach maxJobs limit: ${MAX_JOBS_TO_PROCESS}`);
            const allJobIndices = Array.from({ length: jobTexts.length }, (_, i) => i);
            const remainingJobs = allJobIndices.filter((index) => !filteredJobIndices.includes(index));
            const additionalJobs = remainingJobs.slice(0, MAX_JOBS_TO_PROCESS - filteredJobIndices.length);
            filteredJobIndices = [...filteredJobIndices, ...additionalJobs];
            console.log(`Added ${additionalJobs.length} additional jobs. Total: ${filteredJobIndices.length}/${jobTexts.length}`);
        }

        // If still too few results, expand with semantic similarity
        if (filteredJobIndices.length < Math.min(MAX_JOBS_TO_PROCESS * 0.5, 15)) {
            console.log("Expanding search with semantic similarity...");
            const semanticJobIndices = performBM25Filtering(cvText, jobTexts, MAX_JOBS_TO_PROCESS);
            const additionalJobs = semanticJobIndices.filter((index) => !filteredJobIndices.includes(index)).slice(0, MAX_JOBS_TO_PROCESS - filteredJobIndices.length);
            filteredJobIndices = [...filteredJobIndices, ...additionalJobs];
        }
    } else {
        // No skill filtering - use BM25 for general matching
        filteredJobIndices = performBM25Filtering(cvText, jobTexts, Math.min(MAX_JOBS_TO_PROCESS, GENERAL_FILTER_LIMIT));
    }

    // Step 2: Limit processing based on filter type và performance
    let rankedJobIndices = filteredJobIndices.slice(0, MAX_JOBS_TO_PROCESS);

    console.timeEnd("Step 1: Fast filtering");
    console.time("Step 2: Semantic matching");

    try {
        // Extract CV information with multilingual support
        const cvExpInfo = extractExperienceLevel(cvText);

        // Create embedding for CV
        const cvEmbedding = await getEmbedding(cvText, "cv");

        // Get Gemini AI scores for top jobs if available - giảm số lượng
        let geminiScores = [];
        if (geminiAvailable && !geminiQuotaExceeded && rankedJobIndices.length > 0) {
            const topJobTexts = rankedJobIndices.map((index) => jobTexts[index]);
            const topJobSkills = rankedJobIndices.map((index) => {
                const jobTechSkills = extractTechnicalSkills(jobTexts[index]);
                return [...jobTechSkills];
            });

            // Giảm mạnh số lượng jobs cho Gemini để tăng tốc
            let maxGeminiJobs = Math.min(8, rankedJobIndices.length);
            if (rankedJobIndices.length > 15) {
                maxGeminiJobs = 5; // Chỉ 5 jobs cho datasets lớn
            }

            console.log(`🧠 Gemini will score top ${maxGeminiJobs} out of ${rankedJobIndices.length} jobs`);

            geminiScores = await batchGeminiScoring(cvText, topJobTexts, [...cvTechSkills], topJobSkills, maxGeminiJobs);
        } else if (geminiQuotaExceeded) {
            console.log("⏸️ Gemini API temporarily disabled due to quota limits");
        }

        // Tối ưu: xử lý parallel với batch nhỏ để tránh memory overload
        const BATCH_SIZE = 5;
        const results = [];

        for (let i = 0; i < rankedJobIndices.length; i += BATCH_SIZE) {
            const batchIndices = rankedJobIndices.slice(i, Math.min(i + BATCH_SIZE, rankedJobIndices.length));

            const batchResults = await Promise.all(
                batchIndices.map(async (index, batchJobIndex) => {
                    const jobIndex = i + batchJobIndex;
                    const jobId = `job_${index + 1}`;
                    const jobText = jobTexts[index];

                    // Extract job requirements with multilingual support
                    const jobExpInfo = extractExperienceLevel(jobText);
                    const jobTechSkills = new Set(extractTechnicalSkills(jobText));

                    // Create embedding for job
                    const jobEmbedding = await getEmbedding(jobText, jobId);

                    // Calculate semantic similarity
                    const similarity = cosineSimilarity(cvEmbedding, jobEmbedding);

                    // Simplified keyword matching để tăng tốc
                    const commonKeywords = extractCommonKeywords(cvText, jobText).slice(0, 5); // Giới hạn 5 keywords

                    // Technical skills matching - improved logic
                    const commonTechSkills = [...cvTechSkills].filter((skill) => jobTechSkills.has(skill));
                    const missingTechSkills = [...jobTechSkills].filter((skill) => !cvTechSkills.has(skill)).slice(0, 5); // Giới hạn 5

                    // Simplified scoring để tăng tốc
                    let techSkillsScore = 0;
                    let skillFilterBonus = 1.0;

                    if (skillFilterApplied && requiredSkills.length > 0) {
                        const normalizedRequiredSkills = requiredSkills.map((skill) => normalizeTechTerms(skill.toLowerCase()));
                        const cvMatchedRequiredSkills = normalizedRequiredSkills.filter((reqSkill) =>
                            [...cvTechSkills].some((cvSkill) => cvSkill.includes(reqSkill) || reqSkill.includes(cvSkill))
                        );
                        const cvRequiredSkillRatio = cvMatchedRequiredSkills.length / requiredSkills.length;

                        // 🚀 ULTRA-STRICT: Much reduced skill bonus to prevent score inflation
                        const skillBonusMultiplier = checkExperience ? 1.0 : 0.5; // Even more reduction when experience is ignored

                        if (cvRequiredSkillRatio >= 0.8) {
                            skillFilterBonus = 1.0 + 0.35 * skillBonusMultiplier; // Max 1.35 with experience, 1.175 without (reduced from 1.6)
                        } else if (cvRequiredSkillRatio >= 0.6) {
                            skillFilterBonus = 1.0 + 0.25 * skillBonusMultiplier; // Max 1.25 with experience, 1.125 without (reduced from 1.5)
                        } else if (cvRequiredSkillRatio >= 0.4) {
                            skillFilterBonus = 1.0 + 0.15 * skillBonusMultiplier; // Max 1.15 with experience, 1.075 without (reduced from 1.4)
                        } else if (cvRequiredSkillRatio > 0) {
                            skillFilterBonus = 1.0 + 0.1 * skillBonusMultiplier; // Max 1.1 with experience, 1.05 without (reduced from 1.3)
                        }

                        console.log(`🎯 STRICT Skill Filter Bonus: ${skillFilterBonus.toFixed(2)} (Experience check: ${checkExperience ? "ON" : "OFF"})`);
                    }

                    if (jobTechSkills.size === 0) {
                        techSkillsScore = skillFilterApplied ? 0.7 : 0.6; // Increased slightly from 0.6/0.5
                    } else if (cvTechSkills.size === 0) {
                        techSkillsScore = skillFilterApplied ? 0.3 : 0.25; // Increased slightly from 0.25/0.2
                    } else {
                        const matchRatio = commonTechSkills.length / jobTechSkills.size;
                        let progressiveScore = 0;
                        if (matchRatio >= 0.8) progressiveScore = 0.9; // Increased from 0.85 to 0.9
                        else if (matchRatio >= 0.6) progressiveScore = 0.8; // Increased from 0.75 to 0.8
                        else if (matchRatio >= 0.4) progressiveScore = 0.7; // Increased from 0.65 to 0.7
                        else if (matchRatio >= 0.2) progressiveScore = 0.6; // Increased from 0.55 to 0.6
                        else if (commonTechSkills.length > 0) progressiveScore = skillFilterApplied ? 0.45 : 0.35; // Increased slightly
                        else progressiveScore = skillFilterApplied ? 0.3 : 0.2; // Increased slightly

                        techSkillsScore = progressiveScore;
                    }

                    // Simplified missing requirements để tăng tốc
                    const missingRequirements = extractMissingRequirements(cvText, jobText).slice(0, 5);

                    // 🎯 ENHANCED: Much stricter experience level penalty
                    let combinedPenalty = 1.0;

                    // 🆕 NEW: Only apply experience penalty if checkExperience is enabled
                    if (checkExperience && cvExpInfo.positionLevel !== "unknown" && jobExpInfo.positionLevel !== "unknown") {
                        const expLevels = ["intern", "junior", "mid", "senior", "lead", "manager"];
                        const cvLevelIndex = expLevels.indexOf(cvExpInfo.positionLevel);
                        const jobLevelIndex = expLevels.indexOf(jobExpInfo.positionLevel);
                        const levelDifference = Math.abs(cvLevelIndex - jobLevelIndex);

                        // 🚨 MUCH STRICTER: Severe penalties for experience mismatches
                        if (cvLevelIndex < jobLevelIndex) {
                            // Candidate is under-qualified
                            if (levelDifference >= 3) {
                                // e.g., Junior applying for Manager/Lead (3+ levels gap)
                                combinedPenalty = 0.15; // -85% penalty (was 0.75)
                                console.log(
                                    `🚨 SEVERE UNDERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} levels gap) | Penalty: -85%`
                                );
                            } else if (levelDifference >= 2) {
                                // e.g., Junior applying for Senior (2 levels gap)
                                combinedPenalty = 0.35; // -65% penalty (was 0.75)
                                console.log(
                                    `⚠️  SIGNIFICANT UNDERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} levels gap) | Penalty: -65%`
                                );
                            } else if (levelDifference >= 1) {
                                // e.g., Junior applying for Mid (1 level gap)
                                combinedPenalty = 0.7; // -30% penalty (was 0.85)
                                console.log(
                                    `🔶 MINOR UNDERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} level gap) | Penalty: -30%`
                                );
                            }
                        } else if (cvLevelIndex > jobLevelIndex && levelDifference >= 2) {
                            // Candidate is over-qualified (less penalty)
                            combinedPenalty = 0.8; // -20% penalty for being overqualified
                            console.log(
                                `🔽 OVERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} levels above) | Penalty: -20%`
                            );
                        }

                        // 🆕 NEW: Additional years of experience mismatch check
                        const yearsDifference = Math.abs(cvExpInfo.yearsOfExperience - jobExpInfo.yearsOfExperience);
                        if (jobExpInfo.yearsOfExperience > 0 && cvExpInfo.yearsOfExperience < jobExpInfo.yearsOfExperience) {
                            const yearsGap = jobExpInfo.yearsOfExperience - cvExpInfo.yearsOfExperience;
                            if (yearsGap >= 3) {
                                // Severe years gap (e.g., 2 years exp vs 5+ years required)
                                const additionalPenalty = Math.min(yearsGap * 0.05, 0.25); // Up to -25% additional penalty
                                combinedPenalty = Math.max(combinedPenalty - additionalPenalty, 0.1); // Minimum 10% final score
                                console.log(
                                    `📅 YEARS EXPERIENCE GAP: Has ${cvExpInfo.yearsOfExperience} years, needs ${
                                        jobExpInfo.yearsOfExperience
                                    }+ years | Additional penalty: -${(additionalPenalty * 100).toFixed(0)}%`
                                );
                            }
                        }
                    } else if (!checkExperience) {
                        // 🆕 NEW: When experience checking is disabled, apply a much stronger universal penalty
                        // to prevent score inflation while still allowing good matches
                        combinedPenalty = 0.45; // -55% universal penalty when experience is ignored (increased from -45%)
                        console.log(`🔇 EXPERIENCE CHECK DISABLED | Universal penalty: -55%`);
                    }

                    // 🆕 NEW: Additional penalty for having multiple filters disabled
                    let filterBypassPenalty = 1.0;
                    const disabledFilters = [!checkSkills, !checkLocation, !checkExperience].filter(Boolean).length;
                    if (disabledFilters >= 2) {
                        filterBypassPenalty = 0.85; // -15% additional penalty for bypassing 2+ filters
                        console.log(`⚠️ MULTIPLE FILTERS DISABLED (${disabledFilters}/3) | Additional penalty: -15%`);
                    } else if (disabledFilters === 1) {
                        filterBypassPenalty = 0.95; // -5% penalty for bypassing 1 filter
                        console.log(`🔶 ONE FILTER DISABLED | Minor penalty: -5%`);
                    }

                    // 🚀 ULTRA-STRICT: Much more conservative scoring weights
                    const semanticWeight = 0.45; // Increased back from 0.35 to 0.45
                    const keywordWeight = 0.25; // Keep at 0.25
                    const techSkillsWeight = 0.3; // Reduced from 0.4 to 0.3

                    const keywordFactor = Math.min(commonKeywords.length / (fastMode ? 3 : 5), 1);
                    // 🔧 FIX: Missing factor should boost jobs with fewer missing requirements
                    const missingFactor = Math.max(0.6, 1 - missingRequirements.length * (fastMode ? 0.08 : 0.05)); // Less aggressive penalty

                    // 🔧 ADJUSTED: Less aggressive similarity penalty
                    let similarityPenalty = 1.0;
                    if (similarity > 0.98) {
                        similarityPenalty = 0.92; // -8% penalty for extremely high similarity (reduced from -15%)
                        console.log(`🚨 EXTREMELY HIGH SIMILARITY DETECTED: ${(similarity * 100).toFixed(1)}% | Applying -8% penalty`);
                    } else if (similarity > 0.95) {
                        similarityPenalty = 0.96; // -4% penalty for very high similarity (reduced from -8%)
                        console.log(`⚠️ VERY HIGH SIMILARITY DETECTED: ${(similarity * 100).toFixed(1)}% | Applying -4% penalty`);
                    }

                    let finalScore =
                        (similarity * semanticWeight + keywordFactor * keywordWeight + techSkillsScore * techSkillsWeight) *
                        combinedPenalty *
                        skillFilterBonus *
                        filterBypassPenalty *
                        similarityPenalty *
                        missingFactor *
                        100;

                    // 🔍 DEBUG: Log detailed score breakdown for debugging
                    if (jobIndex < 3) {
                        // Only log first 3 jobs to avoid spam
                        console.log(`\n🔍 DEBUG Job ${jobIndex + 1}:`);
                        console.log(`  Semantic: ${similarity.toFixed(3)} × ${semanticWeight} = ${(similarity * semanticWeight).toFixed(3)}`);
                        console.log(`  Keywords: ${keywordFactor.toFixed(3)} × ${keywordWeight} = ${(keywordFactor * keywordWeight).toFixed(3)}`);
                        console.log(`  TechSkills: ${techSkillsScore.toFixed(3)} × ${techSkillsWeight} = ${(techSkillsScore * techSkillsWeight).toFixed(3)}`);
                        console.log(
                            `  Base Score: ${((similarity * semanticWeight + keywordFactor * keywordWeight + techSkillsScore * techSkillsWeight) * 100).toFixed(1)}%`
                        );
                        console.log(
                            `  Penalties: exp=${combinedPenalty.toFixed(2)}, filter=${filterBypassPenalty.toFixed(2)}, sim=${similarityPenalty.toFixed(
                                2
                            )}, missing=${missingFactor.toFixed(2)}`
                        );
                        console.log(`  Skill Bonus: ${skillFilterBonus.toFixed(2)}`);
                        console.log(`  Final Score: ${finalScore.toFixed(1)}%`);
                        console.log(`  Common Skills: [${commonTechSkills.join(", ")}]`);
                        console.log(`  Missing Req: ${missingRequirements.length} items`);
                    }

                    // Get Gemini AI score if available
                    const geminiScore = geminiScores[jobIndex] || null;
                    let hybridScore = finalScore;

                    // 🔧 ADJUSTED: Slightly higher score caps for better balance
                    if (checkExperience) {
                        const universalBoost = 1.1; // Increased from 1.08 to 1.1
                        finalScore = Math.min(finalScore * universalBoost, 90); // Increased cap from 85% to 90%
                    }
                    // When checkExperience = false, no boost is applied

                    // 🚨 ADJUSTED: More reasonable maximum score caps
                    let maxAllowedScore = 90; // Increased from 85 to 90
                    if (disabledFilters >= 2) {
                        maxAllowedScore = 70; // Increased from 65 to 70
                    } else if (disabledFilters === 1) {
                        maxAllowedScore = 80; // Increased from 75 to 80
                    }

                    finalScore = Math.min(finalScore, maxAllowedScore);

                    if (geminiScore !== null) {
                        hybridScore = finalScore * 0.6 + geminiScore * 0.4;
                        if (geminiScore > finalScore) {
                            const boostAmount = Math.min((geminiScore - finalScore) * 0.3, 15);
                            hybridScore = Math.min(finalScore + boostAmount, maxAllowedScore); // Also cap hybrid score
                        }
                    } else {
                        hybridScore = finalScore;
                    }

                    hybridScore = Math.max(Math.min(hybridScore, maxAllowedScore), 0); // Final capping

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
                            languageBonus: "1.00",
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
                        commonKeywords,
                        missingRequirements: missingRequirements.map((req) => req.term || req),
                    };
                })
            );

            results.push(...batchResults);

            // Thêm delay nhỏ giữa các batch để tránh memory spike - chỉ trong slow mode
            if (!fastMode && i + BATCH_SIZE < rankedJobIndices.length) {
                await new Promise((resolve) => setTimeout(resolve, 5));
            }
        }

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
                optimizedProcessing: true,
                fastMode: fastMode,
                maxJobsProcessed: MAX_JOBS_TO_PROCESS,
                performanceMode: fastMode ? "fast" : "standard",
                checkboxFilters: {
                    skills: checkSkills,
                    location: checkLocation,
                    experience: checkExperience,
                },
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

const matchJobsNLP = async (cvText, jobTexts, requiredSkills = [], options = {}) => {
    try {
        if (!cvText || !jobTexts || !Array.isArray(jobTexts)) {
            console.warn("Invalid input parameters for NLP matching");
            return null;
        }

        // Parse performance options + checkbox options
        const {
            fastMode = jobTexts.length > 30, // Auto enable fast mode for large datasets
            maxJobs = fastMode ? 25 : 50,
            useCache = true,
            geminiLimit = fastMode ? 3 : 8,
            // 🆕 NEW: Checkbox filtering options
            checkSkills = true, // Whether to check skills matching
            checkLocation = true, // Whether to check location matching
            checkExperience = true, // Whether to check experience level
        } = options;

        console.log("🚀 Starting OPTIMIZED job matching with enhanced NLP + AI scoring...");
        console.log(`📊 Processing ${jobTexts.length} jobs${requiredSkills.length > 0 ? ` with skills: [${requiredSkills.join(", ")}]` : ""}`);
        console.log(`⚡ Fast mode: ${fastMode ? "ENABLED" : "DISABLED"} | Max jobs: ${maxJobs} | Gemini limit: ${geminiLimit}`);
        console.log(`🤖 Gemini AI: ${geminiAvailable && !geminiQuotaExceeded ? "ENABLED" : geminiQuotaExceeded ? "QUOTA_EXCEEDED" : "DISABLED"}`);
        console.log(`🔍 Checkbox Filters: Skills=${checkSkills}, Location=${checkLocation}, Experience=${checkExperience}`);

        // Clear cache periodically to prevent memory leaks
        if (!useCache || Math.random() < 0.1) {
            // 10% chance to clear cache
            embeddingCache.clear();
            skillsCache.clear();
            preprocessCache.clear();
            console.log("🧹 Cache cleared for memory optimization");
        }

        console.time("Total processing time");

        // Pass performance options + checkbox options to the main function
        const performanceOptions = { fastMode, maxJobs, geminiLimit, checkSkills, checkLocation, checkExperience };
        const result = await matchCVtoJobsOptimized(cvText, jobTexts, requiredSkills, performanceOptions);

        console.timeEnd("Total processing time");

        if (result && result.jobMatches) {
            const scores = result.jobMatches.map((job) => parseFloat(job.matchScore));
            const maxScore = Math.max(...scores);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

            console.log(`📈 Score Summary:`);
            console.log(`   • Highest: ${maxScore.toFixed(1)}%`);
            console.log(`   • Average: ${avgScore.toFixed(1)}%`);
            console.log(`   • Jobs processed: ${result.jobMatches.length}/${jobTexts.length}`);
            console.log(`   • Processing time optimized: ${fastMode ? "Yes" : "No"}`);
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

// Optimized version of matchCVtoJobs with performance options
async function matchCVtoJobsOptimized(cvText, jobTexts, requiredSkills = [], perfOptions = {}) {
    const { fastMode = false, maxJobs = 50, geminiLimit = 8, checkSkills = true, checkLocation = true, checkExperience = true } = perfOptions;

    console.time("Step 1: Fast filtering");

    // Dynamic limits based on dataset size and performance mode
    const MAX_JOBS_TO_PROCESS = Math.min(maxJobs, jobTexts.length);
    const SKILL_FILTER_LIMIT = Math.min(fastMode ? 15 : 25, jobTexts.length);
    const GENERAL_FILTER_LIMIT = Math.min(fastMode ? 20 : 30, jobTexts.length);

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

        // Tối ưu: chỉ xử lý batch nhỏ để tăng tốc
        const batchSize = 10;
        const skillRelevanceJobs = [];

        for (let i = 0; i < jobTexts.length; i += batchSize) {
            const batch = jobTexts.slice(i, Math.min(i + batchSize, jobTexts.length));

            const batchResults = batch.map((jobText, batchIndex) => {
                const index = i + batchIndex;
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
            });

            skillRelevanceJobs.push(...batchResults);

            // Only break early if we have way more than enough jobs to avoid missing targets
            if (skillRelevanceJobs.length >= MAX_JOBS_TO_PROCESS * 3) break;
        }

        // Sort by skill relevance and take top skill-matching jobs
        const skillMatchingJobs = skillRelevanceJobs
            .filter((job) => job.hasAnyRelevance)
            .sort((a, b) => b.skillRelevanceScore - a.skillRelevanceScore)
            .slice(0, Math.min(SKILL_FILTER_LIMIT, MAX_JOBS_TO_PROCESS * 0.7));

        // Also include some non-skill-matching jobs to reach maxJobs limit
        const nonSkillMatchingJobs = skillRelevanceJobs.filter((job) => !job.hasAnyRelevance).slice(0, Math.max(0, MAX_JOBS_TO_PROCESS - skillMatchingJobs.length));

        // Combine and take up to maxJobs
        filteredJobIndices = [...skillMatchingJobs.map((job) => job.index), ...nonSkillMatchingJobs.map((job) => job.index)].slice(0, MAX_JOBS_TO_PROCESS);

        console.log(
            `Skill filtering: ${skillMatchingJobs.length} skill-matching + ${nonSkillMatchingJobs.length} other jobs = ${filteredJobIndices.length}/${jobTexts.length} total`
        );

        // If still don't have enough jobs, add remaining jobs sequentially
        if (filteredJobIndices.length < MAX_JOBS_TO_PROCESS && filteredJobIndices.length < jobTexts.length) {
            console.log(`Adding remaining jobs to reach maxJobs limit: ${MAX_JOBS_TO_PROCESS}`);
            const allJobIndices = Array.from({ length: jobTexts.length }, (_, i) => i);
            const remainingJobs = allJobIndices.filter((index) => !filteredJobIndices.includes(index));
            const additionalJobs = remainingJobs.slice(0, MAX_JOBS_TO_PROCESS - filteredJobIndices.length);
            filteredJobIndices = [...filteredJobIndices, ...additionalJobs];
            console.log(`Added ${additionalJobs.length} additional jobs. Total: ${filteredJobIndices.length}/${jobTexts.length}`);
        }

        // If still too few results, expand with semantic similarity
        if (filteredJobIndices.length < Math.min(MAX_JOBS_TO_PROCESS * 0.5, 15)) {
            console.log("Expanding search with semantic similarity...");
            const semanticJobIndices = performBM25Filtering(cvText, jobTexts, MAX_JOBS_TO_PROCESS);
            const additionalJobs = semanticJobIndices.filter((index) => !filteredJobIndices.includes(index)).slice(0, MAX_JOBS_TO_PROCESS - filteredJobIndices.length);
            filteredJobIndices = [...filteredJobIndices, ...additionalJobs];
        }
    } else {
        // No skill filtering - use BM25 for general matching
        filteredJobIndices = performBM25Filtering(cvText, jobTexts, Math.min(MAX_JOBS_TO_PROCESS, GENERAL_FILTER_LIMIT));
    }

    // Step 2: Limit processing based on filter type và performance
    let rankedJobIndices = filteredJobIndices.slice(0, MAX_JOBS_TO_PROCESS);

    console.timeEnd("Step 1: Fast filtering");
    console.time("Step 2: Semantic matching");

    try {
        // Extract CV information with multilingual support
        const cvExpInfo = extractExperienceLevel(cvText);

        // Create embedding for CV
        const cvEmbedding = await getEmbedding(cvText, "cv");

        // Get Gemini AI scores for top jobs if available - với limits động
        let geminiScores = [];
        if (geminiAvailable && !geminiQuotaExceeded && rankedJobIndices.length > 0) {
            const topJobTexts = rankedJobIndices.map((index) => jobTexts[index]);
            const topJobSkills = rankedJobIndices.map((index) => {
                const jobTechSkills = extractTechnicalSkills(jobTexts[index]);
                return [...jobTechSkills];
            });

            // Dynamic Gemini limits
            let maxGeminiJobs = Math.min(geminiLimit, rankedJobIndices.length);

            console.log(`🧠 Gemini will score top ${maxGeminiJobs} out of ${rankedJobIndices.length} jobs`);

            geminiScores = await batchGeminiScoring(cvText, topJobTexts, [...cvTechSkills], topJobSkills, maxGeminiJobs);
        } else if (geminiQuotaExceeded) {
            console.log("⏸️ Gemini API temporarily disabled due to quota limits");
        }

        // Optimized parallel processing with dynamic batch size
        const BATCH_SIZE = fastMode ? 8 : 5;
        const results = [];

        for (let i = 0; i < rankedJobIndices.length; i += BATCH_SIZE) {
            const batchIndices = rankedJobIndices.slice(i, Math.min(i + BATCH_SIZE, rankedJobIndices.length));

            const batchResults = await Promise.all(
                batchIndices.map(async (index, batchJobIndex) => {
                    const jobIndex = i + batchJobIndex;
                    const jobId = `job_${index + 1}`;
                    const jobText = jobTexts[index];

                    // Extract job requirements with multilingual support
                    const jobExpInfo = extractExperienceLevel(jobText);
                    const jobTechSkills = new Set(extractTechnicalSkills(jobText));

                    // Create embedding for job
                    const jobEmbedding = await getEmbedding(jobText, jobId);

                    // Calculate semantic similarity
                    const similarity = cosineSimilarity(cvEmbedding, jobEmbedding);

                    // Simplified keyword matching để tăng tốc
                    const commonKeywords = fastMode ? extractCommonKeywords(cvText, jobText).slice(0, 3) : extractCommonKeywords(cvText, jobText).slice(0, 5);

                    // Technical skills matching - improved logic
                    const commonTechSkills = [...cvTechSkills].filter((skill) => jobTechSkills.has(skill));
                    const missingTechSkills = [...jobTechSkills].filter((skill) => !cvTechSkills.has(skill)).slice(0, fastMode ? 3 : 5);

                    // Simplified scoring để tăng tốc
                    let techSkillsScore = 0;
                    let skillFilterBonus = 1.0;

                    if (skillFilterApplied && requiredSkills.length > 0) {
                        const normalizedRequiredSkills = requiredSkills.map((skill) => normalizeTechTerms(skill.toLowerCase()));
                        const cvMatchedRequiredSkills = normalizedRequiredSkills.filter((reqSkill) =>
                            [...cvTechSkills].some((cvSkill) => cvSkill.includes(reqSkill) || reqSkill.includes(cvSkill))
                        );
                        const cvRequiredSkillRatio = cvMatchedRequiredSkills.length / requiredSkills.length;

                        // 🚀 ULTRA-STRICT: Much reduced skill bonus to prevent score inflation
                        const skillBonusMultiplier = checkExperience ? 1.0 : 0.5; // Even more reduction when experience is ignored

                        if (cvRequiredSkillRatio >= 0.8) {
                            skillFilterBonus = 1.0 + 0.35 * skillBonusMultiplier; // Max 1.35 with experience, 1.175 without (reduced from 1.6)
                        } else if (cvRequiredSkillRatio >= 0.6) {
                            skillFilterBonus = 1.0 + 0.25 * skillBonusMultiplier; // Max 1.25 with experience, 1.125 without (reduced from 1.5)
                        } else if (cvRequiredSkillRatio >= 0.4) {
                            skillFilterBonus = 1.0 + 0.15 * skillBonusMultiplier; // Max 1.15 with experience, 1.075 without (reduced from 1.4)
                        } else if (cvRequiredSkillRatio > 0) {
                            skillFilterBonus = 1.0 + 0.1 * skillBonusMultiplier; // Max 1.1 with experience, 1.05 without (reduced from 1.3)
                        }

                        console.log(`🎯 STRICT Skill Filter Bonus: ${skillFilterBonus.toFixed(2)} (Experience check: ${checkExperience ? "ON" : "OFF"})`);
                    }

                    if (jobTechSkills.size === 0) {
                        techSkillsScore = skillFilterApplied ? 0.7 : 0.6; // Increased slightly from 0.6/0.5
                    } else if (cvTechSkills.size === 0) {
                        techSkillsScore = skillFilterApplied ? 0.3 : 0.25; // Increased slightly from 0.25/0.2
                    } else {
                        const matchRatio = commonTechSkills.length / jobTechSkills.size;
                        let progressiveScore = 0;
                        if (matchRatio >= 0.8) progressiveScore = 0.9; // Increased from 0.85 to 0.9
                        else if (matchRatio >= 0.6) progressiveScore = 0.8; // Increased from 0.75 to 0.8
                        else if (matchRatio >= 0.4) progressiveScore = 0.7; // Increased from 0.65 to 0.7
                        else if (matchRatio >= 0.2) progressiveScore = 0.6; // Increased from 0.55 to 0.6
                        else if (commonTechSkills.length > 0) progressiveScore = skillFilterApplied ? 0.45 : 0.35; // Increased slightly
                        else progressiveScore = skillFilterApplied ? 0.3 : 0.2; // Increased slightly

                        techSkillsScore = progressiveScore;
                    }

                    // Simplified missing requirements để tăng tốc
                    const missingRequirements = extractMissingRequirements(cvText, jobText).slice(0, 5);

                    // 🎯 ENHANCED: Much stricter experience level penalty
                    let combinedPenalty = 1.0;

                    // 🆕 NEW: Only apply experience penalty if checkExperience is enabled
                    if (checkExperience && cvExpInfo.positionLevel !== "unknown" && jobExpInfo.positionLevel !== "unknown") {
                        const expLevels = ["intern", "junior", "mid", "senior", "lead", "manager"];
                        const cvLevelIndex = expLevels.indexOf(cvExpInfo.positionLevel);
                        const jobLevelIndex = expLevels.indexOf(jobExpInfo.positionLevel);
                        const levelDifference = Math.abs(cvLevelIndex - jobLevelIndex);

                        // 🚨 MUCH STRICTER: Severe penalties for experience mismatches
                        if (cvLevelIndex < jobLevelIndex) {
                            // Candidate is under-qualified
                            if (levelDifference >= 3) {
                                // e.g., Junior applying for Manager/Lead (3+ levels gap)
                                combinedPenalty = 0.15; // -85% penalty (was 0.75)
                                console.log(
                                    `🚨 SEVERE UNDERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} levels gap) | Penalty: -85%`
                                );
                            } else if (levelDifference >= 2) {
                                // e.g., Junior applying for Senior (2 levels gap)
                                combinedPenalty = 0.35; // -65% penalty (was 0.75)
                                console.log(
                                    `⚠️  SIGNIFICANT UNDERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} levels gap) | Penalty: -65%`
                                );
                            } else if (levelDifference >= 1) {
                                // e.g., Junior applying for Mid (1 level gap)
                                combinedPenalty = 0.7; // -30% penalty (was 0.85)
                                console.log(
                                    `🔶 MINOR UNDERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} level gap) | Penalty: -30%`
                                );
                            }
                        } else if (cvLevelIndex > jobLevelIndex && levelDifference >= 2) {
                            // Candidate is over-qualified (less penalty)
                            combinedPenalty = 0.8; // -20% penalty for being overqualified
                            console.log(
                                `🔽 OVERQUALIFICATION: ${cvExpInfo.positionLevel} → ${jobExpInfo.positionLevel} (${levelDifference} levels above) | Penalty: -20%`
                            );
                        }

                        // 🆕 NEW: Additional years of experience mismatch check
                        const yearsDifference = Math.abs(cvExpInfo.yearsOfExperience - jobExpInfo.yearsOfExperience);
                        if (jobExpInfo.yearsOfExperience > 0 && cvExpInfo.yearsOfExperience < jobExpInfo.yearsOfExperience) {
                            const yearsGap = jobExpInfo.yearsOfExperience - cvExpInfo.yearsOfExperience;
                            if (yearsGap >= 3) {
                                // Severe years gap (e.g., 2 years exp vs 5+ years required)
                                const additionalPenalty = Math.min(yearsGap * 0.05, 0.25); // Up to -25% additional penalty
                                combinedPenalty = Math.max(combinedPenalty - additionalPenalty, 0.1); // Minimum 10% final score
                                console.log(
                                    `📅 YEARS EXPERIENCE GAP: Has ${cvExpInfo.yearsOfExperience} years, needs ${
                                        jobExpInfo.yearsOfExperience
                                    }+ years | Additional penalty: -${(additionalPenalty * 100).toFixed(0)}%`
                                );
                            }
                        }
                    } else if (!checkExperience) {
                        // 🆕 NEW: When experience checking is disabled, apply a much stronger universal penalty
                        // to prevent score inflation while still allowing good matches
                        combinedPenalty = 0.45; // -55% universal penalty when experience is ignored (increased from -45%)
                        console.log(`🔇 EXPERIENCE CHECK DISABLED | Universal penalty: -55%`);
                    }

                    // 🆕 NEW: Additional penalty for having multiple filters disabled
                    let filterBypassPenalty = 1.0;
                    const disabledFilters = [!checkSkills, !checkLocation, !checkExperience].filter(Boolean).length;
                    if (disabledFilters >= 2) {
                        filterBypassPenalty = 0.85; // -15% additional penalty for bypassing 2+ filters
                        console.log(`⚠️ MULTIPLE FILTERS DISABLED (${disabledFilters}/3) | Additional penalty: -15%`);
                    } else if (disabledFilters === 1) {
                        filterBypassPenalty = 0.95; // -5% penalty for bypassing 1 filter
                        console.log(`🔶 ONE FILTER DISABLED | Minor penalty: -5%`);
                    }

                    // 🚀 ULTRA-STRICT: Much more conservative scoring weights
                    const semanticWeight = 0.45; // Increased back from 0.35 to 0.45
                    const keywordWeight = 0.25; // Keep at 0.25
                    const techSkillsWeight = 0.3; // Reduced from 0.4 to 0.3

                    const keywordFactor = Math.min(commonKeywords.length / (fastMode ? 3 : 5), 1);
                    // 🔧 FIX: Missing factor should boost jobs with fewer missing requirements
                    const missingFactor = Math.max(0.6, 1 - missingRequirements.length * (fastMode ? 0.08 : 0.05)); // Less aggressive penalty

                    // 🔧 ADJUSTED: Less aggressive similarity penalty
                    let similarityPenalty = 1.0;
                    if (similarity > 0.98) {
                        similarityPenalty = 0.92; // -8% penalty for extremely high similarity (reduced from -15%)
                        console.log(`🚨 EXTREMELY HIGH SIMILARITY DETECTED: ${(similarity * 100).toFixed(1)}% | Applying -8% penalty`);
                    } else if (similarity > 0.95) {
                        similarityPenalty = 0.96; // -4% penalty for very high similarity (reduced from -8%)
                        console.log(`⚠️ VERY HIGH SIMILARITY DETECTED: ${(similarity * 100).toFixed(1)}% | Applying -4% penalty`);
                    }

                    let finalScore =
                        (similarity * semanticWeight + keywordFactor * keywordWeight + techSkillsScore * techSkillsWeight) *
                        combinedPenalty *
                        skillFilterBonus *
                        filterBypassPenalty *
                        similarityPenalty *
                        missingFactor *
                        100;

                    // 🔍 DEBUG: Log detailed score breakdown for debugging
                    if (jobIndex < 3) {
                        // Only log first 3 jobs to avoid spam
                        console.log(`\n🔍 DEBUG Job ${jobIndex + 1}:`);
                        console.log(`  Semantic: ${similarity.toFixed(3)} × ${semanticWeight} = ${(similarity * semanticWeight).toFixed(3)}`);
                        console.log(`  Keywords: ${keywordFactor.toFixed(3)} × ${keywordWeight} = ${(keywordFactor * keywordWeight).toFixed(3)}`);
                        console.log(`  TechSkills: ${techSkillsScore.toFixed(3)} × ${techSkillsWeight} = ${(techSkillsScore * techSkillsWeight).toFixed(3)}`);
                        console.log(
                            `  Base Score: ${((similarity * semanticWeight + keywordFactor * keywordWeight + techSkillsScore * techSkillsWeight) * 100).toFixed(1)}%`
                        );
                        console.log(
                            `  Penalties: exp=${combinedPenalty.toFixed(2)}, filter=${filterBypassPenalty.toFixed(2)}, sim=${similarityPenalty.toFixed(
                                2
                            )}, missing=${missingFactor.toFixed(2)}`
                        );
                        console.log(`  Skill Bonus: ${skillFilterBonus.toFixed(2)}`);
                        console.log(`  Final Score: ${finalScore.toFixed(1)}%`);
                        console.log(`  Common Skills: [${commonTechSkills.join(", ")}]`);
                        console.log(`  Missing Req: ${missingRequirements.length} items`);
                    }

                    // Get Gemini AI score if available
                    const geminiScore = geminiScores[jobIndex] || null;
                    let hybridScore = finalScore;

                    // 🔧 ADJUSTED: Slightly higher score caps for better balance
                    if (checkExperience) {
                        const universalBoost = 1.1; // Increased from 1.08 to 1.1
                        finalScore = Math.min(finalScore * universalBoost, 90); // Increased cap from 85% to 90%
                    }
                    // When checkExperience = false, no boost is applied

                    // 🚨 ADJUSTED: More reasonable maximum score caps
                    let maxAllowedScore = 90; // Increased from 85 to 90
                    if (disabledFilters >= 2) {
                        maxAllowedScore = 70; // Increased from 65 to 70
                    } else if (disabledFilters === 1) {
                        maxAllowedScore = 80; // Increased from 75 to 80
                    }

                    finalScore = Math.min(finalScore, maxAllowedScore);

                    if (geminiScore !== null) {
                        hybridScore = finalScore * 0.6 + geminiScore * 0.4;
                        if (geminiScore > finalScore) {
                            const boostAmount = Math.min((geminiScore - finalScore) * 0.3, 15);
                            hybridScore = Math.min(finalScore + boostAmount, maxAllowedScore); // Also cap hybrid score
                        }
                    } else {
                        hybridScore = finalScore;
                    }

                    hybridScore = Math.max(Math.min(hybridScore, maxAllowedScore), 0); // Final capping

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
                            languageBonus: "1.00",
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
                        commonKeywords,
                        missingRequirements: missingRequirements.map((req) => req.term || req),
                    };
                })
            );

            results.push(...batchResults);

            // Thêm delay nhỏ giữa các batch để tránh memory spike - chỉ trong slow mode
            if (!fastMode && i + BATCH_SIZE < rankedJobIndices.length) {
                await new Promise((resolve) => setTimeout(resolve, 5));
            }
        }

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
                optimizedProcessing: true,
                fastMode: fastMode,
                maxJobsProcessed: MAX_JOBS_TO_PROCESS,
                performanceMode: fastMode ? "fast" : "standard",
                checkboxFilters: {
                    skills: checkSkills,
                    location: checkLocation,
                    experience: checkExperience,
                },
            },
            jobMatches: results,
        };
    } catch (error) {
        console.error("Error during matching process:", error);
        throw error;
    }
}

module.exports = { matchJobsNLP, initializeModel };
