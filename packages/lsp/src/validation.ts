import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import type { Connection } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { convertReportsToDiagnostics } from "./diagnostics";
import type { LspConfig } from "./types";

export const validateDocument = async (
  document: TextDocument,
  connection: Connection,
  _config: LspConfig,
): Promise<void> => {
  const text = document.getText();

  // 1. Scan
  const result = scan(text);

  // 2. Filter ignores
  const { threats } = filterThreats(text, result.threats);

  // 3. Convert to diagnostics
  const diagnostics = convertReportsToDiagnostics(threats, document);

  // 4. Send
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
};
