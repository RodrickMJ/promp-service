import { Router } from "express";
import { processAnalysis } from "../controllers/analysis.controller.js";
import { mlToInterpretationAdapter } from "../middlewares/mlAdapter.middleware.js";
import { RagQuestionController } from "../controllers/rag.controller.js";


const router = Router();

router.post(
    "/process",
    mlToInterpretationAdapter,   
    processAnalysis
);

router.post("/rag", RagQuestionController);

export default router;

