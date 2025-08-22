"use client";

import { useState, useEffect } from "react";
import ProcessoService, { ProcessoData } from "./services/processoService";
import { ExcelUtils } from "./utils/excelUtils";
import * as XLSX from "xlsx";
import Modal from "./components/Modal";
import ActionMenu from "./components/ActionMenu";

export default function Home() {
  const [numeroProcesso, setNumeroProcesso] = useState("0001234-12.2023.8.26.0100");
  const [fileName, setFileName] = useState("");
  const [processos, setProcessos] = useState<ProcessoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);

  // Estados dos modais
  const [modalDetalhes, setModalDetalhes] = useState<{
    isOpen: boolean;
    processo: ProcessoData | null;
  }>({ isOpen: false, processo: null });
  const [modalDocumentos, setModalDocumentos] = useState<{
    isOpen: boolean;
    processo: ProcessoData | null;
  }>({ isOpen: false, processo: null });
  const [modalMovimentos, setModalMovimentos] = useState<{
    isOpen: boolean;
    processo: ProcessoData | null;
  }>({ isOpen: false, processo: null });

  // Estados para progresso em tempo real
  const [processandoPlanilha, setProcessandoPlanilha] = useState(false);
  const [progressoPlanilha, setProgressoPlanilha] = useState({ atual: 0, total: 0 });
  const [processosEmProcessamento, setProcessosEmProcessamento] = useState<ProcessoData[]>([]);

  // Estados para ordenação da tabela
  const [ordenacao, setOrdenacao] = useState<{
    campo: keyof ProcessoData | null;
    direcao: "asc" | "desc";
  }>({ campo: null, direcao: "asc" });

  const processoService = ProcessoService.getInstance();

  useEffect(() => {
    const savedResults = processoService.getResults();
    if (savedResults.length > 0) {
      setProcessos(savedResults);
    }
  }, [processoService]);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setShowMessage(true);

    // Aplica estilos diferentes baseado no tipo
    if (type === "error") {
      // Para erros, pode-se adicionar estilos específicos ou lógica adicional
      console.warn("Erro:", msg);
    }

    setTimeout(() => setShowMessage(false), 5000);
  };

  // Função para ordenar processos
  const ordenarProcessos = (campo: keyof ProcessoData) => {
    setOrdenacao((prev) => {
      const novaDirecao = prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc";
      return { campo, direcao: novaDirecao };
    });
  };

  // Função para obter processos ordenados
  const getProcessosOrdenados = () => {
    const processosParaOrdenar = processandoPlanilha ? processosEmProcessamento : processos;

    if (!ordenacao.campo) return processosParaOrdenar;

    return [...processosParaOrdenar].sort((a, b) => {
      const campo = ordenacao.campo as keyof ProcessoData;
      const valorA = a[campo];
      const valorB = b[campo];

      // Trata valores nulos/undefined
      if (valorA === null || valorA === undefined) return 1;
      if (valorB === null || valorB === undefined) return -1;

      // Trata strings
      if (typeof valorA === "string" && typeof valorB === "string") {
        const comparacao = valorA.localeCompare(valorB, "pt-BR");
        return ordenacao.direcao === "asc" ? comparacao : -comparacao;
      }

      // Trata números
      if (typeof valorA === "number" && typeof valorB === "number") {
        return ordenacao.direcao === "asc" ? valorA - valorB : valorB - valorA;
      }

      // Trata booleanos
      if (typeof valorA === "boolean" && typeof valorB === "boolean") {
        const comparacao = valorA === valorB ? 0 : valorA ? 1 : -1;
        return ordenacao.direcao === "asc" ? comparacao : -comparacao;
      }

      // Trata arrays (documentos e movimentos)
      if (Array.isArray(valorA) && Array.isArray(valorB)) {
        const comparacao = valorA.length - valorB.length;
        return ordenacao.direcao === "asc" ? comparacao : -comparacao;
      }

      return 0;
    });
  };

  // Componente para cabeçalho da tabela com ordenação
  const TableHeader = ({
    campo,
    children,
  }: {
    campo: keyof ProcessoData;
    children: React.ReactNode;
  }) => {
    const isOrdenado = ordenacao.campo === campo;
    const isAsc = ordenacao.direcao === "asc";

    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
        onClick={() => ordenarProcessos(campo)}
      >
        <div className="flex items-center justify-between">
          {children}
          <div className="flex flex-col">
            <svg
              className={`w-3 h-3 ${isOrdenado && isAsc ? "text-blue-600" : "text-gray-400"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className={`w-3 h-3 ${isOrdenado && !isAsc ? "text-blue-600" : "text-gray-400"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </th>
    );
  };

  // Funções para abrir modais
  const handleShowDetalhes = (processo: ProcessoData) => {
    setModalDetalhes({ isOpen: true, processo });
  };

  const handleShowDocumentos = (processo: ProcessoData) => {
    setModalDocumentos({ isOpen: true, processo });
  };

  const handleShowMovimentos = (processo: ProcessoData) => {
    setModalMovimentos({ isOpen: true, processo });
  };

  // Funções para fechar modais
  const closeModalDetalhes = () => setModalDetalhes({ isOpen: false, processo: null });
  const closeModalDocumentos = () => setModalDocumentos({ isOpen: false, processo: null });
  const closeModalMovimentos = () => setModalMovimentos({ isOpen: false, processo: null });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações do arquivo
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      showNotification("Por favor, selecione um arquivo Excel (.xlsx ou .xls)", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      showNotification("Arquivo muito grande. Máximo 10MB.", "error");
      return;
    }

    try {
      setLoading(true);
      setMessage("Processando planilha...");
      setShowMessage(true);

      // Processa a planilha para extrair números de processos
      const processos = await ExcelUtils.processarArquivo(file);

      if (processos.length === 0) {
        showNotification("Nenhum número de processo válido encontrado na planilha.", "error");
        return;
      }

      if (processos.length > 1000) {
        showNotification("Planilha muito grande. Máximo 1000 processos por vez.", "error");
        return;
      }

      setFileName(file.name);
      setMessage(`Encontrados ${processos.length} processos na planilha. Iniciando consultas...`);

      // Inicia processamento em lote com progresso
      setProcessandoPlanilha(true);
      setProgressoPlanilha({ atual: 0, total: processos.length });
      setProcessosEmProcessamento([]);

      // Array local para acumular resultados
      const resultadosAcumulados: ProcessoData[] = [];

      // Processa cada processo individualmente com progresso
      for (let i = 0; i < processos.length; i++) {
        const numeroProcesso = processos[i];

        try {
          // Atualiza progresso
          setProgressoPlanilha((prev) => ({ ...prev, atual: i + 1 }));
          setMessage(`Processando processo ${i + 1} de ${processos.length}: ${numeroProcesso}`);

          // Consulta o processo
          await processoService.processarProcesso(numeroProcesso);

          // Obtém os resultados atualizados
          const resultadosAtualizados = processoService.getResults();
          const ultimoResultado = resultadosAtualizados[resultadosAtualizados.length - 1];

          if (ultimoResultado) {
            resultadosAcumulados.push(ultimoResultado);
            // Atualiza a interface com os resultados acumulados
            setProcessosEmProcessamento([...resultadosAcumulados]);
          }

          // Pequena pausa para não sobrecarregar as APIs
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Erro ao processar processo ${numeroProcesso}:`, error);
          // Adiciona processo com erro
          const processoComErro: ProcessoData = {
            id: `erro_${Date.now()}_${i}`,
            numeroProcesso,
            siglaTribunal: "",
            sistema: "",
            orgaoJulgador: "",
            dataDistribuicao: null,
            instancia: "",
            dataUltMov: null,
            ativo: "",
            valorAcao: 0,
            classe: "",
            assunto: "",
            poloAtivo: "",
            poloPassivo: "",
            documentos: [],
            movimentos: [],
            status: false,
            erro: true,
            mensagemErro: "Erro ao processar processo",
          };
          resultadosAcumulados.push(processoComErro);
          setProcessosEmProcessamento([...resultadosAcumulados]);
        }
      }

      // Finaliza processamento
      setProcessandoPlanilha(false);
      setMessage(`Processamento concluído! ${resultadosAcumulados.length} processos consultados.`);

      // Atualiza a lista de processos e salva no localStorage
      setProcessos(resultadosAcumulados);
      processoService.clearResults();
      resultadosAcumulados.forEach((processo) => {
        processoService.addToQueue(processo.numeroProcesso);
      });

      showNotification(
        `Planilha processada com sucesso! ${resultadosAcumulados.length} processos consultados.`
      );
    } catch (error) {
      console.error("Erro ao processar planilha:", error);
      showNotification("Erro ao processar planilha.", "error");
      setProcessandoPlanilha(false);
    } finally {
      setLoading(false);
      setShowMessage(false);
    }
  };

  const handleSearch = async () => {
    if (!numeroProcesso.trim()) {
      showNotification("Digite um número de processo válido.", "error");
      return;
    }

    // Valida se o número tem pelo menos 10 dígitos
    const numeroLimpo = numeroProcesso.replace(/\D/g, "");
    if (numeroLimpo.length < 10) {
      showNotification("Número de processo deve ter pelo menos 10 dígitos.", "error");
      return;
    }

    try {
      setLoading(true);
      showNotification("Consultando processo...");

      await processoService.processarProcesso(numeroProcesso.trim());

      // Atualiza a lista
      setProcessos(processoService.getResults());

      showNotification("Processo consultado com sucesso!");
    } catch (error) {
      console.error("Erro na consulta:", error);
      showNotification("Erro ao consultar processo.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (processos.length === 0) {
      showNotification("Nenhum resultado para exportar.", "error");
      return;
    }

    try {
      // Cria dados para exportação com formatação completa
      const dadosExportacao = processos.map((p) => {
        // Formata movimentos
        const movimentosFormatados: string[] = [];
        if (p.movimentos && p.movimentos.length > 0) {
          p.movimentos.forEach((mov: { dataHora: string; descricao: string }) => {
            try {
              const dataHora = new Date(mov.dataHora);
              const dataFormatada =
                dataHora.toLocaleDateString("pt-BR") +
                " " +
                dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              movimentosFormatados.push(dataFormatada + ": " + (mov.descricao || "N/A"));
            } catch {
              movimentosFormatados.push("Data inválida: " + (mov.descricao || "N/A"));
            }
          });
        }
        const movimentosString = movimentosFormatados.join("; ");

        // Formata documentos
        const documentosFormatados: string[] = [];
        if (p.documentos && p.documentos.length > 0) {
          p.documentos.forEach((doc: { dataHoraJuntada: string; tipo?: { nome: string } }) => {
            try {
              const dataHora = new Date(doc.dataHoraJuntada);
              const dataFormatada =
                dataHora.toLocaleDateString("pt-BR") +
                " " +
                dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              documentosFormatados.push(dataFormatada + ": " + (doc.tipo?.nome || "N/A"));
            } catch {
              documentosFormatados.push("Data inválida: " + (doc.tipo?.nome || "N/A"));
            }
          });
        }
        const documentosString = documentosFormatados.join("; ");

        // Remove tags HTML dos polos
        const poloAtivoLimpo = p.poloAtivo.replace(/<br>/g, "; ").replace(/<[^>]*>/g, "") || "-";
        const poloPassivoLimpo =
          p.poloPassivo.replace(/<br>/g, "; ").replace(/<[^>]*>/g, "") || "-";

        // Formata datas para formato brasileiro
        const dataUltMovFormatada = p.dataUltMov
          ? new Date(p.dataUltMov).toLocaleDateString("pt-BR")
          : "";
        const dataDistribuicaoFormatada = p.dataDistribuicao
          ? new Date(p.dataDistribuicao).toLocaleDateString("pt-BR")
          : "";

        return {
          "Nº Processo": p.numeroProcesso,
          Tribunal: p.siglaTribunal,
          "Órgão julgador": p.orgaoJulgador,
          Instância: p.instancia,
          "Data Últ. mov.": dataUltMovFormatada,
          "Data distribuição": dataDistribuicaoFormatada,
          Ativo: p.ativo,
          "Valor Ação": p.valorAcao,
          Classe: p.classe,
          Assunto: p.assunto,
          Sistema: p.sistema,
          "Polo Ativo": poloAtivoLimpo,
          "Polo Passivo": poloPassivoLimpo,
          Movimentos: movimentosString,
          Documentos: documentosString,
          Status: p.status ? "Sucesso" : "Erro",
        };
      });

      // Cria workbook
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resultados");

      // Exporta arquivo com nome no formato do PHP
      const dataAtual = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `consulta_jusbr_${dataAtual}.xlsx`);

      showNotification("Arquivo exportado com sucesso!");
    } catch (error) {
      console.error("Erro na exportação:", error);
      showNotification("Erro ao exportar arquivo.", "error");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateString;
    }
  };

  const clearResults = () => {
    processoService.clearResults();
    setProcessos([]);
    showNotification("Resultados limpos com sucesso!");
  };

  const clearQueue = () => {
    processoService.clearQueue();
    showNotification("Fila limpa com sucesso!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-1 bg-blue-800"></div>

      {/* Main Content */}
      <div className="ml-1 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-800 mb-6">
            JusBR <span className="text-gray-400">→</span>{" "}
            <span className="text-gray-600">Consulta</span>
          </h1>

          {/* Search Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Process Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do processo
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Digite o número do processo"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Excel Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ou envie uma Planilha (.xlsx) - máx. 500 linhas
                </label>
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Formato:</strong> Números de processos devem estar na primeira coluna (sem
                  cabeçalho)
                </div>
                <div className="bg-gray-50 p-3 rounded-md mb-3 text-xs text-gray-600">
                  <div className="font-medium mb-1">Exemplo de formato:</div>
                  <div className="font-mono">
                    A1: 0001234-12.2023.8.26.0100
                    <br />
                    A2: 0005678-90.2022.8.26.0100
                    <br />
                    A3: 0009012-34.2021.8.26.0100
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={loading}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer border border-gray-300 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Processando..." : "Escolher ficheiro"}
                  </label>
                  <span className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 rounded-md border border-gray-300">
                    {fileName}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Progresso */}
            {processandoPlanilha && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Processando planilha...</span>
                  <span className="text-sm text-gray-500">
                    {progressoPlanilha.atual} de {progressoPlanilha.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(progressoPlanilha.atual / progressoPlanilha.total) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">{message}</p>
              </div>
            )}

            {/* Lista de Processos em Processamento */}
            {processosEmProcessamento.length > 0 && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Processos Processados ({processosEmProcessamento.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {processosEmProcessamento.map((processo) => (
                    <div key={processo.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{processo.numeroProcesso}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          processo.erro ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {processo.erro ? "Erro" : "Sucesso"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={clearResults}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm"
                >
                  Limpar Resultados
                </button>
                <button
                  onClick={clearQueue}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 text-sm"
                >
                  Limpar Fila
                </button>
                {ordenacao.campo && (
                  <button
                    onClick={() => setOrdenacao({ campo: null, direcao: "asc" })}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
                  >
                    Limpar Ordenação
                  </button>
                )}
              </div>

              <button
                onClick={handleExport}
                disabled={processos.length === 0 || loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Exportar resultados (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* Status Info */}
        {processos.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="text-blue-800">
                <span className="font-medium">Total de processos:</span> {processos.length}
              </div>
              <div className="text-blue-800">
                <span className="font-medium">Processos na fila:</span>{" "}
                {processoService.getQueue().length}
              </div>
              {ordenacao.campo && (
                <div className="text-blue-800">
                  <span className="font-medium">Ordenado por:</span>{" "}
                  {ordenacao.campo === "numeroProcesso" && "N° Processo"}
                  {ordenacao.campo === "siglaTribunal" && "Tribunal"}
                  {ordenacao.campo === "sistema" && "Sistema"}
                  {ordenacao.campo === "orgaoJulgador" && "Órgão Julgador"}
                  {ordenacao.campo === "dataDistribuicao" && "Data Distribuição"}
                  {ordenacao.campo === "instancia" && "Instância"}
                  {ordenacao.campo === "dataUltMov" && "Data Último Movimento"}
                  {ordenacao.campo === "ativo" && "Ativo"}
                  {ordenacao.campo === "valorAcao" && "Valor Ação"}
                  {ordenacao.campo === "classe" && "Classe"}
                  {ordenacao.campo === "assunto" && "Assunto"}
                  {ordenacao.campo === "poloAtivo" && "Polo Ativo"}
                  {ordenacao.campo === "poloPassivo" && "Polo Passivo"}{" "}
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      ordenacao.direcao === "asc"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {ordenacao.direcao === "asc" ? "↑ Crescente" : "↓ Decrescente"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader campo="numeroProcesso">N° Processo</TableHeader>
                  <TableHeader campo="siglaTribunal">Tribunal</TableHeader>
                  <TableHeader campo="sistema">Sistema</TableHeader>
                  <TableHeader campo="orgaoJulgador">Órgão Julgador</TableHeader>
                  <TableHeader campo="dataDistribuicao">Data Distribuição</TableHeader>
                  <TableHeader campo="instancia">Instância</TableHeader>
                  <TableHeader campo="dataUltMov">Data Último Movimento</TableHeader>
                  <TableHeader campo="ativo">Ativo</TableHeader>
                  <TableHeader campo="valorAcao">Valor Ação</TableHeader>
                  <TableHeader campo="classe">Classe</TableHeader>
                  <TableHeader campo="assunto">Assunto</TableHeader>
                  <TableHeader campo="poloAtivo">Polo Ativo</TableHeader>
                  <TableHeader campo="poloPassivo">Polo Passivo</TableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getProcessosOrdenados().length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                      {processandoPlanilha
                        ? "Processando planilha... Aguarde os resultados aparecerem aqui."
                        : "Nenhum processo consultado ainda. Use o campo de pesquisa ou envie uma planilha."}
                    </td>
                  </tr>
                ) : (
                  getProcessosOrdenados().map((processo) => (
                    <tr key={processo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.numeroProcesso}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.siglaTribunal}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.sistema}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.orgaoJulgador}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.dataDistribuicao ? formatDate(processo.dataDistribuicao) : "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.instancia}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.dataUltMov ? formatDate(processo.dataUltMov) : "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.ativo}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(processo.valorAcao)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.classe}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {processo.assunto}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div dangerouslySetInnerHTML={{ __html: processo.poloAtivo || "-" }} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div dangerouslySetInnerHTML={{ __html: processo.poloPassivo || "-" }} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            processo.erro
                              ? "bg-red-100 text-red-800"
                              : processo.status
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {processo.erro ? "Erro" : processo.status ? "Sucesso" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <ActionMenu
                          processo={processo}
                          onShowDetalhes={handleShowDetalhes}
                          onShowDocumentos={handleShowDocumentos}
                          onShowMovimentos={handleShowMovimentos}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {processos.length > 0 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center">
                <label className="text-sm text-gray-700 mr-2">Itens</label>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
              <div className="text-sm text-gray-700">
                Mostrando {processos.length} de {processos.length} resultados
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}

      {/* Modal Detalhes */}
      <Modal
        isOpen={modalDetalhes.isOpen}
        onClose={closeModalDetalhes}
        title="Detalhes do Processo"
      >
        {modalDetalhes.processo && (
          <div className="space-y-4">
            <div>
              <dt className="font-semibold text-gray-700 mb-1">Assunto</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                {modalDetalhes.processo.assunto || "Não informado"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-gray-700 mb-1">Sistema</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                {modalDetalhes.processo.sistema || "Não informado"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-gray-700 mb-1">Polo Ativo</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                <div
                  dangerouslySetInnerHTML={{
                    __html: modalDetalhes.processo.poloAtivo || "Não informado",
                  }}
                />
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-gray-700 mb-1">Polo Passivo</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                <div
                  dangerouslySetInnerHTML={{
                    __html: modalDetalhes.processo.poloPassivo || "Não informado",
                  }}
                />
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-gray-700 mb-1">Processo Ativo</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                {modalDetalhes.processo.ativo || "Não informado"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-gray-700 mb-1">Última Movimentação</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                {formatDate(modalDetalhes.processo.dataUltMov) || "Não informado"}
              </dd>
            </div>

            <div>
              <dt className="font-semibold text-gray-700 mb-1">Data Distribuição</dt>
              <dd className="ml-4 pl-4 border-l-2 border-gray-200 text-gray-900">
                {formatDate(modalDetalhes.processo.dataDistribuicao) || "Não informado"}
              </dd>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Documentos */}
      <Modal
        isOpen={modalDocumentos.isOpen}
        onClose={closeModalDocumentos}
        title="Últimos 5 Documentos"
      >
        {modalDocumentos.processo && (
          <ul className="space-y-2">
            {modalDocumentos.processo.documentos &&
            modalDocumentos.processo.documentos.length > 0 ? (
              modalDocumentos.processo.documentos.map(
                (doc: { tipo?: { nome: string }; dataHoraJuntada: string }, index: number) => (
                  <li key={index} className="py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-900">
                        {doc.tipo?.nome || "Tipo não especificado"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(doc.dataHoraJuntada)}
                      </span>
                    </div>
                  </li>
                )
              )
            ) : (
              <li className="text-gray-500">Nenhum documento encontrado.</li>
            )}
          </ul>
        )}
      </Modal>

      {/* Modal Movimentos */}
      <Modal
        isOpen={modalMovimentos.isOpen}
        onClose={closeModalMovimentos}
        title="Últimos 5 Movimentos"
      >
        {modalMovimentos.processo && (
          <ul className="space-y-2">
            {modalMovimentos.processo.movimentos &&
            modalMovimentos.processo.movimentos.length > 0 ? (
              modalMovimentos.processo.movimentos.map(
                (mov: { descricao: string; dataHora: string }, index: number) => (
                  <li key={index} className="py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-900">{mov.descricao}</span>
                      <span className="text-sm text-gray-500 ml-4">{formatDate(mov.dataHora)}</span>
                    </div>
                  </li>
                )
              )
            ) : (
              <li className="text-gray-500">Nenhum movimento encontrado.</li>
            )}
          </ul>
        )}
      </Modal>

      {/* Notification */}
      {showMessage && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            message.includes("Erro") ? "bg-red-500 text-white" : "bg-green-500 text-white"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
