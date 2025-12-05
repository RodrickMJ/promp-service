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
            decision_document: "RELEVANTE",
            best_paragraph: {
                text:
                    ml.scraped_content?.segmentos_contenido?.[0]?.text ??
                    "No disponible"
            }
        }
    };

    req.body = adaptedPayload;
    next();
}
