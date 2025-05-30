// src/lib/matchJobsWorker.js
const { parentPort } = require("worker_threads");
const { matchJobsNLP } = require("./matchJobNLP"); // Đúng đường dẫn vì matchJobsNLP.js cùng thư mục

parentPort.on("message", async ({ review, jobTexts, requiredSkills = [], options = {} }) => {
    try {
        // Configure performance options based on dataset size if not provided
        const defaultOptions = {
            fastMode: jobTexts.length > 25,
            maxJobs: jobTexts.length > 100 ? 75 : jobTexts.length > 50 ? 60 : jobTexts.length > 25 ? 50 : jobTexts.length,
            useCache: true,
            geminiLimit: jobTexts.length > 50 ? 5 : jobTexts.length > 25 ? 8 : 10,
        };

        // Merge with provided options
        const finalOptions = { ...defaultOptions, ...options };

        console.log(`🔧 Worker processing ${jobTexts.length} jobs with maxJobs: ${finalOptions.maxJobs}`);

        const result = await matchJobsNLP(review, jobTexts, requiredSkills, finalOptions);
        parentPort.postMessage(result);
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
});
