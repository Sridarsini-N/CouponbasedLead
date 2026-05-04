import Coupon from "../models/Coupon.js";
import Lead from "../models/Lead.js";

const formatMoney = (amount) => `Rs. ${Number(amount).toFixed(2)}`;

const calculateDiscountAmount = (coupon, basePrice) => {
  if (coupon.discountType === "PERCENTAGE") {
    return (basePrice * coupon.discountValue) / 100;
  }

  return coupon.discountValue;
};

export const validateCouponForLead = async ({
  couponCode,
  requirementType,
  basePrice,
  email,
  phoneNumber
}) => {
  const normalizedCode = (couponCode || "").trim().toUpperCase();

  if (!normalizedCode) {
    return { ok: false, message: "Please provide a coupon code." };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });

  if (!coupon) {
    return { ok: false, message: "Invalid coupon code." };
  }

  const now = new Date();
  if (coupon.expiresAt < now) {
    return { ok: false, message: "Coupon has expired." };
  }

  if (coupon.usageCount >= coupon.maxUsage) {
    return { ok: false, message: "Coupon usage limit reached." };
  }

  if (basePrice < coupon.minOrderValue) {
    return {
      ok: false,
      message: `Minimum order value is ${formatMoney(coupon.minOrderValue)} for this coupon.`
    };
  }

  const hasRequirementRestrictions = coupon.applicableRequirementTypes.length > 0;
  if (
    hasRequirementRestrictions &&
    !coupon.applicableRequirementTypes.includes(requirementType)
  ) {
    return {
      ok: false,
      message: `Coupon is not applicable for ${requirementType}.`
    };
  }

  if (coupon.isFirstTimeOnly) {
    const existingLead = await Lead.findOne({
      $or: [{ email: email.toLowerCase() }, { phoneNumber }]
    });

    if (existingLead) {
      return { ok: false, message: "Coupon is only valid for first-time users." };
    }
  }

  const discountAmount = Math.min(calculateDiscountAmount(coupon, basePrice), basePrice);
  const finalPrice = Math.max(basePrice - discountAmount, 0);

  return {
    ok: true,
    message: "Coupon applied successfully.",
    coupon,
    discountAmount,
    finalPrice
  };
};
