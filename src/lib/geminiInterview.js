const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const modelName = ["gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-2.5-flash-preview-04-17", "gemini-2.5-flash-preview-05-20", "gemini-2.0-flash-lite"];

// Initialize with the first model
let currentModelIndex = 0;
let model = genAI.getGenerativeModel({
    model: modelName[currentModelIndex],
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseModalities: [],
    responseMimeType: "text/plain",
};

async function createInterview(promt, history = []) {
    let attempts = 0;
    let maxAttempts = modelName.length;

    while (attempts < maxAttempts) {
        try {
            console.log(`Attempting with model: ${modelName[currentModelIndex]}`);
            const chatSession = model.startChat({
                generationConfig,
                history: history,
            });

            const result = await chatSession.sendMessage(promt);
            console.log(`Success with model: ${modelName[currentModelIndex]}`);
            return result.response.text();
        } catch (error) {
            console.error(`Error with model ${modelName[currentModelIndex]}: ${error.message}`);
            attempts++;

            // Try next model if available
            if (attempts < maxAttempts) {
                currentModelIndex = (currentModelIndex + 1) % modelName.length;
                model = genAI.getGenerativeModel({
                    model: modelName[currentModelIndex],
                });
                console.log(`Switching to next model: ${modelName[currentModelIndex]}`);
            } else {
                throw new Error("All models failed to respond. Please try again later.");
            }
        }
    }
}

module.exports = { createInterview };
