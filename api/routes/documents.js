const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const vespa = require("../services/vespaClient");
const { generateEmbedding } = require("../utils/embedding");
const { handleError } = require("../utils/errors");

router.post("/", async (req, res) => {
  try {
    const tenantId = req.query.tenant;
    if (!tenantId) return res.status(400).json({ error: "tenant is required" });

    const id = uuid();

    const document = {
      ...req.body,
      tenantId,
      vector: generateEmbedding(req.body.title + " " + req.body.body)
    };

    await vespa.indexDocument(id, document);

    res.json({ id, status: "indexed" });
  } catch (err) {
    handleError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const response = await vespa.getDocument(id);
    res.json(response.data);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await vespa.deleteDocument(id);
    res.json({ id, status: "deleted" });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
