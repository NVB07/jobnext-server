// src/lib/matchJobsWorker.js
const { parentPort } = require("worker_threads");
const { matchJobsNLP } = require("./matchJobNLP"); // Đúng đường dẫn vì matchJobsNLP.js cùng thư mục

parentPort.on("message", async ({ review, jobTexts }) => {
    try {
        const result = await matchJobsNLP(review, jobTexts);
        parentPort.postMessage(result);
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
});
