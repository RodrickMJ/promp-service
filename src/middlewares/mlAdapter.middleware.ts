import { Request, Response, NextFunction } from "express";

export function mlToInterpretationAdapter(
    req: Request,
    res: Response,
    next: NextFunction
) {

    // Caso A: viene envuelto en distortion (nuevo formato)
    // Caso B: viene plano (formato viejo)
    const payload = req.body.distortion ?? req.body;
    const ml = payload;

    /**
     * ============================
     * 1. DETECCIÓN DE TIPO DE PAYLOAD
     * ============================
     */

    const tienePipelineCompleto = !!ml?.analisis;
    const tieneSoloRelevancia = !!ml?.relevance;

    if (!tienePipelineCompleto && !tieneSoloRelevancia) {
        return res.status(400).json({
            error: "Payload ML no reconocido",
            recibido: Object.keys(req.body)
        });
    }

    /**
     * ============================
     * 2. NORMALIZACIÓN DE DISTORSIÓN
     * ============================
     */

    let distortion: any = {
        decision: "desconocido",
        contradicciones: [],
        oraciones_analizadas: []
    };

    if (tienePipelineCompleto) {
        const contradicciones =
            ml.analisis?.document_distorsion?.contradicciones ?? [];

        const primeraContradiccion = contradicciones[0] ?? null;

        distortion = {
            decision: ml.analisis?.document_distorsion?.veredicto ?? "desconocido",
            contradicciones,
            oraciones_analizadas: primeraContradiccion
                ? [{
                    sentence: primeraContradiccion.oracion_usuario,
                    paragraph: primeraContradiccion.parrafo
                }]
                : []
        };
    }

    /**
     * ============================
     * 3. NORMALIZACIÓN DE SESGOS
     * ============================
     */

    let biases: any = {
        document: null,
        user: null,
        labels: []
    };

    if (tienePipelineCompleto) {
        biases = {
            document: ml.analisis?.document_sesgo ?? null,
            user: ml.analisis?.user_sesgo ?? null,
            labels: [
                ...(ml.analisis?.document_sesgo?.sesgos_encontrados ?? []).map((s: any) => s.label),
                ...(ml.analisis?.user_sesgo?.sesgos_encontrados ?? []).map((s: any) => s.label)
            ]
        };
    }

    /**
     * ============================
     * 4. NORMALIZACIÓN DE RELEVANCIA
     * ============================
     */

    let relevanceRaw =
        ml?.relevance ??
        ml?.analisis?.document_relevance ??
        null;

    if (!relevanceRaw && ml?.distortion?.relevance) {
        relevanceRaw = ml.distortion.relevance;
    }

    const relevance = relevanceRaw
        ? {
            decision:
                relevanceRaw.decision_document ??
                relevanceRaw.decision ??
                "desconocido",

            score:
                relevanceRaw.score_document ??
                relevanceRaw.score ??
                null,

            best_paragraph:
                relevanceRaw.best_paragraph ?? null,

            per_paragraph:
                relevanceRaw.per_paragraph ?? null
        }
        : {
            decision: "desconocido",
            score: null,
            best_paragraph: null,
            per_paragraph: null
        };

    /**
     * ============================
     * 5. SCRAPED CONTENT (OPCIONAL)
     * ============================
     */

    const scraped_content =
        ml?.scraped_content ??
        req.body?.scraped_content ??
        null;

    /**
     * ============================
     * 6. PAYLOAD NORMALIZADO FINAL
     * ============================
     */

    req.body = {
        distortion,
        biases,
        relevance,
        scraped_content,
        raw_ml: ml   // 🔎 trazabilidad completa
    };

    next();
}
