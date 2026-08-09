const Expense = require('../models/Expense');
const User = require('../models/User');
const Staffsettle = require('../models/Staffsettle');

const CATEGORIES = [
  'ESS Machine Maintenance',
  'Tractor Maintenance',
  'Pickup Maintenance',
  'Diesel',
  'Staff Expense',
];

// @desc  Add a new expense entry
// @route POST /api/expenses
// @access Admin only
exports.addExpense = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add expenses' });
    }

    const { category, amount, date, staffMember, note } = req.body;

    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid or missing category' });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (category === 'Staff Expense' && !staffMember) {
      return res
        .status(400)
        .json({ message: 'Select a staff member for staff expenses' });
    }

    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'Note is required' });
    }

    const expense = await Expense.create({
      category,
      amount: Number(amount),
      date,
      staffMember: category === 'Staff Expense' ? staffMember : null,
      note: note.trim(),
      createdBy: req.user._id,
    });

    const populated = await expense.populate('staffMember', 'name mobile role');

    res.status(201).json({ expense: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  List expenses + per-category totals + staff-wise breakdown,
//        scoped to an optional date range (?from=YYYY-MM-DD&to=YYYY-MM-DD).
//        Falls back to ?year=YYYY if from/to aren't given, for backward
//        compatibility. No range at all returns everything.
// @route GET /api/expenses
// @access Admin only
exports.getExpenses = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view expenses' });
    }

    const { year, from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filter.date.$lte = toDate;
        }
      }
    } else if (year) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      filter.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(filter)
      .populate('staffMember', 'name mobile role')
      .populate('createdBy', 'name role')
      .sort({ date: -1 });

    const totals = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    let grandTotal = 0;
    const staffTotalsMap = {};

    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
      grandTotal += e.amount;

      if (e.category === 'Staff Expense' && e.staffMember) {
        const key = e.staffMember._id.toString();
        if (!staffTotalsMap[key]) {
          staffTotalsMap[key] = {
            staffId: e.staffMember._id,
            name: e.staffMember.name,
            mobile: e.staffMember.mobile,
            total: 0,
            count: 0,
          };
        }
        staffTotalsMap[key].total += e.amount;
        staffTotalsMap[key].count += 1;
      }
    });

    // Settlements aren't date-filtered — they represent the current running
    // balance against the staff member's total advance, regardless of which
    // date range is being viewed.
    const settlementDocs = await Staffsettle.find({}).select('staffMember amount');
    const settledMap = {};
    settlementDocs.forEach((s) => {
      const key = s.staffMember.toString();
      settledMap[key] = (settledMap[key] || 0) + s.amount;
    });

    const staffTotalsWithBalance = Object.values(staffTotalsMap)
      .map((s) => {
        const settled = settledMap[s.staffId.toString()] || 0;
        return { ...s, settled, balance: s.total - settled };
      })
      .sort((a, b) => b.total - a.total);

    res.json({
      expenses,
      totals,
      grandTotal,
      categories: CATEGORIES,
      staffTotals: staffTotalsWithBalance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  List all staff users, for the Staff Expense picker
// @route GET /api/expenses/staff-list
// @access Admin only
exports.getStaffList = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view staff list' });
    }

    const staff = await User.find({ role: 'staff' }).select('name mobile role');

    res.json({ staff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Update an existing expense entry
// @route PUT /api/expenses/:id
// @access Admin only
exports.updateExpense = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can edit expenses' });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const { category, amount, date, staffMember, note } = req.body;

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      expense.category = category;
    }

    if (amount !== undefined) {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
      }
      expense.amount = Number(amount);
    }

    if (date !== undefined) {
      if (!date) {
        return res.status(400).json({ message: 'Date is required' });
      }
      expense.date = date;
    }

    if (note !== undefined) {
      if (!note.trim()) {
        return res.status(400).json({ message: 'Note is required' });
      }
      expense.note = note.trim();
    }

    // Staff member — required if the (possibly just-updated) category is
    // Staff Expense, cleared otherwise, same rule as addExpense.
    const effectiveCategory = category !== undefined ? category : expense.category;

    if (effectiveCategory === 'Staff Expense') {
      const effectiveStaffMember =
        staffMember !== undefined ? staffMember : expense.staffMember;
      if (!effectiveStaffMember) {
        return res
          .status(400)
          .json({ message: 'Select a staff member for staff expenses' });
      }
      expense.staffMember = effectiveStaffMember;
    } else {
      expense.staffMember = null;
    }

    await expense.save();

    const populated = await expense.populate('staffMember', 'name mobile role');

    res.json({ expense: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Delete an expense entry
// @route DELETE /api/expenses/:id
// @access Admin only
exports.deleteExpense = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete expenses' });
    }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expense.deleteOne();

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Add a settlement (payback) against a staff member's balance
// @route POST /api/expenses/settlements
// @access Admin only
exports.addSettlement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add settlements' });
    }

    const { staffMember, amount, date, note } = req.body;

    if (!staffMember) {
      return res.status(400).json({ message: 'Staff member is required' });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const settlement = await Staffsettle.create({
      staffMember,
      amount: Number(amount),
      date: date || Date.now(),
      note: note ? note.trim() : '',
      createdBy: req.user._id,
    });

    const populated = await settlement.populate('staffMember', 'name mobile role');

    res.status(201).json({ settlement: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  List settlements, optionally filtered by staff member
// @route GET /api/expenses/settlements?staffId=...
// @access Admin only
exports.getSettlements = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view settlements' });
    }

    const { staffId } = req.query;
    const filter = {};
    if (staffId) filter.staffMember = staffId;

    const settlements = await Staffsettle.find(filter)
      .populate('staffMember', 'name mobile role')
      .sort({ date: -1 });

    res.json({ settlements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Update a settlement entry
// @route PUT /api/expenses/settlements/:id
// @access Admin only
exports.updateSettlement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can edit settlements' });
    }

    const settlement = await Staffsettle.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    const { amount, date, note } = req.body;

    if (amount !== undefined) {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
      }
      settlement.amount = Number(amount);
    }

    if (date !== undefined) settlement.date = date;
    if (note !== undefined) settlement.note = note.trim();

    await settlement.save();

    const populated = await settlement.populate('staffMember', 'name mobile role');

    res.json({ settlement: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Delete a settlement entry
// @route DELETE /api/expenses/settlements/:id
// @access Admin only
exports.deleteSettlement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete settlements' });
    }

    const settlement = await Staffsettle.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    await settlement.deleteOne();

    res.json({ message: 'Settlement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};