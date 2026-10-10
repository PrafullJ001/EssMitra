const Farmer = require('../models/Farmer');
const ServiceRecord = require('../models/ServiceRecord');

// Default (unfiltered) Recent view shows this many entries (was 15).
const RECENT_LIMIT = 30;

// "No Bill" list defaults / safety cap for page size.
const NO_BILL_DEFAULT_LIMIT = 20;
const NO_BILL_MAX_LIMIT = 100;

// The field on ServiceRecord that holds the bill number. A service is
// "No Bill" when this field is missing, null or empty.
// Leave BILL_NUMBER_FIELD as '' to auto-detect from the common names below,
// or set it to your exact field name (e.g. 'billNo') to force it.
const BILL_NUMBER_FIELD = '';
const BILL_FIELD_CANDIDATES = [
  'billNumber',
  'billNo',
  'billNum',
  'bill_no',
  'billNumberText',
  'invoiceNumber',
  'invoiceNo',
];

// Finds which bill field really exists in the ServiceRecord schema. If a
// wrong name were used, Mongoose would ignore it and every service would
// show up as "No Bill" — so we only use a name that is really in the schema.
const resolveBillField = () => {
  const names = BILL_NUMBER_FIELD ? [BILL_NUMBER_FIELD] : BILL_FIELD_CANDIDATES;
  return names.find((name) => ServiceRecord.schema.path(name)) || null;
};

// @desc  Aggregated stats for the dashboard home screen
// @route GET /api/dashboard
// @query from, to     — optional date range filter on serviceDate (YYYY-MM-DD)
// @query search       — optional text match against farmer name / village
// @query noBill       — optional "true": list only services that have no bill number
// @query page, limit  — optional, used with noBill for load-more (infinite scroll)
exports.getDashboardStats = async (req, res) => {
  try {
    const { from, to, search, noBill } = req.query;

    const hasDateFilter = Boolean(from || to);
    const hasSearch = Boolean(search && search.trim());
    const isNoBill = noBill === 'true' || noBill === true;

    let billField = null;
    if (isNoBill) {
      billField = resolveBillField();
      if (!billField) {
        return res.status(400).json({
          message:
            'Bill number field not found on ServiceRecord. Set BILL_NUMBER_FIELD in dashboardController.js to one of: ' +
            Object.keys(ServiceRecord.schema.paths).join(', '),
        });
      }
    }

    const serviceRecordFilter = {};

    if (hasDateFilter) {
      serviceRecordFilter.serviceDate = {};
      if (from) serviceRecordFilter.serviceDate.$gte = new Date(from);
      if (to) {
        // Include the entire "to" day rather than cutting off at midnight
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        serviceRecordFilter.serviceDate.$lte = toDate;
      }
    }

    if (hasSearch) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Farmer name/village live on the Farmer collection, so resolve
      // matching farmer ids first, then filter ServiceRecord by them.
      const matchingFarmers = await Farmer.find({
        $or: [{ fullName: searchRegex }, { village: searchRegex }],
      }).select('_id');

      serviceRecordFilter.farmer = { $in: matchingFarmers.map((f) => f._id) };
    }

    // Filter used ONLY for the list. For "No Bill" it adds the missing-bill
    // condition on top of the normal filter; totals below keep using the
    // plain serviceRecordFilter, so they behave exactly as before.
    // The "empty list" check ($size) is only valid on array fields, so it is
    // added only when the bill field really is an array in the schema.
    const noBillConditions = isNoBill
      ? [
          { [billField]: { $exists: false } },
          { [billField]: null },
          { [billField]: '' },
        ]
      : [];
    if (isNoBill && ServiceRecord.schema.path(billField).instance === 'Array') {
      noBillConditions.push({ [billField]: { $size: 0 } });
    }

    const listFilter = isNoBill
      ? { ...serviceRecordFilter, $or: noBillConditions }
      : serviceRecordFilter;

    const [totalFarmers, totals, recentServicesQuery] = await Promise.all([
      Farmer.countDocuments(),

      ServiceRecord.aggregate([
        // FIX: this stage was missing entirely, so the totals below
        // always summed the whole collection regardless of the active
        // date range / search filter, while recentServicesQuery (below)
        // correctly respected it — causing the stat cards to disagree
        // with the filtered list underneath them.
        { $match: serviceRecordFilter },
        {
          $group: {
            _id: null,
            totalServiceRecords: { $sum: 1 },
            totalAcres: { $sum: { $ifNull: ['$acres', 0] } },
            totalBillAmount: { $sum: '$totalBill' },
            totalAmountReceived: { $sum: '$amountPaid' },
            totalPendingAmount: { $sum: '$pendingAmount' },
          },
        },
      ]),

      (() => {
        let query = ServiceRecord.find(listFilter)
          .populate('farmer', 'fullName village mobile')
          .populate('createdBy', 'name role')
          .sort({ updatedAt: -1 }); // most recently added/edited first

        if (isNoBill) {
          // "No Bill" is paged so the dashboard can load more while
          // scrolling. _id is added to the sort so pages never overlap.
          const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
          const limit = Math.min(
            Math.max(parseInt(req.query.limit, 10) || NO_BILL_DEFAULT_LIMIT, 1),
            NO_BILL_MAX_LIMIT
          );
          query = query.sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
        } else if (!hasDateFilter && !hasSearch) {
          // Only cap for the default, unfiltered view — date-range
          // or search results are returned in full so nothing is hidden.
          query = query.limit(RECENT_LIMIT);
        }

        return query;
      })(),
    ]);

    const summary = totals[0] || {
      totalServiceRecords: 0,
      totalAcres: 0,
      totalBillAmount: 0,
      totalAmountReceived: 0,
      totalPendingAmount: 0,
    };

    res.json({
      totalFarmers,
      totalAcres: summary.totalAcres,
      totalServiceRecords: summary.totalServiceRecords,
      totalBillAmount: summary.totalBillAmount,
      totalAmountReceived: summary.totalAmountReceived,
      totalPendingAmount: summary.totalPendingAmount,
      recentServices: recentServicesQuery,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};