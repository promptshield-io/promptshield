import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import {
  type Connection,
  DiagnosticSeverity,
  DiagnosticTag,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { SOURCE, UNUSED_DIRECTIVE_CODE } from "./constants";
import { convertReportsToDiagnostics } from "./diagnostics";
import { DEFAULT_CONFIG, type LspConfig } from "./types";

/**
 * Runs PromptShield validation on a document and publishes diagnostics.
 *
 * Execution Model:
 * - Operates purely on in-memory document text.
 * - Does not use persistent workspace cache.
 * - Designed for low-latency LSP validation.
 *
 * Features:
 * - Applies inline ignore filtering (unless disabled).
 * - Respects `minSeverity`.
 * - Reports unused ignore directives as warnings.
 */
export const validateDocument = async (
  document: TextDocument,
  connection: Connection,
  config: LspConfig,
): Promise<void> => {
  const text = document.getText();

  const { maxFileSize, noInlineIgnore, minSeverity } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  if (maxFileSize > 0 && text.length > maxFileSize) {
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    return;
  }

  const { threats } = scan(text, { minSeverity });
  const result = filterThreats(text, threats, {
    noInlineIgnore,
  });

  // Threat diagnostics
  const threatDiagnostics = convertReportsToDiagnostics(result.threats);

  // Unused ignore diagnostics
  const unusedIgnoreDiagnostics = result.unusedIgnores?.map((range) => ({
    range: range.definedAt,
    severity: DiagnosticSeverity.Warning,
    tags: [DiagnosticTag.Unnecessary],
    message: "Unused promptshield-ignore directive",
    code: UNUSED_DIRECTIVE_CODE,
    source: SOURCE,
  }));

  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics: [...threatDiagnostics, ...unusedIgnoreDiagnostics],
  });
};
