const { pipeline } = require("@xenova/transformers");
const natural = require("natural");

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
// Get embedding with cache
async function getEmbedding(text, id) {
    // Check cache first

    // If not in cache, calculate new embedding
    try {
        const model = await loadModel();
        const output = await model(text, { pooling: "mean", normalize: true });
        const embedding = Array.from(output.data);

        // Save to cache

        return embedding;
    } catch (error) {
        console.error("Error creating embedding:", error);
        throw error;
    }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
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

// Extract experience level information from text
function extractExperienceLevel(text) {
    // Experience level detection - look for years of experience
    const experienceRegex = /(\d+)\s*(\+)?\s*year[s]?\s*(?:of)?\s*experience/i;
    const experienceMatch = text.match(experienceRegex);
    const yearsOfExperience = experienceMatch ? parseInt(experienceMatch[1]) : 0;

    // Intern/entry-level detection
    const isIntern = /intern|internship|fresher|entry[- ]?level|junior|thực tập|sinh viên/i.test(text);
    const isSenior = /senior|lead|manager|head|director|chief|principal|staff|sr\.|\bsr\b/i.test(text);
    const isMid = /mid|medior|middle|intermediate/i.test(text);

    // Position level detection
    let positionLevel = "unknown";
    if (isIntern) {
        positionLevel = "intern";
    } else if (isSenior || yearsOfExperience >= 5) {
        positionLevel = "senior";
    } else if (isMid || yearsOfExperience >= 2) {
        positionLevel = "mid";
    } else if (yearsOfExperience > 0) {
        positionLevel = "junior";
    }

    return {
        yearsOfExperience,
        positionLevel,
        isIntern,
        isSenior,
    };
}

// Extract significant terms that appear in job description but not in CV
function extractMissingRequirements(cvText, jobText) {
    // Create stemmer for better matching
    const stemmer = natural.PorterStemmer;

    // Tokenize texts
    const tokenizer = new natural.WordTokenizer();
    const cvTokens = tokenizer.tokenize(cvText.toLowerCase());
    const jobTokens = tokenizer.tokenize(jobText.toLowerCase());

    // Common words to filter out
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
    ]);

    // Create a set of stemmed CV tokens
    const cvStems = new Set(cvTokens.filter((word) => word.length > 2 && !stopWords.has(word)).map((word) => stemmer.stem(word)));

    // Find job requirement tokens that don't appear in CV
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    tfidf.addDocument(jobText);

    // Get the most important terms from job description
    const keyTerms = [];
    tfidf.listTerms(0).forEach((item) => {
        const term = item.term;
        // Filter out common words, short words, and numbers
        if (term.length > 2 && !stopWords.has(term) && isNaN(Number(term)) && term.match(/[a-z]/i)) {
            // Check if the stemmed term is not in CV
            const stemmedTerm = stemmer.stem(term);
            if (!cvStems.has(stemmedTerm)) {
                keyTerms.push({
                    term,
                    tfidf: item.tfidf,
                });
            }
        }
    });

    // Sort by importance and return top terms
    keyTerms.sort((a, b) => b.tfidf - a.tfidf);
    return keyTerms.slice(0, 10).map((item) => item.term);
}

// Fast filtering using BM25
function performBM25Filtering(cvText, jobTexts) {
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    // Add all jobs to TF-IDF model
    jobTexts.forEach((jobText) => {
        tfidf.addDocument(jobText);
    });

    // Calculate CV relevance to each job
    const scores = [];
    tfidf.tfidfs(cvText, (i, measure) => {
        scores.push({ index: i, score: measure });
    });

    // Sort by decreasing score
    scores.sort((a, b) => b.score - a.score);

    // Return indices of highest scoring jobs
    return scores.map((item) => item.index);
}

