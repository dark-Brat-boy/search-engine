const express = require("express");
const axios = require("axios");
const router = express.Router();
const { vespaEndpoint } = require("../config/config");

router.get("/", async (req, res) => {
  try {
    const vespaHealth = await axios.get(`${vespaEndpoint}/state/v1/health`);

    res.json({
      status: "UP",
      vespa: vespaHealth.data.status.code,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: "UP",
      vespa: "DOWN",
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
