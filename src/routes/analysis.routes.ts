import { Router } from "express";
import { processAnalysis } from "../controllers/analysis.controller";
import { mlToInterpretationAdapter } from "../middlewares/mlAdapter.middleware";


const router = Router();

router.post(
    "/process",
    mlToInterpretationAdapter,   
    processAnalysis
);

export default router;
