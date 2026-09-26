import express from 'express';
import {
  getOperations,
  getOperationById,
  createOperation,
  updateOperationStatus,
  validateOperation,
  cancelOperation,
} from '../controllers/operationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getOperations)
  .post(createOperation);

router.route('/:id')
  .get(getOperationById);

router.patch('/:id/status', updateOperationStatus);
router.post('/:id/validate', validateOperation);
router.post('/:id/cancel', cancelOperation);

export default router;
