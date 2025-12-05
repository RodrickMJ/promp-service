import "dotenv/config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL_NAME || "openai/gpt-oss-20b:free";

if (!API_KEY) {
    throw new Error("OPENROUTER_API_KEY no está configurada en .env");
}

export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

interface OpenRouterResponse {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
    }>;
}

export class OpenRouterService {

    static async formatAnalysisForUser(analysisResult: any) {

        const relevancia = analysisResult.relevance;
        const distorsion = analysisResult.distortion;
        const sesgos = analysisResult.biases;

        const textoUsuario =
            distorsion?.oraciones_analizadas?.[0]?.sentence ??
            analysisResult.raw_ml?.user_text ??
            "Texto del usuario no disponible";

        const textoFuente =
            distorsion?.oraciones_analizadas?.[0]?.paragraph ??
            relevancia?.best_paragraph?.text ??
            analysisResult.scraped_content?.segmentos_contenido?.[0]?.text ??
            "Texto fuente no disponible";

        const userPrompt = `
Eres un analista experto que integra múltiples resultados de modelos automáticos, incluso cuando son contradictorios.

RESULTADOS DEL ANALIZADOR:

RELEVANCIA:
- decision: ${relevancia?.decision}
- score: ${relevancia?.score}

DISTORSIÓN:
- decision: ${distorsion?.decision}
- contradicciones_detectadas: ${distorsion?.contradicciones?.length ?? 0}

SESGOS:
- etiquetas_detectadas: ${sesgos?.labels?.join(", ") || "Ninguno"}

TEXTO DEL USUARIO:
"${textoUsuario}"

TEXTO DE LA FUENTE:
"${textoFuente}"

REGLAS DE ANÁLISIS:
1. No asumas que las métricas son coherentes entre sí.
2. Si la relevancia es baja, explica cómo eso limita la validación factual.
3. Los sesgos pueden analizarse aunque no haya relación semántica.
4. Si hay distorsión sin suficiente contexto, explica esa incertidumbre.
5. Nunca rechaces el análisis; razona con la evidencia disponible.

Devuelve SOLO este JSON en español:

{
  "veredicto": "SIN SESGOS DETECTADOS" | "CON SESGOS DETECTADOS" | "ANÁLISIS INCONCLUSIVO",
  "explicacion_detallada": "Interpretación integrando TODAS las métricas",
  "coincidencias_con_fuente": [],
  "sesgos_identificados": [],
  "contexto_analisis": "Contexto general del caso"
}
`.trim();

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "Eres un analista político riguroso que integra múltiples métricas probabilísticas."
            },
            {
                role: "user",
                content: userPrompt
            }
        ];

        const body = {
            model: MODEL,
            temperature: 0.2,
            max_tokens: 1200,
            messages
        };

        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Error en OpenRouter: ${res.status} - ${text}`);
        }

        const json = await res.json() as OpenRouterResponse;
        const assistantMessage = json.choices?.[0]?.message;

        if (!assistantMessage) {
            throw new Error("No se recibió respuesta del modelo.");
        }

        const output = assistantMessage.content || "";

        let parsed: any = null;

        try {
            parsed = JSON.parse(output);
        } catch {
            const match = output.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
        }

        if (!parsed) {
            throw new Error("No se pudo parsear la respuesta del LLM.");
        }

        return parsed;
    }
}
