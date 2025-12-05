import { Request, Response } from "express";
import { generateRAGQuestions } from "../services/deepseek.service";

export const RagQuestionController = async (req: Request, res: Response) => {
    try {
        
        const {text} = req.body;
        if (!text) {
            return res.status(400).json({
                success: true,
                msg: "Is requiered field",
                data: null
            });
        }
        const listAsk = await generateRAGQuestions(text);

        return res.status(200).json({
            success: true,
            msg: "prompt generate succefully",
            data : listAsk
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            msg: "Internarl Server Error, failed to generate promp",
            data: null
        })
    }
}