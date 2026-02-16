import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import type { Connection, TextDocuments } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { convertReportsToDiagnostics } from "./diagnostics";

const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".vscode",
  "coverage",
  ".turbo",
]);

const collectFiles = (dir: string, acc: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir)) {
    if (IGNORED_NAMES.has(entry) || entry.startsWith(".")) continue;

    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      collectFiles(full, acc);
    } else {
      acc.push(full);
    }
  }

  return acc;
};

/**
 * Scan workspace folders and publish diagnostics.
 */
export const scanWorkspace = async (
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: string[],
): Promise<void> => {
  let affectedFiles = 0;

  for (const folderUri of workspaceFolders) {
    let folderPath: string;

    try {
      folderPath = fileURLToPath(folderUri);
    } catch {
      continue;
    }

    if (!fs.existsSync(folderPath)) continue;

    const files = collectFiles(folderPath);

    for (const filePath of files) {
      const uri = `file://${filePath}`;
      const openDoc = documents.get(uri);

      const text = openDoc
        ? openDoc.getText()
        : fs.readFileSync(filePath, "utf-8");

      const result = scan(text);
      const { threats } = filterThreats(text, result.threats);

      if (threats.length === 0) continue;

      const diagnostics = convertReportsToDiagnostics(
        threats,
        openDoc as TextDocument,
      );

      connection.sendDiagnostics({ uri, diagnostics });
      affectedFiles++;
    }
  }

  connection.window.showInformationMessage(
    `PromptShield: workspace scan complete (${affectedFiles} files affected).`,
  );
};
