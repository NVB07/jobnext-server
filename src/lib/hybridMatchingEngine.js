const natural = require("natural");
const { matchJobsNLP } = require("./matchJobNLP");

/**
 * Hybrid Job Matching Engine
 * Combines TF-IDF + Logistic Regression approach with Transformer-based semantic matching
 */
class HybridMatchingEngine {
    constructor() {
        this.tfidf = new natural.TfIdf();
        this.isInitialized = false;
        this.jobClassifier = null;
        this.skillLabels = [
            "javascript",
            "react",
            "nodejs",
            "python",
            "java",
            "php",
            "angular",
            "vue",
            "mysql",
            "mongodb",
            "postgresql",
            "aws",
            "docker",
            "kubernetes",
            "frontend",
            "backend",
            "fullstack",
            "mobile",
            "devops",
            "ai_ml",
        ];
    }

    /**
     * Initialize TF-IDF model with job dataset
     */
    async initializeTfIdf(jobTexts) {
        if (this.isInitialized) return;

        console.log("🏗️ Initializing TF-IDF model...");

        // Clear existing documents
        this.tfidf = new natural.TfIdf();

        // Add all job texts to TF-IDF
        jobTexts.forEach((jobText, index) => {
            const cleanText = this.preprocessText(jobText);
            this.tfidf.addDocument(cleanText);
        });

        this.isInitialized = true;
        console.log(`✅ TF-IDF initialized with ${jobTexts.length} jobs`);
    }

    /**
     * Preprocess text for TF-IDF (lighter than semantic preprocessing)
     */
    preprocessText(text) {
        return text
            .toLowerCase()
            .replace(/<[^>]*>/g, " ") // Remove HTML
            .replace(/[^\w\sÀ-ỹ]/g, " ") // Keep alphanumeric and Vietnamese chars
            .replace(/\s+/g, " ")
            .trim();
    }

    /**
     * TF-IDF based job matching (fast, keyword-focused)
     */
    getTfIdfScores(cvText, jobTexts) {
        const cleanCvText = this.preprocessText(cvText);
        const scores = [];

        // Calculate TF-IDF similarity for each job
        this.tfidf.tfidfs(cleanCvText, (i, measure) => {
            // Normalize TF-IDF score to 0-100 range
            const normalizedScore = Math.min(measure * 10, 100); // Scale down and cap at 100
            scores.push({
                jobIndex: i,
                tfidfScore: normalizedScore,
                method: "tfidf",
            });
        });

        return scores.sort((a, b) => b.tfidfScore - a.tfidfScore);
    }

