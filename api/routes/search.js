const express = require("express");
const router = express.Router();
const vespa = require("../services/vespaClient");
const { handleError } = require("../utils/errors");
const { LRUCache } = require("lru-cache");

// Local in-memory cache
const cache = new LRUCache({
  max: 200,
  ttl: 30 * 1000 // 30 seconds
});

// Basic & vector search via `?vector=true`
router.get("/", async (req, res) => {
  try {
    const tenantId = req.query.tenant;
    const q = req.query.q;

    if (!tenantId || !q) {
      return res.status(400).json({ error: "tenant and q are required" });
    }

    const isVector = req.query.vector === "true";
    const cacheKey = `${tenantId}:${q}:${isVector}`;

    // Return from cache if present
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ cached: true, ...cached });

    let result;
    if (isVector) {
      const fakeVector = Array(128).fill(0.5);
      result = await vespa.semanticSearch(fakeVector, tenantId);
    } else {
      result = await vespa.search(tenantId, q);
    }

    cache.set(cacheKey, result.data);
    res.json(result.data);

  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
