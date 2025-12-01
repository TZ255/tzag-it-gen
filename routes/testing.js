const express = require('express');

const router = express.Router();

// Independent preview page (no shared layout/styles)
router.get('/page-1', (_req, res) => {
  res.render('testing/page-1', { layout: false });
});

module.exports = router;
