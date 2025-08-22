"use client";

import { useState, useEffect } from "react";
import ProcessoService, { ProcessoData } from "./services/processoService";
import { ExcelUtils } from "./utils/excelUtils";
import * as XLSX from "xlsx";

export default function Home() {
  const [numeroProcesso, setNumeroProcesso] = useState("0001234-12.2023.8.26.0100");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("Nenhum ficheiro selecionado");
  const [processos, setProcessos] = useState<ProcessoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);

  const processoService = ProcessoService.getInstance();

  useEffect(() => {
    // Carrega dados salvos do localStorage
    const savedResults = processoService.getResults();
    if (savedResults.length > 0) {
      setProcessos(savedResults);
    }
  }, []);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 5000);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        showNotification("Arquivo muito grande. Máximo 5MB.", "error");
        return;
      }

      setSelectedFile(file);
      setFileName(file.name);

      try {
        setLoading(true);
        showNotification("Processando arquivo Excel...");

        const processosExtraidos = await ExcelUtils.processarArquivo(file);

        if (processosExtraidos.length === 0) {
          showNotification(
            "Nenhum número de processo encontrado no arquivo. Certifique-se de que os números estão na primeira coluna.",
            "error"
          );
          return;
        }

        if (processosExtraidos.length > 500) {
          showNotification("Arquivo contém mais de 500 linhas. Máximo permitido: 500.", "error");
          return;
        }

        showNotification(
          `${processosExtraidos.length} processos encontrados na primeira coluna. Iniciando consulta...`
        );

        // Processa os processos em lote
        await processoService.processarPlanilha(processosExtraidos);

        // Atualiza a lista
        setProcessos(processoService.getResults());

        showNotification(
          `Processos processados com sucesso! ${processosExtraidos.length} processos consultados.`
        );
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        showNotification(
          "Erro ao processar arquivo Excel. Verifique se o arquivo está no formato correto.",
          "error"
        );
      } finally {
        setLoading(false);
      }
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
      // Cria dados para exportação
      const dadosExportacao = processos.map((p) => ({
        "Número do Processo": p.numeroProcesso,
        Tribunal: p.siglaTribunal,
        Sistema: p.sistema,
        "Órgão Julgador": p.orgaoJulgador,
        "Data Distribuição": p.dataDistribuicao,
        Instância: p.instancia,
        "Data Último Movimento": p.dataUltMov,
        Ativo: p.ativo,
        "Valor Ação": p.valorAcao,
        Classe: p.classe,
        Assunto: p.assunto,
        "Polo Ativo": p.poloAtivo.replace(/<br>/g, "; "),
        "Polo Passivo": p.poloPassivo.replace(/<br>/g, "; "),
        Status: p.status ? "Sucesso" : "Erro",
        "Mensagem Erro": p.mensagemErro || "",
      }));

      // Cria workbook
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Processos");

      // Exporta arquivo
      XLSX.writeFile(wb, `processos_jusbr_${new Date().toISOString().split("T")[0]}.xlsx`);

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
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      N° Processo
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Tribunal
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Sistema
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Órgão julgador
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Instância
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Valor Ação
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Classe
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Assunto
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Polo Ativo
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center justify-between">
                      Polo Passivo
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processos.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      Nenhum processo consultado ainda. Use o campo de pesquisa ou envie uma
                      planilha.
                    </td>
                  </tr>
                ) : (
                  processos.map((processo) => (
                    <tr key={processo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {processo.numeroProcesso}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {processo.siglaTribunal}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {processo.sistema}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {processo.orgaoJulgador}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {processo.instancia}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {formatCurrency(processo.valorAcao)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {processo.classe}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {processo.assunto}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        <div dangerouslySetInnerHTML={{ __html: processo.poloAtivo }} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        <div dangerouslySetInnerHTML={{ __html: processo.poloPassivo }} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
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
              <div className="flex items-center justify-between">
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
            </div>
          )}
        </div>
      </div>

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
