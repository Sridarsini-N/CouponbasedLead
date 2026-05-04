import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true
    },
    discountValue: {
      type: Number,
      required: true
    },
    minOrderValue: {
      type: Number,
      default: 0
    },
    applicableRequirementTypes: {
      type: [String],
      enum: ["Service", "Product", "Consultation"],
      default: []
    },
    maxUsage: {
      type: Number,
      default: 100
    },
    usageCount: {
      type: Number,
      default: 0
    },
    isFirstTimeOnly: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);
