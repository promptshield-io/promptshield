import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ThreatReport } from "@promptshield/core";
import {
  generateWorkspaceReport,
  scanAndFixWorkspace,
  scanWorkspace,
} from "@promptshield/workspace";
import type { Connection } from "vscode-languageserver";
import { DiagnosticSeverity, DiagnosticTag } from "vscode-languageserver";
import {
  NOTIFY_SCAN_COMPLETED,
  SOURCE,
  UNUSED_DIRECTIVE_CODE,
} from "./constants";
import { convertReportsToDiagnostics } from "./diagnostics";
import type { LspConfig } from "./types";

/**
 * Scans the entire workspace and publishes LSP diagnostics.
 *
 * Responsibilities:
 * - Delegates scanning to `@promptshield/workspace`
 * - Streams progress updates to the client
 * - Publishes diagnostics per file
 * - Generates a workspace-level Markdown report
 * - Notifies client when scanning completes
 *
 * Architectural boundary:
 * - Workspace package handles file resolution, caching, concurrency, and filtering.
 * - LSP layer is strictly responsible for editor integration.
 *
 * @param connection Active LSP connection.
 * @param workspaceRoot Workspace root URI (file://).
 * @param options Scan configuration derived from user settings.
 *
 * @remarks
 * - Respects `minSeverity`, `noInlineIgnore`, and `cacheMode`.
 * - Supports forced full scan via `force`.
 * - Cancellation is honored via work-done progress token.
 */
export const handleWorkspaceScan = async (
  connection: Connection,
  workspaceRoot: string,
  options: LspConfig & { force?: boolean },
): Promise<void> => {
  if (!workspaceRoot) return;

  const rootPath = fileURLToPath(workspaceRoot);
  const { force = false, minSeverity, noInlineIgnore, cacheMode } = options;

  let threatsFound = 0;
  let scannedFiles = 0;

  const progress = await connection.window.createWorkDoneProgress();

  progress.begin(
    "PromptShield: Scanning Workspace",
    0,
    "Initializing...",
    true,
  );

  const allThreats: {
    uri: string;
    threats: ThreatReport[];
  }[] = [];

  for await (const event of scanWorkspace([], rootPath, {
    forceFullScan: force,
    minSeverity,
    noInlineIgnore,
    cacheMode,
  })) {
    if (progress.token.isCancellationRequested) break;

    scannedFiles++;
    progress.report(event.progress, `Scanning ${event.name}`);

    const filePath = path.join(rootPath, event.path);
    const uri = pathToFileURL(filePath).toString();

    const diagnostics = convertReportsToDiagnostics(event.result.threats);

    const unusedIgnoreDiagnostics =
      event.result.unusedIgnores?.map((range) => ({
        range: range.definedAt,
        severity: DiagnosticSeverity.Warning,
        tags: [DiagnosticTag.Unnecessary],
        message: "Unused promptshield-ignore directive",
        code: UNUSED_DIRECTIVE_CODE,
        source: SOURCE,
      })) || [];

    connection.sendDiagnostics({
      uri,
      diagnostics: [...diagnostics, ...unusedIgnoreDiagnostics],
    });

    if (event.result.threats.length > 0) {
      threatsFound += event.result.threats.length;

      allThreats.push({
        uri: event.path,
        threats: event.result.threats,
      });
    }
  }

  progress.done();

  connection.sendNotification(NOTIFY_SCAN_COMPLETED);

  await generateWorkspaceReport(rootPath, allThreats, threatsFound);

  connection.window.showInformationMessage(
    `PromptShield: Scan complete. ${threatsFound} threats found in ${scannedFiles} files.`,
  );
};

/**
 * Scans the entire workspace and automatically applies fixes to files.
 */
export const handleWorkspaceFix = async (
  connection: Connection,
  workspaceRoot: string,
  options: LspConfig & { force?: boolean },
): Promise<void> => {
  if (!workspaceRoot) return;

  const rootPath = fileURLToPath(workspaceRoot);
  const { force = false, minSeverity, noInlineIgnore, cacheMode } = options;

  let threatsFound = 0;
  let threatsFixed = 0;
  let scannedFiles = 0;

  const progress = await connection.window.createWorkDoneProgress();

  progress.begin("PromptShield: Fixing Workspace", 0, "Initializing...", true);

  const allThreats: {
    uri: string;
    threats: ThreatReport[];
  }[] = [];

  for await (const event of scanAndFixWorkspace([], rootPath, {
    forceFullScan: force,
    minSeverity,
    noInlineIgnore,
    cacheMode,
    write: true,
  })) {
    if (progress.token.isCancellationRequested) break;

    scannedFiles++;
    progress.report(event.progress, `Fixing ${event.name}`);

    if (event.result.threats.length > 0) {
      threatsFound += event.result.threats.length;
      allThreats.push({
        uri: event.path,
        threats: event.result.threats,
      });
    }

    if (event.result.fixed?.length) {
      threatsFixed += event.result.fixed.length;
    }
  }

  progress.done();

  connection.sendNotification(NOTIFY_SCAN_COMPLETED);

  await generateWorkspaceReport(rootPath, allThreats, threatsFound);

  connection.window.showInformationMessage(
    `PromptShield: Fix complete. Fixed ${threatsFixed} of ${threatsFound} threats in ${scannedFiles} files.`,
  );
};
