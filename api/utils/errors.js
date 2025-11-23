function handleError(res, err) {
  console.error("API Error:", err);

  return res.status(500).json({
    error: "Internal server error",
    details: err.response ? err.response.data : err.message,
  });
}

module.exports = { handleError };
