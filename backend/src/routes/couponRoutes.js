import express from "express";
import { createCoupon, getCoupons, validateCoupon } from "../controllers/couponController.js";

const router = express.Router();

router.get("/", getCoupons);
router.post("/", createCoupon);
router.post("/validate", validateCoupon);

export default router;
