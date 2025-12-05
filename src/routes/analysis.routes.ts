import { Router } from "express";
import { processAnalysis } from "../controllers/analysis.controller";
import { mlToInterpretationAdapter } from "../middlewares/mlAdapter.middleware";
import { RagQuestionController } from "../controllers/rag.controller";


const router = Router();

router.post(
    "/process",
    mlToInterpretationAdapter,   
    processAnalysis
);

router.post("/rag", RagQuestionController);

export default router;

