

export interface ProcessoData {
  id: string;
  numeroProcesso: string;
  siglaTribunal: string;
  sistema: string;
  orgaoJulgador: string;
  dataDistribuicao: string | null;
  instancia: string;
  dataUltMov: string | null;
  ativo: string;
  valorAcao: number;
  classe: string;
  assunto: string;
  poloAtivo: string;
  poloPassivo: string;
  documentos: DocumentoData[];
  movimentos: MovimentoData[];
  status: boolean;
  erro: boolean;
  mensagemErro: string | null;
}

export interface DocumentoData {
  tipo?: {
    nome: string;
  };
  dataHoraJuntada: string;
}

export interface MovimentoData {
  descricao: string;
  dataHora: string;
}

export interface ApiJusBRResponse {
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
      documentos?: DocumentoData[];
      movimentos?: MovimentoData[];
      distribuicao?: Array<{
        dataHora?: string;
        orgaoJulgador?: Array<{ nome: string }>;
      }>;
    };
    erro?: boolean;
    mensagemErro?: string;
  };
}

export interface ConsultaResponse {
  total_na_fila: number;
  total_processado: number;
}

class ProcessoService {
  private static instance: ProcessoService;
  private queue: string[] = [];
  private results: ProcessoData[] = [];
  private batchSize = 10;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ProcessoService {
    if (!ProcessoService.instance) {
      ProcessoService.instance = new ProcessoService();
    }
    return ProcessoService.instance;
  }

  private loadFromStorage(): void {
    if (typeof window !== "undefined") {
      const savedQueue = localStorage.getItem("jusbr_queue");
      const savedResults = localStorage.getItem("jusbr_results");

      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
      }
      if (savedResults) {
        this.results = JSON.parse(savedResults);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("jusbr_queue", JSON.stringify(this.queue));
      localStorage.setItem("jusbr_results", JSON.stringify(this.results));
    }
  }

  public addToQueue(numeroProcesso: string): void {
    if (!this.queue.includes(numeroProcesso)) {
      this.queue.push(numeroProcesso);
      this.saveToStorage();
    }
  }

  public getCnjApiUrl(numero: string): string | null {
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

  private async consultaApiCnj(_numeroProcesso: string, _apiUrl: string): Promise<string> {
    // Esta função agora será chamada através da API route server-side
    return "N/A";
  }

  private async consultaApiJusBR(numero: string): Promise<ApiJusBRResponse> {
    // Esta função agora será chamada através da API route server-side
    return {
      status: "ERRO",
      mensagem: "Função não implementada",
      data: {
        numeroProcesso: numero,
        erro: true,
        mensagemErro: "Função não implementada",
      },
    };
  }

  private async consultarProcessoViaAPI(numeroProcesso: string): Promise<{
    sistema: string;
    resultado: ApiJusBRResponse;
  }> {
    try {
      const response = await fetch("/api/processo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ numeroProcesso }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          sistema: data.sistema,
          resultado: data.resultado,
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("Erro na consulta via API:", error);
      return {
        sistema: "N/A",
        resultado: {
          status: "ERRO",
          mensagem: "Falha na API",
          data: {
            numeroProcesso,
            erro: true,
            mensagemErro: "Falha na consulta via API",
          },
        },
      };
    }
  }

  public async processarLote(): Promise<ConsultaResponse> {
    for (let i = 0; i < this.batchSize && this.queue.length > 0; i++) {
      const numero = this.queue.shift();
      if (!numero) continue;

      // Usa a API route server-side para evitar CORS
      const { sistema, resultado } = await this.consultarProcessoViaAPI(numero);
      const apiResult = resultado;
      const tramitacao = apiResult.data?.tramitacaoAtual || {};
      const partes = tramitacao.partes || [];

      const poloAtivoArray = partes.filter((p: { polo: string }) => p.polo === "ATIVO");
      const poloPassivoArray = partes.filter((p: { polo: string }) => p.polo === "PASSIVO");

      const resultadoProcesso: ProcessoData = {
        id: this.generateId(),
        numeroProcesso: apiResult.data?.numeroProcesso || numero,
        siglaTribunal: apiResult.data?.siglaTribunal || "-",
        sistema: sistema,
        orgaoJulgador: tramitacao.distribuicao?.[0]?.orgaoJulgador?.[0]?.nome || "-",
        dataDistribuicao: tramitacao.distribuicao?.[0]?.dataHora || null,
        instancia: tramitacao.instancia || "-",
        dataUltMov: tramitacao.movimentos?.[0]?.dataHora || null,
        ativo: tramitacao.ativo !== undefined ? (tramitacao.ativo ? "Sim" : "Não") : "-",
        valorAcao: tramitacao.valorAcao || 0,
        classe: (tramitacao.classe || []).map((c: { descricao: string }) => c.descricao).join(", "),
        assunto: (tramitacao.assunto || [])
          .map((a: { descricao: string }) => a.descricao)
          .join(", "),
        poloAtivo: poloAtivoArray.map((p: { nome: string }) => p.nome).join("<br>"),
        poloPassivo: poloPassivoArray.map((p: { nome: string }) => p.nome).join("<br>"),
        documentos: (tramitacao.documentos || []).slice(0, 5),
        movimentos: (tramitacao.movimentos || []).slice(0, 5),
        status: true,
        erro: apiResult.data?.erro || false,
        mensagemErro: apiResult.data?.mensagemErro || null,
      };

      this.results.push(resultadoProcesso);
    }

    this.saveToStorage();

    return {
      total_na_fila: this.queue.length,
      total_processado: this.results.length,
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  public getResults(): ProcessoData[] {
    return this.results;
  }

  public getQueue(): string[] {
    return this.queue;
  }

  public clearResults(): void {
    this.results = [];
    this.saveToStorage();
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
  }

  public async processarProcesso(numeroProcesso: string): Promise<void> {
    this.addToQueue(numeroProcesso);
    await this.processarLote();
  }

  public async processarPlanilha(processos: string[]): Promise<void> {
    processos.forEach((processo) => this.addToQueue(processo));
    await this.processarLote();
  }
}

export default ProcessoService;
