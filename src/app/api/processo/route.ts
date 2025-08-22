import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface CnjApiResponse {
  hits?: {
    hits?: Array<{
      _source?: {
        sistema?: {
          nome?: string;
        };
      };
    }>;
  };
}

interface ApiJusBRResponse {
  status: string;
  mensagem: string;
  data: {
    numeroProcesso?: string;
    siglaTribunal?: string;
    tramitacaoAtual?: {
      instancia?: string;
      ativo?: boolean;
      valorAcao?: number;
      classe?: Array<{ descricao: string }>;
      assunto?: Array<{ descricao: string }>;
      partes?: Array<{ polo: string; nome: string }>;
      documentos?: Array<{
        tipo?: { nome: string };
        dataHoraJuntada: string;
      }>;
      movimentos?: Array<{
        descricao: string;
        dataHora: string;
      }>;
      distribuicao?: Array<{
        dataHora?: string;
        orgaoJulgador?: Array<{ nome: string }>;
      }>;
    };
    erro?: boolean;
    mensagemErro?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { numeroProcesso } = await request.json();

    if (!numeroProcesso) {
      return NextResponse.json({ error: "Número do processo é obrigatório" }, { status: 400 });
    }

    // Consulta API CNJ
    let nomeSistema = "N/A";
    const cnjApiUrl = getCnjApiUrl(numeroProcesso);

    if (cnjApiUrl) {
      nomeSistema = await consultaApiCnj(numeroProcesso, cnjApiUrl);
    }

    // Consulta API JusBR
    const apiResult = await consultaApiJusBR(numeroProcesso);

    return NextResponse.json({
      numeroProcesso,
      sistema: nomeSistema,
      resultado: apiResult,
    });
  } catch (error) {
    console.error("Erro na API:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

function getCnjApiUrl(numero: string): string | null {
  const tribunaisMap: { [key: string]: string } = {
    "1.00": "api_publica_stf",
    "2.00": "api_publica_cnj",
    "3.00": "api_publica_stj",
    "4.01": "api_publica_trf1",
    "4.02": "api_publica_trf2",
    "4.03": "api_publica_trf3",
    "4.04": "api_publica_trf4",
    "4.05": "api_publica_trf5",
    "4.06": "api_publica_trf6",
    "5.01": "api_publica_trt1",
    "5.02": "api_publica_trt2",
    "5.03": "api_publica_trt3",
    "5.04": "api_publica_trt4",
    "5.05": "api_publica_trt5",
    "5.06": "api_publica_trt6",
    "5.07": "api_publica_trt7",
    "5.08": "api_publica_trt8",
    "5.09": "api_publica_trt9",
    "5.10": "api_publica_trt10",
    "5.11": "api_publica_trt11",
    "5.12": "api_publica_trt12",
    "5.13": "api_publica_trt13",
    "5.14": "api_publica_trt14",
    "5.15": "api_publica_trt15",
    "5.16": "api_publica_trt16",
    "5.17": "api_publica_trt17",
    "5.18": "api_publica_trt18",
    "5.19": "api_publica_trt19",
    "5.20": "api_publica_trt20",
    "5.21": "api_publica_trt21",
    "5.22": "api_publica_trt22",
    "5.23": "api_publica_trt23",
    "5.24": "api_publica_trt24",
    "6.00": "api_publica_tse",
    "7.00": "api_publica_stm",
    "8.01": "api_publica_tjac",
    "8.02": "api_publica_tjal",
    "8.03": "api_publica_tjap",
    "8.04": "api_publica_tjam",
    "8.05": "api_publica_tjba",
    "8.06": "api_publica_tjce",
    "8.07": "api_publica_tjdft",
    "8.08": "api_publica_tjes",
    "8.09": "api_publica_tjgo",
    "8.10": "api_publica_tjma",
    "8.11": "api_publica_tjmt",
    "8.12": "api_publica_tjms",
    "8.13": "api_publica_tjmg",
    "8.14": "api_publica_tjpa",
    "8.15": "api_publica_tjpb",
    "8.16": "api_publica_tjpr",
    "8.17": "api_publica_tjpe",
    "8.18": "api_publica_tjpi",
    "8.19": "api_publica_tjrj",
    "8.20": "api_publica_tjrn",
    "8.21": "api_publica_tjrs",
    "8.22": "api_publica_tjro",
    "8.23": "api_publica_tjrr",
    "8.24": "api_publica_tjsc",
    "8.25": "api_publica_tjse",
    "8.26": "api_publica_tjsp",
    "8.27": "api_publica_tjto",
  };

  const numeroApenasDigitos = numero.replace(/\D/g, "");

  if (numeroApenasDigitos.length !== 20) {
    return null;
  }

  const j = numeroApenasDigitos.substring(13, 14);
  const tr = numeroApenasDigitos.substring(14, 16);
  const codigo = `${j}.${tr}`;

  if (tribunaisMap[codigo]) {
    return `https://api-publica.datajud.cnj.jus.br/${tribunaisMap[codigo]}/_search`;
  }

  return null;
}

async function consultaApiCnj(numeroProcesso: string, apiUrl: string): Promise<string> {
  try {
    const apiKey = "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
    const numeroApenasDigitos = numeroProcesso.replace(/\D/g, "");

    const payload = {
      query: {
        match: { numeroProcesso: numeroApenasDigitos },
      },
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        host: "api-publica.datajud.cnj.jus.br",
      },
      timeout: 30000, // 30 segundos
    });

    if (response.status === 200) {
      const data = response.data as CnjApiResponse;

      if (data.hits?.hits && data.hits.hits.length > 0) {
        for (const hit of data.hits.hits) {
          const nomeSistema = hit._source?.sistema?.nome;
          if (nomeSistema && nomeSistema !== "Inválido") {
            return nomeSistema;
          }
        }
      }
    }
  } catch (error) {
    console.error("Erro na API CNJ:", error);
  }

  return "N/A";
}

async function consultaApiJusBR(numero: string): Promise<ApiJusBRResponse> {
  try {
    const url = `https://rpa.juscash.com.br/jusbr/api/processo/${encodeURIComponent(numero)}`;

    const response = await axios.get(url, {
      timeout: 600000, // 10 minutos
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.status === 200 && response.data) {
      return response.data as ApiJusBRResponse;
    } else {
      return {
        status: "ERRO",
        mensagem: `HTTP ${response.status}`,
        data: {
          numeroProcesso: numero,
          erro: true,
          mensagemErro: `Erro HTTP: ${response.status}`,
        },
      };
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ECONNABORTED") {
      return {
        status: "ERRO",
        mensagem: "Timeout",
        data: {
          numeroProcesso: numero,
          erro: true,
          mensagemErro: "Timeout na consulta da API",
        },
      };
    }

    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number }; message?: string };
      return {
        status: "ERRO",
        mensagem: `Erro HTTP: ${axiosError.response?.status || "Desconhecido"}`,
        data: {
          numeroProcesso: numero,
          erro: true,
          mensagemErro: axiosError.message || "Erro na API",
        },
      };
    }

    return {
      status: "ERRO",
      mensagem: `Falha na API`,
      data: {
        numeroProcesso: numero,
        erro: true,
        mensagemErro: "Falha na API",
      },
    };
  }
}
