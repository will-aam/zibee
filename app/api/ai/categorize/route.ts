import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { transactions, categories, history } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "A chave GEMINI_API_KEY não está configurada no seu arquivo .env.local" },
        { status: 500 }
      );
    }

    if (!transactions || !categories || transactions.length === 0) {
      return NextResponse.json(
        { error: "Transações ou categorias ausentes." },
        { status: 400 }
      );
    }

    const categoriesList = categories.map((c: any) => `ID: ${c.id}, Nome: "${c.nome}"`).join("\n");
    const transactionsList = transactions
      .map((t: any) => `ID: ${t.id} | Descrição: "${t.description}" | Valor: ${t.amount} | Tipo: ${t.type}`)
      .join("\n");
      
    const historyList = history && history.length > 0 ? history.join("\n") : "Sem histórico prévio.";

    const prompt = `Você é um assistente financeiro extremamente inteligente.
Sua tarefa é analisar uma lista de transações bancárias lidas de um extrato OFX e, para cada transação, escolher a categoria mais adequada dentre as categorias do usuário.

Categorias disponíveis:
${categoriesList}

Transações:
${transactionsList}

Siga estas regras:
1. Analise o campo Descrição. Ex: "Uber", "99App" -> Transporte. "Mcdonalds", "Ifood" -> Alimentação. "Pix enviado para Joao" -> Transferência/Pix.
2. Você DEVE retornar EXATAMENTE um objeto categoryId (string) correspondente a um dos IDs da lista de categorias disponíveis para CADA transação.
3. Se não tiver muita certeza, escolha a que melhor se aproxima. Se a descrição for apenas 'Pix Enviado', escolha algo relacionado a Pagamentos ou Transferências.
4. MUITO IMPORTANTE: O usuário possui um histórico de categorização. Tente SEGUIR o padrão dele sempre que a descrição for parecida.
Histórico do usuário:
${historyList}

Retorne o array de resultados.`;

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  transactionId: { type: Type.STRING },
                  categoryId: { type: Type.STRING }
                },
                required: ["transactionId", "categoryId"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const object = JSON.parse(response.text || "{}");
    return NextResponse.json({ results: object.results });
  } catch (error: any) {
    console.error("Erro na rota de IA:", error);
    return NextResponse.json(
      { error: "Falha ao categorizar com IA", details: error.message },
      { status: 500 }
    );
  }
}
