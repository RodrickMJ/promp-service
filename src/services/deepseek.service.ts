import { OpenRouter } from "@openrouter/sdk";
import "dotenv/config";

const apiKey = process.env["IA_KEY"];
const openrouter = new OpenRouter({ apiKey });

interface RAGResponse {
    questions_for_rag: string[];
}

export const generateRAGQuestions = async (
    user_text: string
): Promise<RAGResponse | { error: string; raw: string }> => {
    try {
        const response = await openrouter.chat.send({
            model: "tngtech/deepseek-r1t2-chimera:free",
            stream: false,
            messages: [
                {
                    role: "system",
                    content: `
Eres un generador de consultas para un sistema RAG.
Devuelve solo JSON sin backticks ni texto extra.
Formato:
{
  "questions_for_rag": [
    "pregunta 1",
    "pregunta 2",
    "pregunta 3"
  ]
}
`
                },
                {
                    role: "user",
                    content: user_text
                }
            ]
        });

        let rawContent = response?.choices?.[0]?.message?.content;

        // Normalizar contenido a string
        const contentString = Array.isArray(rawContent)
            ? rawContent
                .map((item: any) => ("text" in item ? item.text : ""))
                .join(" ")
            : rawContent ?? "";

        const clean = contentString
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();


        return JSON.parse(clean) as RAGResponse;
    } catch (err) {
        console.error("Error parsing JSON:", err);
        return { error: `${err}`, raw: "" };
    }
};
