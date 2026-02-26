import * as path from "node:path";
import type { ThreatReport } from "@promptshield/core";
import {
  CMD_SERVER_FIX_WORKSPACE,
  CMD_SERVER_SCAN_WORKSPACE,
  NOTIFY_SCAN_COMPLETED,
  SOURCE,
  UNUSED_DIRECTIVE_CODE,
} from "@promptshield/lsp";
import {
  IGNORE_FILES,
  PROMPTSHIELD_ARTIFACTS_DIR,
  PROMPTSHIELD_REPORT_FILE,
} from "@promptshield/workspace";
import * as vscode from "vscode";
import {
  ExecuteCommandRequest,
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { DecorationManager } from "./decoration-manager";
import { CMD_SHOW_MENU, PromptShieldStatusBar } from "./status-bar";
import { getPrimaryThreat, isPromptShieldArtifact } from "./utils";

/**
 * Commands and Notifications Constants
 */
export const CMD_SCAN_WORKSPACE = "promptshield.scanWorkspace";
export const CMD_SCAN_AND_FIX_WORKSPACE = "promptshield.scanAndFixWorkspace";
export const CMD_TOGGLE_XRAY = "promptshield.toggleXRay";
export const CMD_SHOW_WORKSPACE_THREATS = "promptshield.showWorkspaceThreats";
export const CMD_SHOW_DETAILED_REPORT = "promptshield.showDetailedReport";
export const CMD_OPEN_WORKSPACE_REPORT = "promptshield.openWorkspaceReport";
export const CMD_FIX_WITH_AI = "promptshield.fixWithAI";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log("PromptShield is active!");

  const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", pattern: "**/*" }],
    synchronize: {
      fileEvents: IGNORE_FILES.map((file) =>
        vscode.workspace.createFileSystemWatcher(`**/${file}`),
      ),
    },
  };

  client = new LanguageClient(
    "promptShieldLsp",
    "PromptShield LSP",
    serverOptions,
    clientOptions,
  );

  // We don't await client.start() here because we want to lazily trigger the scan downstream
  client
    .start()
    .catch((err) => console.error("LSP Client failed to start", err));

  const decorationManager = new DecorationManager();
  decorationManager.activate();

  client.onNotification(NOTIFY_SCAN_COMPLETED, () => {
    statusBar.setLoading(false);
  });

  const statusBar = new PromptShieldStatusBar(decorationManager);

  context.subscriptions.push(decorationManager, statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      CMD_SCAN_WORKSPACE,
      async (force = true) => {
        statusBar.setLoading(true);
        // Send Request to LSP to start scan, allowing manual or forced scans
        try {
          await client.sendRequest(ExecuteCommandRequest.type, {
            command: CMD_SERVER_SCAN_WORKSPACE,
            arguments: [force],
          });
        } catch (e) {
          console.error("Scan failed:", e);
          vscode.window.showErrorMessage("Workspace scan failed.");
        }
      },
    ),

    vscode.commands.registerCommand(
      CMD_SCAN_AND_FIX_WORKSPACE,
      async (force = true) => {
        statusBar.setLoading(true);
        try {
          await client.sendRequest(ExecuteCommandRequest.type, {
            command: CMD_SERVER_FIX_WORKSPACE,
            arguments: [force],
          });
        } catch (e) {
          console.error("Fix failed:", e);
          vscode.window.showErrorMessage("Workspace fix failed.");
        }
      },
    ),

    vscode.commands.registerCommand(CMD_TOGGLE_XRAY, () => {
      decorationManager.toggleXRay();
    }),

    vscode.commands.registerCommand(CMD_SHOW_MENU, async () => {
      const selection = await vscode.window.showQuickPick(
        [
          {
            label: "$(refresh) Scan Workspace",
            description: "Force a fresh scan of the entire workspace",
            command: CMD_SCAN_WORKSPACE,
          },
          {
            label: "$(wand) Scan and Fix Workspace",
            description: "Automatically apply safe fixes across workspace",
            command: CMD_SCAN_AND_FIX_WORKSPACE,
          },
          {
            label: "$(eye) Toggle X-Ray Mode",
            description: "Show/hide invisible character replacements",
            command: CMD_TOGGLE_XRAY,
          },
          {
            label: "$(list-flat) Show File Threats",
            description: "List threats in current file",
            command: CMD_SHOW_DETAILED_REPORT,
          },
          {
            label: "$(list-tree) Show Workspace Threats",
            description: "List all threats in the workspace",
            command: CMD_SHOW_WORKSPACE_THREATS,
          },
          {
            label: "$(file-text) Open Threat Report",
            description: "Open the generated markdown report",
            command: CMD_OPEN_WORKSPACE_REPORT,
          },
        ],
        { placeHolder: "PromptShield Actions" },
      );

      if (selection) {
        if (selection.command === CMD_OPEN_WORKSPACE_REPORT) {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders) {
            const reportUri = vscode.Uri.joinPath(
              workspaceFolders[0].uri,
              PROMPTSHIELD_ARTIFACTS_DIR,
              PROMPTSHIELD_REPORT_FILE,
            );
            try {
              const doc = await vscode.workspace.openTextDocument(reportUri);
              await vscode.window.showTextDocument(doc);
            } catch {
              vscode.window.showInformationMessage(
                "No report found. Run a scan first.",
              );
            }
          }
        } else {
          vscode.commands.executeCommand(selection.command);
        }
      }
    }),

    vscode.commands.registerCommand(CMD_SHOW_WORKSPACE_THREATS, async () => {
      interface ThreatType extends vscode.QuickPickItem {
        uri: vscode.Uri;
        range: vscode.Range;
      }

      const allDiagnostics = vscode.languages.getDiagnostics();
      const items: ThreatType[] = [];

      for (const [uri, diagnostics] of allDiagnostics) {
        // Filter for PromptShield diagnostics
        if (isPromptShieldArtifact(uri)) {
          continue;
        }
        const psDiagnostics = diagnostics.filter(
          (d) => d.source === SOURCE,
        ) as (vscode.Diagnostic & { data: ThreatReport[] })[];

        for (const d of psDiagnostics) {
          if (d.code === UNUSED_DIRECTIVE_CODE) continue;
          const filename = path.basename(uri.fsPath);
          const group = d.data;
          const primary = getPrimaryThreat(group);
          const categories = Array.from(
            new Set(group.map((t) => t.category)),
          ).join(", ");
          items.push({
            label:
              group.length > 1
                ? `[Multiple, ${primary.severity}] ${categories}`
                : `[${primary.severity}] ${primary.category}`,
            description: `${filename} [Ln ${d.range.start.line + 1}, Col ${d.range.start.character + 1}]`,
            detail:
              group.length > 1
                ? `${group.length} threats at this location`
                : primary.message,
            uri,
            range: d.range,
          });
        }
      }

      if (items.length === 0) {
        vscode.window.showInformationMessage(
          "No PromptShield threats detected in workspace.",
        );
        return;
      }

      const selection = await vscode.window.showQuickPick<ThreatType>(items, {
        placeHolder: `Detected ${items.length} workspace threats. Select to jump.`,
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (selection) {
        const doc = await vscode.workspace.openTextDocument(selection.uri);
        const editor = await vscode.window.showTextDocument(doc);
        editor.selection = new vscode.Selection(
          selection.range.start,
          selection.range.end,
        );
        editor.revealRange(
          selection.range,
          vscode.TextEditorRevealType.InCenter,
        );
      }
    }),

    vscode.commands.registerCommand(CMD_SHOW_DETAILED_REPORT, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor.");
        return;
      }

      const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
      const promptShieldDiagnostics = diagnostics.filter(
        (d) => d.source === SOURCE,
      );

      if (promptShieldDiagnostics.length === 0) {
        vscode.window.showInformationMessage(
          "No PromptShield threats detected in this file.",
        );
        return;
      }

      type ThreatItemType = vscode.QuickPickItem & { threat: ThreatReport };

      const items: ThreatItemType[] = promptShieldDiagnostics
        .map((diagnostic) => {
          if (diagnostic.code === UNUSED_DIRECTIVE_CODE) return null;
          const group = (diagnostic as unknown as { data: ThreatReport[] })
            .data;
          const primary = getPrimaryThreat(group);
          const categories = Array.from(
            new Set(group.map((t) => t.category)),
          ).join(", ");
          return {
            label:
              group.length > 1
                ? `[Multiple, ${primary.severity}] ${categories}`
                : `[${primary.severity}] ${primary.category}`,
            description: `Line ${primary.loc.line}, Col ${primary.loc.column}`,
            detail:
              group.length > 1
                ? `${group.length} threats at this location`
                : primary.message,
            threat: primary,
          } as ThreatItemType;
        })
        .filter((item): item is ThreatItemType => !!item);

      const selection = await vscode.window.showQuickPick<ThreatItemType>(
        items,
        {
          placeHolder: `Detected ${promptShieldDiagnostics.length} threat groups. Select to jump to location.`,
        },
      );

      if (selection) {
        const t = selection.threat;
        const pos = editor.document.positionAt(t.loc.index);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(
          new vscode.Range(pos, pos),
          vscode.TextEditorRevealType.InCenter,
        );
      }
    }),

    vscode.commands.registerCommand(
      CMD_FIX_WITH_AI,
      async (uri: string, threats: ThreatReport[]) => {
        const docUri = vscode.Uri.parse(uri);
        const document = await vscode.workspace.openTextDocument(docUri);
        await handleFixWithAI(document, threats);
      },
    ),
  );

  // Start the client and trigger initial non-forcing scan when ready
  client
    .start()
    .then(() => {
      vscode.commands.executeCommand(CMD_SCAN_WORKSPACE, false);
    })
    .catch((err: unknown) => {
      console.error("LSP client failed to start", err);
    });
}

/**
 * Attempts to automatically fix identified threats using an AI.
 * Currently experimental and disabled.
 *
 * @param document - The document containing the threats to be fixed.
 * @param threats - The reported threats in the document.
 */
async function handleFixWithAI(
  document: vscode.TextDocument,
  threats: ThreatReport[],
) {
  console.log(
    "Fix with AI disabled for Document:",
    document.uri.toString(),
    "Threats:",
    threats,
  );
  vscode.window.showWarningMessage(
    "Fix with AI is currently experimental and disabled.",
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
