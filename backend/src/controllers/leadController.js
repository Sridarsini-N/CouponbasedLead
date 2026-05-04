import Coupon from "../models/Coupon.js";
import Lead from "../models/Lead.js";
import { validateCouponForLead } from "../utils/couponEngine.js";

const ALLOWED_REQUIREMENT_TYPES = ["Service", "Product", "Consultation"];
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const submissionCooldownMinutes = Number(process.env.SUBMISSION_COOLDOWN_MINUTES || 10);

export const submitLead = async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      email,
      city,
      requirementType,
      budgetRange,
      basePrice,
      message = "",
      couponCode = ""
    } = req.body;

    if (!name || !phoneNumber || !email || !city || !requirementType || !budgetRange || !basePrice) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    const cleanedPhone = String(phoneNumber).trim();
    const cleanedEmail = String(email).trim().toLowerCase();
    const parsedPrice = Number(basePrice);

    if (!PHONE_REGEX.test(cleanedPhone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number." });
    }

    if (!EMAIL_REGEX.test(cleanedEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }

    if (!ALLOWED_REQUIREMENT_TYPES.includes(requirementType)) {
      return res.status(400).json({ success: false, message: "Invalid requirement type." });
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, message: "Invalid base price." });
    }

    const duplicateThreshold = new Date(
      Date.now() - submissionCooldownMinutes * 60 * 1000
    );

    const duplicateSubmission = await Lead.findOne({
      createdAt: { $gte: duplicateThreshold },
      $or: [{ email: cleanedEmail }, { phoneNumber: cleanedPhone }]
    });

    if (duplicateSubmission) {
      return res.status(429).json({
        success: false,
        message: `Duplicate submission detected. Please retry after ${submissionCooldownMinutes} minutes.`
      });
    }

    let discountAmount = 0;
    let finalPrice = parsedPrice;
    let normalizedCouponCode = "";

    if (couponCode && String(couponCode).trim()) {
      const couponCheck = await validateCouponForLead({
        couponCode,
        requirementType,
        basePrice: parsedPrice,
        email: cleanedEmail,
        phoneNumber: cleanedPhone
      });

      if (!couponCheck.ok) {
        return res.status(400).json({ success: false, message: couponCheck.message });
      }

      discountAmount = Number(couponCheck.discountAmount.toFixed(2));
      finalPrice = Number(couponCheck.finalPrice.toFixed(2));
      normalizedCouponCode = couponCheck.coupon.code;

      await Coupon.updateOne(
        { _id: couponCheck.coupon._id },
        { $inc: { usageCount: 1 } }
      );
    }

    const lead = await Lead.create({
      name: String(name).trim(),
      phoneNumber: cleanedPhone,
      email: cleanedEmail,
      city: String(city).trim(),
      requirementType,
      budgetRange,
      basePrice: parsedPrice,
      message: String(message).trim(),
      couponCode: normalizedCouponCode,
      discountAmount,
      finalPrice
    });

    return res.status(201).json({
      success: true,
      message: "Lead submitted successfully.",
      data: lead
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to submit lead.",
      error: error.message
    });
  }
};

export const getLeads = async (req, res) => {
  try {
    const { search = "", requirementType, city, couponStatus, limit = "200" } = req.query;

    const query = {};
    const andFilters = [];
    const normalizedSearch = String(search).trim();

    if (normalizedSearch) {
      andFilters.push({
        $or: [
        { name: { $regex: normalizedSearch, $options: "i" } },
        { email: { $regex: normalizedSearch, $options: "i" } },
        { phoneNumber: { $regex: normalizedSearch, $options: "i" } },
        { city: { $regex: normalizedSearch, $options: "i" } },
        { couponCode: { $regex: normalizedSearch, $options: "i" } }
      ]
      });
    }

    if (requirementType && ALLOWED_REQUIREMENT_TYPES.includes(requirementType)) {
      query.requirementType = requirementType;
    }

    if (city) {
      query.city = city;
    }

    if (couponStatus === "withCoupon") {
      query.couponCode = { $nin: ["", null] };
    }

    if (couponStatus === "withoutCoupon") {
      andFilters.push({ $or: [{ couponCode: "" }, { couponCode: null }] });
    }

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const parsedLimit = Number(limit);
    const safeLimit = Number.isNaN(parsedLimit) ? 200 : Math.min(Math.max(parsedLimit, 1), 1000);

    const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(safeLimit);
    return res.json({ success: true, data: leads });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads.",
      error: error.message
    });
  }
};
