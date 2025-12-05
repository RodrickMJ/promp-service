export function mapMLToInterpretationPayload(ml: any) {
    const contradicciones =
        ml.analisis?.document_distorsion?.contradicciones ?? [];

    const primeraContradiccion = contradicciones[0];

    return {
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
                    ml.scraped_content?.segmentos_contenido?.[0]?.text ||
                    "No disponible"
            }
        }
    };
}
