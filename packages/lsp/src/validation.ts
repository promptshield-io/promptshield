import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import type { Connection } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { convertReportsToDiagnostics } from "./diagnostics";
import { DEFAULT_CONFIG, type LspConfig } from "./types";

/**
 * Runs PromptShield validation on a document and publishes diagnostics.
 */
export const validateDocument = async (
  document: TextDocument,
  connection: Connection,
  config: LspConfig,
): Promise<void> => {
  const text = document.getText();

  const { maxFileSize, noIgnore } = { ...DEFAULT_CONFIG, ...config };

  if (maxFileSize > 0 && text.length > maxFileSize) {
    return;
  }

  const result = scan(text);
  const { threats } = filterThreats(text, result.threats, { noIgnore });
  const diagnostics = convertReportsToDiagnostics(threats, document);

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
};
