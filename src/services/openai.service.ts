
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
        const textoUsuario = textosAnalizados?.sentence || "Texto no disponible";
        const textoFuente = textosAnalizados?.paragraph || analysisResult.relevance?.best_paragraph?.text || "Fuente no disponible";

        const sesgosDetectados = analysisResult.biases?.labels || [];
        const relevancia = analysisResult.relevance?.decision_document;
        const distorsion = analysisResult.distortion?.decision;

        const userPrompt = `
Eres un analista experto en comunicación política mexicana. Analiza si el texto del usuario contiene SESGOS POLÍTICOS SIGNIFICATIVOS, no simples expresiones de opinión personal.

TEXTO DEL USUARIO:
"${textoUsuario}"

TEXTO DE LA FUENTE:
"${textoFuente}"

INSTRUCCIONES CRÍTICAS:

Considera como SESGOS POLÍTICOS SIGNIFICATIVOS solo estos casos:
- Parcialidad partidista clara (favorece/ataca específicamente a un partido político)
- Lenguaje polarizante o confrontacional hacia grupos políticos
- Generalizaciones negativas sobre instituciones o figuras políticas
- Descalificaciones directas a actores políticos
- Manipulación evidente de datos estadísticos con intención política
- Uso de estereotipos políticos o discursos de odio

NO consideres como sesgos significativos:
- Expresiones de opinión personal ("creo que", "me parece")
- Valoraciones subjetivas moderadas ("es positivo", "es bueno") 
- Lenguaje emocional leve
- Preferencias personales sin ataque a otros
- Interpretaciones subjetivas que no distorsionan los hechos

BASADO EN ESTE CRITERIO, determina:

VEREDICTO FINAL:
- "CON SESGOS DETECTADOS": Solo si hay sesgos políticos CLAROS Y SIGNIFICATIVOS
- "SIN SESGOS DETECTADOS": Si son solo opiniones personales o no hay sesgos políticos evidentes
- "ANÁLISIS INCONCLUSIVO": Si no hay suficiente información para determinar

Responde ÚNICAMENTE con un JSON en español con esta estructura:

{
  "veredicto": "SIN SESGOS DETECTADOS" | "CON SESGOS DETECTADOS" | "ANÁLISIS INCONCLUSIVO",
  "explicacion_detallada": "Explicación específica de por qué hay o no hay sesgos políticos significativos, analizando el texto del usuario",
  "coincidencias_con_fuente": [
    "Coincidencia 1 específica entre ambos textos",
    "Coincidencia 2 específica entre ambos textos"
  ],
  "sesgos_identificados": [
    "Solo si hay sesgos políticos claros, describe específicamente cada uno"
  ],
  "contexto_analisis": "Breve contexto sobre el tipo de sesgo político analizado"
}

IMPORTANTE: Sé estricto. Solo marca como sesgo lo que sea claramente un sesgo político significativo.
        `.trim();

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "Eres un analista político estricto que solo considera sesgos políticos significativos, ignorando opiniones personales leves. Eres objetivo y riguroso en tus evaluaciones."
            },
            {
                role: "user",
                content: userPrompt
            }
        ];

        const body = {
            model: MODEL,
            temperature: 0.1,
            max_tokens: 1500,
            messages: messages
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
            if (match) {
                try {
                    parsed = JSON.parse(match[0]);
                } catch {
                    throw new Error("No se pudo procesar la respuesta del análisis.");
                }
            }
        }

        if (!parsed) {
            throw new Error("Respuesta en formato incorrecto.");
        }

        return parsed;
    }
}