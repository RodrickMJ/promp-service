
import { Request, Response } from "express";
import { OpenRouterService } from "../services/openai.service";

export const processAnalysis = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const analysisResult = payload.analysis_result ?? payload;

    if (!analysisResult) {
      return res.status(400).json({ 
        error: "No se recibió el análisis para interpretar" 
      });
    }

    if (!analysisResult.distortion || !analysisResult.biases) {
      return res.status(400).json({
        error: "El análisis técnico no tiene la estructura esperada"
      });
    }

    const interpretation = await OpenRouterService.formatAnalysisForUser(analysisResult);

    return res.json({
      resultado: interpretation.veredicto,
      explicacion: interpretation.explicacion_detallada,
      coincidencias: interpretation.coincidencias_con_fuente,
      sesgos_encontrados: interpretation.sesgos_identificados,
      contexto: interpretation.contexto_analisis
    });

  } catch (err: any) {
    console.error("Error interpretando análisis:", err);
    
    return res.status(500).json({ 
      error: "No se pudo interpretar el análisis de sesgos",
      detalle: err.message
    });
  }
};