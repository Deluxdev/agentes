import { InvoiceData } from "@/types/invoice";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL;

const EXPENSE_CATEGORIES = {
  INSUMOS_AGRICOLAS: [
    "Sementes",
    "Fertilizantes",
    "Defensivos Agrícolas",
    "Corretivos",
  ],
  MANUTENCAO_E_OPERACAO: [
    "Combustíveis e Lubrificantes",
    "Peças, Parafusos, Componentes Mecânicos",
    "Manutenção de Máquinas e Equipamentos",
    "Pneus, Filtros, Correias",
    "Ferramentas e Utensílios",
  ],
  RECURSOS_HUMANOS: ["Mão de Obra Temporária", "Salários e Encargos"],
  SERVICOS_OPERACIONAIS: [
    "Frete e Transporte",
    "Colheita Terceirizada",
    "Secagem e Armazenagem",
    "Pulverização e Aplicação",
  ],
  INFRAESTRUTURA_E_UTILIDADES: [
    "Energia Elétrica",
    "Arrendamento de Terras",
    "Construções e Reformas",
    "Materiais de Construção",
  ],
  ADMINISTRATIVAS: [
    "Honorários (Contábeis, Advocatícios, Agronômicos)",
    "Despesas Bancárias e Financeiras",
  ],
  SEGUROS_E_PROTECAO: [
    "Seguro Agrícola",
    "Seguro de Ativos (Máquinas/Veículos)",
    "Seguro Prestamista",
  ],
  IMPOSTOS_E_TAXAS: ["ITR, IPTU, IPVA, INCRA-CCIR"],
  INVESTIMENTOS: [
    "Aquisição de Máquinas e Implementos",
    "Aquisição de Veículos",
    "Aquisição de Imóveis",
    "Infraestrutura Rural",
  ],
};

export const analyzeInvoicePDF = async (file: File): Promise<InvoiceData> => {
  try {
    const base64Data = await fileToBase64(file);

    const prompt = `
Você é um especialista em análise de notas fiscais para o setor agrícola. Analise esta nota fiscal em PDF e extraia EXATAMENTE as seguintes informações, retornando em formato JSON válido:

{
  "fornecedor": {
    "razaoSocial": "string",
    "fantasia": "string", 
    "cnpj": "string"
  },
  "faturado": {
    "nomeCompleto": "string",
    "cpfCnpj": "string"
  },
  "numeroNotaFiscal": "string",
  "dataEmissao": "YYYY-MM-DD",
  "produtos": [
    {
      "descricao": "string",
      "quantidade": number,
      "valorUnitario": number,
      "valorTotal": number
    }
  ],
  "quantidadeParcelas": 1,
  "parcelas": [
    {
      "numero": 1,
      "dataVencimento": "YYYY-MM-DD",
      "valor": number
    }
  ],
  "valorTotal": number,
  "classificacaoDespesa": {
    "categoria": "CATEGORIA_PRINCIPAL",
    "subcategoria": "subcategoria específica",
    "justificativa": "explicação da classificação baseada nos produtos"
  }
}

CATEGORIAS DE DESPESA DISPONÍVEIS:
${Object.entries(EXPENSE_CATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.join(", ")}`)
  .join("\n")}

INSTRUÇÕES IMPORTANTES:
1. Para produtos não identificados claramente, use descrições genéricas mas mantenha o JSON válido
2. Para classificação de despesa, analise os produtos e escolha a categoria mais apropriada
3. Sempre retorne quantidadeParcelas como 1 (estrutura preparada para expansão)
4. Valores devem ser números (não strings)
5. Datas no formato YYYY-MM-DD
6. RETORNE APENAS O JSON, SEM TEXTO ADICIONAL

Analise a nota fiscal e retorne o JSON:
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Gemini: ${response.statusText}`);
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      throw new Error("Resposta inválida da API do Gemini");
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Não foi possível extrair JSON da resposta");
    }

    const invoiceData: InvoiceData = JSON.parse(jsonMatch[0]);

    if (!invoiceData.fornecedor || !invoiceData.numeroNotaFiscal) {
      throw new Error("Dados essenciais da nota fiscal não encontrados");
    }

    return invoiceData;
  } catch (error) {
    console.error("Erro ao analisar PDF:", error);
    throw new Error(
      `Falha ao processar a nota fiscal: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
