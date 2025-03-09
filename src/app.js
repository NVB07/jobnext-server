require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// Middleware
app.use(express.json()); // Đọc JSON body
app.use(cors()); // Bật CORS
app.use(morgan("dev")); // Log request

// Import routes
const routes = require("./routes");
app.use(routes);

module.exports = app;
