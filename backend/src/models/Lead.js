import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, required: true },
    requirementType: {
      type: String,
      required: true,
      enum: ["Service", "Product", "Consultation"]
    },
    budgetRange: { type: String, required: true },
    basePrice: { type: Number, required: true },
    message: { type: String, default: "" },
    couponCode: { type: String, default: "" },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true }
  },
  { timestamps: true }
);

leadSchema.index({ email: 1 });
leadSchema.index({ phoneNumber: 1 });
leadSchema.index({ createdAt: -1 });

export default mongoose.model("Lead", leadSchema);
