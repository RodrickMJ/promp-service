import { Request, Response, NextFunction } from "express";

export function mlToInterpretationAdapter(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const payload = req.body.distortion ?? req.body;
    const ml = payload;

    if (!ml?.analisis || !ml?.scraped_content) {
        return res.status(400).json({
            error: "Payload ML inválido para adaptación",
            recibido: Object.keys(req.body)
        });
    }

    const contradicciones =
        ml.analisis?.document_distorsion?.contradicciones ?? [];

    const primeraContradiccion = contradicciones[0];

    // ✅ RESPETAR LA RELEVANCIA REAL DEL MODELO
    const relevanciaRaw =
        ml.analisis?.document_relevance?.decision_document ??
        ml.relevance?.decision_document ??
        ml.status ??
        "desconocido";

    const scoreRelevancia =
        ml.analisis?.document_relevance?.score_document ??
        ml.relevance?.score_document ??
        null;

    const hayRelacion =
        relevanciaRaw !== "tangencial" &&
        relevanciaRaw !== "poco_relevante" &&
        relevanciaRaw !== "desconocido";

    const bestParagraph = hayRelacion
        ? ml.scraped_content?.segmentos_contenido?.[0]?.text ?? null
        : null;

    const adaptedPayload = {
        distortion: {
            decision:
                ml.analisis?.document_distorsion?.veredicto === "distorsion"
                    ? "DISTORSION"
                    : "SIN_DISTORSION",

            oraciones_analizadas: primeraContradiccion
                ? [
                    {
                        sentence: primeraContradiccion.oracion_usuario,
                        paragraph: primeraContradiccion.parrafo
                    }
                ]
                : []
        },

        biases: {
            labels: [
                ...(ml.analisis?.document_sesgo?.sesgos_encontrados ?? []).map(
                    (s: any) => s.label
                ),
                ...(ml.analisis?.user_sesgo?.sesgos_encontrados ?? []).map(
                    (s: any) => s.label
                )
            ]
        },

        relevance: {
            decision_document: relevanciaRaw,
            score: scoreRelevancia,
            best_paragraph: bestParagraph ? { text: bestParagraph } : null
        }
    };

    req.body = adaptedPayload;
    next();
}
