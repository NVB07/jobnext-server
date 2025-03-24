const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json"); // CommonJS không cần type

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = { auth: admin.auth() };
