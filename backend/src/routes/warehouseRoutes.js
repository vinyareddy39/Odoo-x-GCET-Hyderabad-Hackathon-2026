import express from 'express';
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from '../controllers/warehouseController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWarehouses)
  .post(createWarehouse);

router.route('/:id')
  .put(updateWarehouse)
  .delete(restrictTo('admin'), deleteWarehouse);

export default router;
