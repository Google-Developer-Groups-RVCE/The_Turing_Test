'use strict';

/**
 * userRoutes.js — All user management endpoints (Admin only).
 * Includes CRUD, bulk operations, CSV import/export.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

// All user routes require auth + admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// List & search users (paginated)
router.get('/', userController.getAllUsers);

// CSV import
router.post('/upload-csv', upload.single('file'), userController.uploadCsv);

// CSV export
router.get('/export-csv', userController.exportCsv);

// Bulk operations
router.post('/bulk/delete', userController.bulkDelete);
router.post('/bulk/block', userController.bulkBlock);
router.post('/bulk/unblock', userController.bulkUnblock);
router.post('/bulk/reset-passwords', userController.bulkResetPasswords);

// Single user CRUD
router.get('/:username', userController.getUser);
router.put('/:username', userController.updateUser);
router.delete('/:username', userController.deleteUser);

module.exports = router;
