import Coupon from "../models/Coupon.js";

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const seedCoupons = async () => {
  const coupons = [
    {
      code: "SAVE10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 500,
      applicableRequirementTypes: [],
      maxUsage: 100,
      isFirstTimeOnly: false,
      expiresAt: daysFromNow(30),
      isActive: true
    },
    {
      code: "FLAT100",
      discountType: "FLAT",
      discountValue: 100,
      minOrderValue: 0,
      applicableRequirementTypes: ["Service"],
      maxUsage: 100,
      isFirstTimeOnly: false,
      expiresAt: daysFromNow(30),
      isActive: true
    },
    {
      code: "NEWUSER",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minOrderValue: 0,
      applicableRequirementTypes: [],
      maxUsage: 100,
      isFirstTimeOnly: true,
      expiresAt: daysFromNow(30),
      isActive: true
    },
    {
      code: "EXPIRE50",
      discountType: "PERCENTAGE",
      discountValue: 50,
      minOrderValue: 0,
      applicableRequirementTypes: [],
      maxUsage: 100,
      isFirstTimeOnly: false,
      expiresAt: daysFromNow(-2),
      isActive: true
    }
  ];

  for (const coupon of coupons) {
    await Coupon.updateOne({ code: coupon.code }, { $set: coupon }, { upsert: true });
  }

  console.log("Coupons seeded");
};
