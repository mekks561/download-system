const express = require('express');
const { gmAuth, requireRole } = require('../middleware/gmAuth');
const gmAuthController = require('../controllers/gmAuthController');
const gmDashboardController = require('../controllers/gmDashboardController');

const router = express.Router();

router.post('/auth/login', gmAuthController.login);

router.get('/auth/profile', gmAuth, gmAuthController.getProfile);
router.post('/auth/logout', gmAuth, gmAuthController.logout);

router.get('/dashboard/stats', gmAuth, gmDashboardController.getStats);
router.get('/dashboard/users', gmAuth, requireRole('admin'), gmDashboardController.getUsers);
router.get('/dashboard/downloads', gmAuth, requireRole('admin'), gmDashboardController.getAllDownloads);
router.get('/dashboard/uploads', gmAuth, requireRole('admin'), gmDashboardController.getAllUploads);
router.delete('/dashboard/users/:id', gmAuth, requireRole('admin'), gmDashboardController.deleteUser);

router.get('/analytics/activity', gmAuth, requireRole('admin'), gmDashboardController.getUserActivity);
router.get('/system/health', gmAuth, requireRole('admin'), gmDashboardController.getSystemHealth);
router.get('/announcements', gmAuth, gmDashboardController.getAnnouncements);
router.post('/announcements', gmAuth, requireRole('admin'), gmDashboardController.createAnnouncement);
router.delete('/announcements/:id', gmAuth, requireRole('super_admin'), gmDashboardController.deleteAnnouncement);
router.get('/logs', gmAuth, requireRole('admin'), gmDashboardController.getSystemLogs);

module.exports = router;
