
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
    static async formatAnalysisForUser(analysisResult: any): Promise<{
        veredicto: "SIN SESGOS DETECTADOS" | "CON SESGOS DETECTADOS" | "ANÁLISIS INCONCLUSIVO";
        explicacion_detallada: string;
        coincidencias_con_fuente: string[];
        sesgos_identificados: string[];
        contexto_analisis: string;
    }> {

        const textosAnalizados = analysisResult.distortion?.oraciones_analizadas?.[0];

        const textoUsuario =
            textosAnalizados?.sentence ||
            "El usuario no proporcionó una oración verificable.";

        const textoFuente =
            analysisResult.relevance?.best_paragraph?.text ||
            "No existe un fragmento de fuente directamente relacionado.";

        const relevancia = analysisResult.relevance?.decision_document;
        const sesgosDetectados = analysisResult.biases?.labels || [];

        // ✅ DETECCIÓN FORMAL DE NO RELACIÓN
        const esNoRelacion =
            relevancia === "tangencial" ||
            relevancia === "poco_relevante" ||
            !analysisResult.relevance?.best_paragraph;

        let userPrompt = "";

        if (esNoRelacion) {
            userPrompt = `
El texto del usuario NO tiene relación verificable con la fuente proporcionada.

TEXTO DEL USUARIO:
"${textoUsuario}"

TEXTO DE LA FUENTE:
"${textoFuente}"

Tu tarea NO es comparar hechos, sino:

1. Explicar claramente por qué el texto del usuario no puede validarse ni refutarse con la fuente.
2. Analizar si el texto del usuario contiene por sí mismo sesgos políticos significativos.
3. Indicar que falta contexto verificable.

Devuelve ÚNICAMENTE este JSON:

{
  "veredicto": "ANÁLISIS INCONCLUSIVO",
  "explicacion_detallada": "Explicación clara de por qué no hay relación semántica o factual entre ambos textos",
  "coincidencias_con_fuente": [],
  "sesgos_identificados": [],
  "contexto_analisis": "No existe relación verificable entre la afirmación del usuario y la fuente"
}
      `.trim();
        } else {
            // ✅ TU PROMPT NORMAL CUANDO SÍ HAY RELACIÓN
            userPrompt = `
Eres un analista experto en comunicación política mexicana. Analiza si el texto del usuario contiene SESGOS POLÍTICOS SIGNIFICATIVOS.

TEXTO DEL USUARIO:
"${textoUsuario}"

TEXTO DE LA FUENTE:
"${textoFuente}"

Criterios válidos de sesgo:
- Ataques políticos directos
- Generalizaciones sobre actores políticos
- Manipulación de datos
- Lenguaje polarizante

NO son sesgos:
- Opiniones personales
- Valoraciones subjetivas moderadas
- Lenguaje emocional leve

Responde SOLO este JSON:

{
  "veredicto": "SIN SESGOS DETECTADOS" | "CON SESGOS DETECTADOS" | "ANÁLISIS INCONCLUSIVO",
  "explicacion_detallada": "Explicación del análisis",
  "coincidencias_con_fuente": [],
  "sesgos_identificados": [],
  "contexto_analisis": "Tipo de análisis realizado"
}
      `.trim();
        }

        const messages = [
            {
                role: "system",
                content:
                    "Eres un analista político estricto, lógico, verificable y sin suposiciones."
            },
            { role: "user", content: userPrompt }
        ];

        const body = {
            model: MODEL,
            temperature: 0.1,
            max_tokens: 1200,
            messages
        };

        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Error en OpenRouter: ${res.status} - ${text}`);
        }

        const json = await res.json();
        const output = json.choices?.[0]?.message?.content || "";

        let parsed: any;

        try {
            parsed = JSON.parse(output);
        } catch {
            const match = output.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("Respuesta inválida del modelo.");
            parsed = JSON.parse(match[0]);
        }

        return parsed;
    }
}
