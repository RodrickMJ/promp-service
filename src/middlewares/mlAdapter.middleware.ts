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

    const primeraContradiccion = contradicciones[0] ?? null;

    req.body = {
        distortion: {
            decision: ml.analisis?.document_distorsion?.veredicto ?? "desconocido",
            contradicciones,
            oraciones_analizadas: primeraContradiccion
                ? [{
                    sentence: primeraContradiccion.oracion_usuario,
                    paragraph: primeraContradiccion.parrafo
                }]
                : []
        },

        biases: {
            document: ml.analisis?.document_sesgo ?? null,
            user: ml.analisis?.user_sesgo ?? null,
            labels: [
                ...(ml.analisis?.document_sesgo?.sesgos_encontrados ?? [])
                    .map((s: any) => s.label),
                ...(ml.analisis?.user_sesgo?.sesgos_encontrados ?? [])
                    .map((s: any) => s.label)
            ]
        },

        relevance: {
            decision:
                ml.relevance?.decision_document ??
                ml.analisis?.document_relevance?.decision_document ??
                "desconocido",

            score:
                ml.relevance?.score_document ??
                ml.analisis?.document_relevance?.score ??
                null,

            per_paragraph:
                ml.relevance?.per_paragraph ??
                ml.analisis?.document_relevance?.per_paragraph ??
                null,

            best_paragraph:
                ml.relevance?.best_paragraph ??
                ml.analisis?.document_relevance?.best_paragraph ??
                null
        },

        scraped_content: ml.scraped_content,

        raw_ml: ml // 🔎 trazabilidad total
    };

    next();
}
