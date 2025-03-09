const app = require("./src/app");
const connectDB = require("./src/config/database");
const PORT = process.env.PORT || 5000;
connectDB();
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
