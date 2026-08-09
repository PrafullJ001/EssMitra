const express = require('express');

const router = express.Router();

const {
  addExpense,
  getExpenses,
  getStaffList,
  updateExpense,
  deleteExpense,
  addSettlement,
  getSettlements,
  updateSettlement,
  deleteSettlement,
} = require('../controllers/expenseController');

const { protect } = require('../middleware/authMiddleware');

router.get('/staff-list', protect, getStaffList);

router.post('/settlements', protect, addSettlement);
router.get('/settlements', protect, getSettlements);
router.put('/settlements/:id', protect, updateSettlement);
router.delete('/settlements/:id', protect, deleteSettlement);

router.get('/', protect, getExpenses);
router.post('/', protect, addExpense);
router.put('/:id', protect, updateExpense);
router.delete('/:id', protect, deleteExpense);

module.exports = router;