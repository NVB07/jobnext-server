const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
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
    const chatSession = model.startChat({
        generationConfig,
        history: history,
    });

    const result = await chatSession.sendMessage(promt);
    console.log(result.response.text());
    // const jsonString = result.response
    //     .text()
    //     .replace(/```json|```/g, "")
    //     .trim();
    // return jsonString;
    return result.response.text();
}

module.exports = { createInterview };
