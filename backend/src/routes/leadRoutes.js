import express from "express";
import { getLeads, submitLead } from "../controllers/leadController.js";

const router = express.Router();

router.post("/", submitLead);
router.get("/", getLeads);

export default router;
