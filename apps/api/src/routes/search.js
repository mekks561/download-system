const express = require('express');
const router = express.Router();
const { searchDownloads, searchUploads, searchFiles, globalSearch } = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/auth');

router.get('/search/downloads', authenticateToken, searchDownloads);
router.get('/search/uploads', authenticateToken, searchUploads);
router.get('/search/files', authenticateToken, searchFiles);
router.get('/search', authenticateToken, globalSearch);

module.exports = router;