    /**
     * Multi-label skill classification using simple keyword matching
     * (Simplified version of Logistic Regression approach)
     */
    classifySkills(text) {
        const cleanText = this.preprocessText(text);
        const foundSkills = [];

        // Simple keyword-based classification
        this.skillLabels.forEach((skill) => {
            const skillVariants = this.getSkillVariants(skill);
            const hasSkill = skillVariants.some((variant) => cleanText.includes(variant.toLowerCase()));

            if (hasSkill) {
                foundSkills.push({
                    skill,
                    confidence: this.calculateSkillConfidence(cleanText, skillVariants),
                });
            }
        });

        return foundSkills.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get skill variants for better matching
     */
    getSkillVariants(skill) {
        const variants = {
            javascript: ["javascript", "js", "java script"],
            react: ["react", "reactjs", "react js"],
            nodejs: ["node", "nodejs", "node js"],
            python: ["python", "py"],
            frontend: ["frontend", "front end", "giao diện"],
            backend: ["backend", "back end", "máy chủ"],
            fullstack: ["fullstack", "full stack", "toàn stack"],
            mobile: ["mobile", "di động", "app"],
            // Add more variants...
        };

        return variants[skill] || [skill];
    }

    /**
     * Calculate skill confidence based on frequency
     */
    calculateSkillConfidence(text, skillVariants) {
        let totalMatches = 0;
        skillVariants.forEach((variant) => {
            const regex = new RegExp(`\\b${variant}\\b`, "gi");
            const matches = text.match(regex);
            totalMatches += matches ? matches.length : 0;
        });

        return Math.min(totalMatches * 25, 100); // Max 100%
    }

    /**
     * Hybrid matching: Combine TF-IDF and Transformer approaches
     */
    async hybridMatch(cvText, jobTexts, requiredSkills = [], options = {}) {
        const {
            tfIdfWeight = 0.3, // 30% TF-IDF
            semanticWeight = 0.5, // 50% Semantic (Transformer)
            skillWeight = 0.2, // 20% Skill classification
            enableFastMode = false, // Quick TF-IDF only for large datasets
        } = options;

        console.log("🔥 Starting Hybrid Job Matching...");
        console.time("Hybrid matching");

        // Initialize TF-IDF if needed
        await this.initializeTfIdf(jobTexts);

        // Step 1: Fast TF-IDF filtering for large datasets
        let filteredIndices = null;
        if (enableFastMode || jobTexts.length > 50) {
            console.log("⚡ Fast mode: Using TF-IDF pre-filtering...");
            const tfidfScores = this.getTfIdfScores(cvText, jobTexts);

            // Take top 30 jobs for semantic processing
            filteredIndices = tfidfScores.slice(0, 30).map((score) => score.jobIndex);

            console.log(`📊 TF-IDF filtered: ${jobTexts.length} → ${filteredIndices.length} jobs`);
        }

        // Step 2: Get semantic scores (using existing transformer system)
        const semanticResult = await matchJobsNLP(cvText, filteredIndices ? filteredIndices.map((i) => jobTexts[i]) : jobTexts, requiredSkills);

        // Step 3: Classify skills for both CV and jobs
        const cvSkills = this.classifySkills(cvText);
        console.log(`🎯 CV Skills detected: ${cvSkills.map((s) => s.skill).join(", ")}`);

        // Step 4: Combine all scores
        const hybridResults = semanticResult.jobMatches.map((match, index) => {
            const actualJobIndex = filteredIndices ? filteredIndices[index] : index;
            const jobText = jobTexts[actualJobIndex];

            // Get individual scores
            const semanticScore = parseFloat(match.matchScore);
            const tfidfScores = this.getTfIdfScores(cvText, [jobText]);
            const tfidfScore = tfidfScores[0]?.tfidfScore || 0;

            // Skill matching score
            const jobSkills = this.classifySkills(jobText);
            const skillMatchScore = this.calculateSkillMatchScore(cvSkills, jobSkills);

            // Normalize scores to ensure fair weighting
            const normalizedSemantic = Math.min(semanticScore, 100);
            const normalizedTfIdf = Math.min(tfidfScore, 100);
            const normalizedSkills = Math.min(skillMatchScore, 100);

            // Calculate hybrid score with proper weighting
            const hybridScore = normalizedSemantic * semanticWeight + normalizedTfIdf * tfIdfWeight + normalizedSkills * skillWeight;

            return {
                ...match,
                jobIndex: actualJobIndex,
                hybridScore: Math.min(hybridScore, 100).toFixed(2),
                scores: {
                    semantic: normalizedSemantic.toFixed(2),
                    tfidf: normalizedTfIdf.toFixed(2),
                    skillMatch: normalizedSkills.toFixed(2),
                },
                detectedSkills: jobSkills.map((s) => s.skill),
                method: "hybrid",
            };
        });

        // Sort by hybrid score
        hybridResults.sort((a, b) => parseFloat(b.hybridScore) - parseFloat(a.hybridScore));

        console.timeEnd("Hybrid matching");

        const maxScore = Math.max(...hybridResults.map((r) => parseFloat(r.hybridScore)));
        console.log(`📈 Hybrid Results: ${hybridResults.length} jobs, max score: ${maxScore.toFixed(1)}%`);

        return {
            ...semanticResult,
            jobMatches: hybridResults,
            hybridInfo: {
                method: enableFastMode ? "fast_hybrid" : "full_hybrid",
                weights: { tfIdfWeight, semanticWeight, skillWeight },
                cvSkills: cvSkills.map((s) => s.skill),
                totalJobsProcessed: hybridResults.length,
            },
        };
    }

    /**
     * Calculate skill match score between CV and job
     */
    calculateSkillMatchScore(cvSkills, jobSkills) {
        if (jobSkills.length === 0) return 70; // Neutral score for jobs with no specific skills

        const cvSkillNames = new Set(cvSkills.map((s) => s.skill));
        const jobSkillNames = new Set(jobSkills.map((s) => s.skill));

        const commonSkills = [...cvSkillNames].filter((skill) => jobSkillNames.has(skill));
        const matchRatio = commonSkills.length / jobSkillNames.size;

        // Bonus for having relevant skills
        const hasAnyRelevantSkill = commonSkills.length > 0;
        const baseScore = matchRatio * 80;
        const bonus = hasAnyRelevantSkill ? 15 : 0;

        return Math.min(baseScore + bonus, 100);
    }

    /**
     * Quick TF-IDF only matching for very large datasets
     */
    async quickMatch(cvText, jobTexts) {
        await this.initializeTfIdf(jobTexts);

        const tfidfScores = this.getTfIdfScores(cvText, jobTexts);
        const cvSkills = this.classifySkills(cvText);

        return {
            jobMatches: tfidfScores.slice(0, 20).map((score, index) => ({
                jobId: `job_${score.jobIndex + 1}`,
                matchScore: score.tfidfScore.toFixed(2),
                method: "tfidf_only",
                detectedSkills: this.classifySkills(jobTexts[score.jobIndex]).map((s) => s.skill),
            })),
            cvInfo: {
                detectedSkills: cvSkills.map((s) => s.skill),
                method: "quick_tfidf",
            },
        };
    }
}

module.exports = { HybridMatchingEngine };
