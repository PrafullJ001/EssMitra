const mongoose = require("mongoose");

const editHistorySchema = new mongoose.Schema(
  {
    previousAmount: Number,
    previousMode: String,
    previousNote: String,
    editedAt: Date,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    // Copied from the Farmer document automatically when the payment is first
    // saved (see the pre("save") hook below), so the farmer's name and mobile
    // number are visible directly in this collection.
    //
    // These two fields are listed FIRST and carry an empty-string default so
    // that MongoDB stores them at the very top of each payment document
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

    serviceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRecord",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment or Discount history entry
    type: {
      type: String,
      enum: ["Payment", "Discount"],
      default: "Payment",
    },

    mode: {
      type: String,
      enum: ["Cash", "UPI", "Bank"],
      default: "Cash",
    },
    paidOn: {
      type: Date,
      default: Date.now,
    },
    receiptImage: String,
    note: String,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Log of prior versions — populated whenever this payment is edited
    editHistory: {
      type: [editHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

paymentSchema.index({ farmer: 1, paidOn: -1 });

// Fills farmerName / farmerMobile from the Farmer document when a payment is
// first created (or if its farmer reference is ever changed). Normal edits to
// amount, mode or note skip this entirely. If the lookup fails for any reason,
// the payment still saves; the two fields are just left empty.
// Mongoose 9 style: async function, no next() callback.
paymentSchema.pre("save", async function () {
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
    console.error("Payment: could not copy farmer name/mobile:", err.message);
  }
});

module.exports = mongoose.model("Payment", paymentSchema);