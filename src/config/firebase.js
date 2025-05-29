const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = { auth: admin.auth() };
