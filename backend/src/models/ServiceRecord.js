const mongoose = require("mongoose");

const serviceRecordSchema = new mongoose.Schema(
  {
    // Copied from the Farmer document automatically when the service record is
    // first saved (see the pre("save") hook below), so the farmer's name and
    // mobile number are visible directly in this collection.
    //
    // These two fields are listed FIRST and carry an empty-string default so
    // that MongoDB stores them at the very top of each service record
    // (Mongoose writes defaulted fields before the rest). The pre("save") hook
    // still fills in the real values exactly as before.
    farmerName: {
      type: String,
      trim: true,
      default: "",
    },
    farmerMobile: {
      type: String,
      trim: true,
      default: "",
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },

    serviceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Bill number - optional (farmer can choose "No" on the Bill No. toggle)
    billNo: {
      type: String,
      trim: true,
      default: "",
    },

    village: String,
    kshetra: String,
    acres: Number,
    are: Number,
    cropName: String,
    plotName: String,
    serviceType: String,
    ratePerAcre: Number,

    totalBill: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      default: function () {
        return this.totalBill;
      },
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
    },

    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Bank"],
    },

    billImage: String,
    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

serviceRecordSchema.methods.recalculate = function () {
  // Convert money to integer paise before calculation.
  // This prevents floating-point precision problems.
  const totalBillPaise = Math.round(
    Number(this.totalBill) * 100
  );

  const amountPaidPaise = Math.round(
    Number(this.amountPaid) * 100
  );

  const pendingPaise = Math.max(
    totalBillPaise - amountPaidPaise,
    0
  );

  // Store normalized rupee values.
  this.totalBill = totalBillPaise / 100;
  this.amountPaid = amountPaidPaise / 100;
  this.pendingAmount = pendingPaise / 100;

  if (amountPaidPaise <= 0) {
    this.paymentStatus = "Unpaid";
  } else if (amountPaidPaise >= totalBillPaise) {
    this.paymentStatus = "Paid";
  } else {
    this.paymentStatus = "Partially Paid";
  }
};

serviceRecordSchema.index({
  farmer: 1,
  serviceDate: -1,
});

// Fills farmerName / farmerMobile from the Farmer document when a service
// record is first created (or if its farmer reference is ever changed). Normal
// edits to bill, payment status, notes etc. skip this entirely. If the lookup
// fails for any reason, the record still saves; the two fields are just left
// empty. Mongoose 9 style: async function, no next() callback.
serviceRecordSchema.pre("save", async function () {
  if (!this.isNew && !this.isModified("farmer")) return;

  try {
    const farmerId = this.populated("farmer") || this.farmer;
    if (!farmerId) return;

    const farmer = await mongoose
      .model("Farmer")
      .findById(farmerId)
      .select("fullName mobile")
      .lean();

    if (farmer) {
      this.farmerName = farmer.fullName;
      this.farmerMobile = farmer.mobile;
    }
  } catch (err) {
    console.error("ServiceRecord: could not copy farmer name/mobile:", err.message);
  }
});

module.exports = mongoose.model(
  "ServiceRecord",
  serviceRecordSchema
);