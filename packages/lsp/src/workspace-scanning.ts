import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type {
  Connection,
  Diagnostic,
  TextDocuments,
} from "vscode-languageserver";
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
  ".ds_store",
]);

const getAllFiles = (dirPath: string, filesArray: string[] = []) => {
  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (IGNORED_NAMES.has(file.toLowerCase()) || file.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        getAllFiles(fullPath, filesArray);
      } else {
        filesArray.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Error scanning directory ${dirPath}: ${error}`);
  }
  return filesArray;
};

export const scanWorkspace = async (
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  workspaceFolders: string[],
): Promise<void> => {
  connection.console.log(
    `Scanning workspace folders: ${workspaceFolders.join(", ")}`,
  );

  let totalFiles = 0;

  for (const folderUri of workspaceFolders) {
    let folderPath: string;
    try {
      folderPath = fileURLToPath(folderUri);
    } catch {
      // Fallback or skip if not file scheme
      if (folderUri.startsWith("file://")) {
        folderPath = decodeURIComponent(folderUri.substring(7));
        // Handle windows drive letter /C:/... -> C:/...
        if (
          path.sep === "\\" &&
          folderPath.startsWith("/") &&
          folderPath[2] === ":"
        ) {
          folderPath = folderPath.substring(1);
        }
      } else {
        console.warn(`Skipping non-file URI: ${folderUri}`);
        continue;
      }
    }

    if (!fs.existsSync(folderPath)) {
      continue;
    }

    const files = getAllFiles(folderPath); // Note: getAllFiles uses sync fs, might block event loop for large repos.
    // In real large app, use async iterator or chunking. For MVP, sync is okay as per request "Keep the implementation minimal".

    for (const filePath of files) {
      // Construct URI for the file
      // Minimal URI construction matching vscode-languageserver-types
      const uri =
        path.sep === "\\"
          ? `file:///${filePath.replace(/\\/g, "/")}`
          : `file://${filePath}`;

      // Check if document is already managed (open)
      const openDoc = documents.get(uri);
      let text = "";

      if (openDoc) {
        text = openDoc.getText();
      } else {
        try {
          text = fs.readFileSync(filePath, "utf-8");
        } catch (err) {
          console.error(`Failed to read file ${filePath}: ${err}`);
          continue;
        }
      }

      const scanResult = scan(text);
      const { threats } = filterThreats(text, scanResult.threats);

      if (threats.length > 0) {
        const diagnostics = convertReportsToDiagnostics(
          threats,
          openDoc as TextDocument,
        ); // convertReportToDiagnostic doesn't use doc
        connection.sendDiagnostics({ uri, diagnostics });
        totalFiles++;
      }
    }
  }

  connection.window.showInformationMessage(
    `Workspace scan completed. Found threats in ${totalFiles} files.`,
  );
};
