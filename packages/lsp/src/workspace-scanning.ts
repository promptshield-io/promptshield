import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scan, type ThreatReport } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import { resolveFiles } from "@promptshield/workspace";
import type { Connection, TextDocuments } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { CacheManager } from "./cache";
import { convertReportsToDiagnostics } from "./diagnostics";
import type { LspConfig } from "./types";

let cacheManager: CacheManager | null = null;

/**
 * Scan workspace folders and publish diagnostics.
 */
export const scanWorkspace = async (
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  workspaceRoot: string,
  options: LspConfig & { force?: boolean },
): Promise<void> => {
  if (!workspaceRoot) return;

  const { force = false, ...config } = options;
  const noIgnore = config.noIgnore ?? false;

  const rootPath = fileURLToPath(workspaceRoot);

  if (!cacheManager) {
    try {
      cacheManager = new CacheManager(rootPath);
      await cacheManager.load();
    } catch {
      // Ignore invalid URL
    }
  }

  if (force && cacheManager) {
    await cacheManager.clear();
  }

  let totalFiles = 0;
  let scannedFiles = 0;
  let threatsFound = 0;

  const allFiles = await resolveFiles([], rootPath);
  const allThreats: { uri: string; threats: ThreatReport[] }[] = [];

  totalFiles = allFiles.length;

  // Report progress
  const progressReporter = await connection.window.createWorkDoneProgress();
  progressReporter.begin(
    "PromptShield: Scanning Workspace",
    0,
    "Initializing...",
    true,
  );

  for (const filePath of allFiles) {
    if (progressReporter.token.isCancellationRequested) {
      break;
    }

    const cacheKey = path.relative(rootPath, filePath).replace(/\\/g, "/");

    scannedFiles++;
    const percentage = Math.round((scannedFiles / totalFiles) * 100);
    progressReporter.report(percentage, `Scanning ${path.basename(filePath)}`);

    let threats: ThreatReport[] | null = null;

    // Check cache
    if (cacheManager && !force) {
      threats = await cacheManager.get(cacheKey);
    }

    // If not in cache, scan
    if (threats === null) {
      try {
        const text = fs.readFileSync(filePath, "utf-8");
        const result = scan(text);

        threats = result.threats;
        if (cacheManager) {
          await cacheManager.set(cacheKey, threats);
        }
      } catch (e) {
        console.error(`Failed to scan file ${filePath}:`, e);
        continue;
      }
    }

    let finalThreats: ThreatReport[] = [];
    if (threats.length > 0) {
      try {
        const text = fs.readFileSync(filePath, "utf-8");
        const filterResult = filterThreats(text, threats, { noIgnore });
        finalThreats = filterResult.threats;
      } catch {
        // File might be deleted mid-scan
        finalThreats = [];
      }
    }

    if (finalThreats.length > 0) {
      threatsFound += finalThreats.length;
      allThreats.push({
        uri: cacheKey,
        threats: finalThreats,
      });
    }

    if (finalThreats.length > 0 || threats?.length > 0) {
      const uri = pathToFileURL(filePath).toString();
      const openDoc = documents.get(uri);
      const diagnostics = convertReportsToDiagnostics(finalThreats, openDoc);
      connection.sendDiagnostics({ uri, diagnostics });
    }
  }

  progressReporter.done();

  // Generate Report
  if (allThreats.length > 0) {
    try {
      // rootPath is already defined at top of function
      const reportPath = path.join(rootPath, "promptshield.report.md");

      let md = `# 🛡️ PromptShield Workspace Report\n\n`;
      md += `**Date:** ${new Date().toLocaleString()}\n`;
      md += `**Total Threats:** ${threatsFound}\n`;
      md += `**Files Affected:** ${allThreats.length}\n\n`;
      md += `---\n\n`;

      for (const ft of allThreats) {
        const fileUri = pathToFileURL(path.join(rootPath, ft.uri)).toString();
        md += `## 📄 [${ft.uri}](${fileUri})\n\n`;

        // Group by line
        const threatsByLine = new Map<number, ThreatReport[]>();
        for (const t of ft.threats) {
          if (!threatsByLine.has(t.loc.line)) {
            threatsByLine.set(t.loc.line, []);
          }
          threatsByLine.get(t.loc.line)?.push(t);
        }

        for (const [line, threats] of threatsByLine) {
          md += `- **Line ${line}:**\n`;
          for (const t of threats) {
            const icon =
              t.severity === "CRITICAL"
                ? "🔴"
                : t.severity === "HIGH"
                  ? "🟠"
                  : "🟡";
            md += `  - ${icon} **${t.category}** (${t.severity}): ${t.message}`;
            if (t.readableLabel) {
              md += ` (Hidden: \`${t.readableLabel}\`)`;
            }
            md += `\n`;
          }
        }
        md += `\n`;
      }

      fs.writeFileSync(reportPath, md, "utf-8");

      connection.window.showInformationMessage(
        `PromptShield: Report generated at ${reportPath}`,
      );

      // Ask client to open it?
      // We can send a request or notification ideally, but showInformationMessage is basic feedback.
    } catch (e) {
      console.error("Failed to generate report:", e);
    }
  }

  connection.window.showInformationMessage(
    `PromptShield: Scan complete. ${threatsFound} threats found in ${scannedFiles} files.`,
  );
};
