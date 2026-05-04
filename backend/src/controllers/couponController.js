import { validateCouponForLead } from "../utils/couponEngine.js";
import Coupon from "../models/Coupon.js";

const ALLOWED_REQUIREMENT_TYPES = ["Service", "Product", "Consultation"];

export const getCoupons = async (req, res) => {
  try {
    const { search = "", discountType, requirementType, status } = req.query;
    const query = {};
    const andFilters = [];
    const normalizedSearch = String(search).trim();

    if (normalizedSearch) {
      query.code = { $regex: normalizedSearch, $options: "i" };
    }

    if (["PERCENTAGE", "FLAT"].includes(discountType)) {
      query.discountType = discountType;
    }

    if (ALLOWED_REQUIREMENT_TYPES.includes(requirementType)) {
      andFilters.push({
        $or: [
        { applicableRequirementTypes: requirementType },
        { applicableRequirementTypes: { $size: 0 } }
      ]
      });
    }

    if (status === "active") {
      query.isActive = true;
      query.expiresAt = { $gte: new Date() };
    }

    if (status === "expired") {
      andFilters.push({ $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }] });
    }

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coupons.",
      error: error.message
    });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderValue = 0,
      applicableRequirementTypes = [],
      maxUsage = 100,
      isFirstTimeOnly = false,
      expiresAt
    } = req.body;

    if (!code || !discountType || discountValue === undefined || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: "code, discountType, discountValue and expiresAt are required."
      });
    }

    if (!["PERCENTAGE", "FLAT"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "discountType should be either PERCENTAGE or FLAT."
      });
    }

    const parsedDiscountValue = Number(discountValue);
    if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "discountValue should be greater than 0."
      });
    }

    const parsedExpiry = new Date(expiresAt);
    if (Number.isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiresAt date."
      });
    }

    const normalizedTypes = Array.isArray(applicableRequirementTypes)
      ? applicableRequirementTypes.filter((type) => ALLOWED_REQUIREMENT_TYPES.includes(type))
      : [];

    const coupon = await Coupon.create({
      code: String(code).trim().toUpperCase(),
      discountType,
      discountValue: parsedDiscountValue,
      minOrderValue: Number(minOrderValue) || 0,
      applicableRequirementTypes: normalizedTypes,
      maxUsage: Number(maxUsage) || 100,
      isFirstTimeOnly: Boolean(isFirstTimeOnly),
      expiresAt: parsedExpiry
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully.",
      data: coupon
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create coupon.",
      error: error.message
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { couponCode, requirementType, basePrice, email, phoneNumber } = req.body;

    if (!couponCode || !requirementType || !basePrice || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "couponCode, requirementType, basePrice, email and phoneNumber are required."
      });
    }

    if (!ALLOWED_REQUIREMENT_TYPES.includes(requirementType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement type."
      });
    }

    const parsedPrice = Number(basePrice);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "basePrice should be a valid number greater than 0."
      });
    }

    const result = await validateCouponForLead({
      couponCode,
      requirementType,
      basePrice: parsedPrice,
      email,
      phoneNumber
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
      data: {
        couponCode: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
        discountAmount: Number(result.discountAmount.toFixed(2)),
        finalPrice: Number(result.finalPrice.toFixed(2))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate coupon.",
      error: error.message
    });
  }
};
