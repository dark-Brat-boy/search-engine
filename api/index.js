const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const documentsRouter = require("./routes/documents");
const searchRouter = require("./routes/search");
const healthRouter = require("./routes/health");
const tenantRateLimit = require("./middleware/rateLimit");

const { port } = require("./config/config");

const app = express();

// Global middleware
app.use(express.json());
app.use(morgan("dev"));

app.use(tenantRateLimit);
// Routes
app.use("/documents", documentsRouter);
app.use("/search", searchRouter);
app.use("/health", healthRouter);

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
