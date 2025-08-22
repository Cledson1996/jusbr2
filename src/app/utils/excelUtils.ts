import * as XLSX from "xlsx";

export interface ExcelRow {
  numeroProcesso?: string;
  [key: string]: unknown;
}

export class ExcelUtils {
  static async processarArquivo(file: File): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Pega a primeira planilha
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Converte para JSON sem cabeçalho (header: 1 significa que não há cabeçalho)
          const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Extrai números de processos da primeira coluna
          const processos: string[] = [];

          jsonData.forEach((row: unknown[]) => {
            // Pega o primeiro valor de cada linha (primeira coluna)
            const numeroProcesso = row[0];

            if (numeroProcesso) {
              // Limpa o número do processo
              const numeroLimpo = this.limparNumeroProcesso(numeroProcesso.toString());
              if (numeroLimpo && numeroLimpo.length >= 10) {
                processos.push(numeroLimpo);
              }
            }
          });

          // Remove duplicatas
          const processosUnicos = [...new Set(processos)];

          resolve(processosUnicos);
        } catch {
          reject(new Error("Erro ao processar arquivo Excel"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  static limparNumeroProcesso(numero: string): string {
    // Remove caracteres especiais e espaços, mantém apenas números
    return numero.replace(/[^\d]/g, "");
  }

  static validarNumeroProcesso(numero: string): boolean {
    const numeroLimpo = this.limparNumeroProcesso(numero);
    // Verifica se tem pelo menos 10 dígitos (formato básico de processo)
    return numeroLimpo.length >= 10;
  }

  static formatarNumeroProcesso(numero: string): string {
    const numeroLimpo = this.limparNumeroProcesso(numero);

    if (numeroLimpo.length === 20) {
      // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
      return `${numeroLimpo.substring(0, 7)}-${numeroLimpo.substring(7, 9)}.${numeroLimpo.substring(
        9,
        13
      )}.${numeroLimpo.substring(13, 14)}.${numeroLimpo.substring(14, 16)}.${numeroLimpo.substring(
        16,
        20
      )}`;
    } else if (numeroLimpo.length >= 10) {
      // Formato antigo ou incompleto
      return numeroLimpo;
    }

    return numero;
  }
}