// Main processing function - match CV to jobs
async function matchCVtoJobs(cvText, jobTexts) {
    console.time("Step 1: Fast filtering");

    // Step 1: Fast filtering with BM25/TF-IDF
    const rankedJobIndices = performBM25Filtering(cvText, jobTexts);

    // Only take top 5 results for deeper analysis
    const topJobIndices = rankedJobIndices.slice(0, Math.min(5, jobTexts.length));
    console.timeEnd("Step 1: Fast filtering");

    console.time("Step 2: Semantic matching");

    // Step 2: Deep semantic matching using transformer embeddings
    try {
        // Extract experience level from CV
        const cvExpInfo = extractExperienceLevel(cvText);

        // Create embedding for CV
        const cvEmbedding = await getEmbedding(cvText, "cv");

        // Process top job candidates in parallel
        const results = await Promise.all(
            topJobIndices.map(async (index) => {
                const jobId = `job_${index + 1}`;
                const jobText = jobTexts[index];

                // Extract job requirements info
                const jobExpInfo = extractExperienceLevel(jobText);

                // Create embedding for job (with cache)
                const jobEmbedding = await getEmbedding(jobText, jobId);

                // Calculate cosine similarity
                const similarity = cosineSimilarity(cvEmbedding, jobEmbedding);

                // Tokenize text for keyword analysis
                const tokenizer = new natural.WordTokenizer();
                const cvTokens = tokenizer.tokenize(cvText.toLowerCase());
                const jobTokens = tokenizer.tokenize(jobText.toLowerCase());

                // Find overlapping keywords (only meaningful words longer than 3 chars)
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
                ]);

                const cvSet = new Set(cvTokens);
                const jobSet = new Set(jobTokens);
                const commonKeywords = [...cvSet].filter((word) => jobSet.has(word) && word.length > 3 && !commonWords.has(word));

                // Find missing requirements - important terms in job not in CV
                const missingRequirements = extractMissingRequirements(cvText, jobText);

                // Experience level matching penalty
                let experiencePenalty = 1.0;
                const expLevels = ["intern", "junior", "mid", "senior"];

                if (cvExpInfo.positionLevel !== "unknown" && jobExpInfo.positionLevel !== "unknown") {
                    const cvLevelIndex = expLevels.indexOf(cvExpInfo.positionLevel);
                    const jobLevelIndex = expLevels.indexOf(jobExpInfo.positionLevel);

                    // Calculate penalty based on level difference
                    const levelDifference = Math.abs(cvLevelIndex - jobLevelIndex);

                    // More severe penalty for applying to higher positions
                    if (cvLevelIndex < jobLevelIndex) {
                        // Applying "up" (e.g. intern applying for senior)
                        if (levelDifference >= 2) {
                            experiencePenalty = 0.3; // Severe penalty
                        } else if (levelDifference === 1) {
                            experiencePenalty = 0.6; // Moderate penalty
                        }
                    } else if (cvLevelIndex > jobLevelIndex) {
                        // Applying "down" (e.g. senior applying for intern)
                        experiencePenalty = 0.8; // Minor penalty
                    }
                }

                // Years of experience mismatch penalty (specific focus)
                const yearsRequiredInJob = jobExpInfo.yearsOfExperience;
                const yearsInCV = cvExpInfo.yearsOfExperience;

                let yearsPenalty = 1.0;
                if (yearsRequiredInJob > 0 && yearsInCV >= 0) {
                    const yearsDifference = yearsRequiredInJob - yearsInCV;
                    if (yearsDifference > 2) {
                        // Job requires significantly more experience
                        yearsPenalty = 0.3;
                    } else if (yearsDifference > 0) {
                        // Job requires somewhat more experience
                        yearsPenalty = 0.7;
                    }
                }

                // Handle explicit intern vs. senior mismatch
                if (cvExpInfo.isIntern && jobExpInfo.isSenior) {
                    yearsPenalty = Math.min(yearsPenalty, 0.2);
                }

                // Calculate combined penalty
                const combinedPenalty = Math.min(experiencePenalty, yearsPenalty);

                // Calculate keyword match factor
                const keywordFactor = Math.min(commonKeywords.length / 20, 1);
                const missingFactor = Math.max(0, 1 - missingRequirements.length / 20);

                // Calculate combined score with new weighting
                // - 50% semantic similarity
                // - 25% keyword match
                // - 25% missing requirements penalty
                let finalScore = (similarity * 0.5 + keywordFactor * 0.25 + missingFactor * 0.25) * combinedPenalty * 100;

                // Ensure score stays within reasonable range
                finalScore = Math.max(Math.min(finalScore, 100), 0);

                return {
                    jobId,
                    jobText: jobText.substring(0, 100) + "...", // Truncate for readability
                    matchScore: finalScore.toFixed(2),
                    semanticScore: (similarity * 100).toFixed(2),
                    experienceMatch: {
                        cvLevel: cvExpInfo.positionLevel,
                        jobLevel: jobExpInfo.positionLevel,
                        cvYears: cvExpInfo.yearsOfExperience,
                        jobYears: jobExpInfo.yearsOfExperience,
                        penalty: combinedPenalty.toFixed(2),
                    },
                    commonKeywords,
                    missingRequirements,
                };
            })
        );

        // Sort results by decreasing score
        results.sort((a, b) => parseFloat(b.matchScore) - parseFloat(a.matchScore));

        console.timeEnd("Step 2: Semantic matching");

        return {
            cvText: cvText.substring(0, 100) + "...", // Truncate for readability
            cvInfo: extractExperienceLevel(cvText),
            jobMatches: results,
        };
    } catch (error) {
        console.error("Error during matching process:", error);
        throw error;
    }
}

const matchJobsNLP = async (cvText, jobTexts) => {
    try {
        if (!cvText || !jobTexts || !Array.isArray(jobTexts)) {
            return;
        }

        console.time("Total processing time");

        const result = await matchCVtoJobs(cvText, jobTexts);
        console.timeEnd("Total processing time");

        return result;
    } catch (error) {
        console.error("API Error:", error);
    }
};
module.exports = { matchJobsNLP, initializeModel };
