import * as path from "node:path";
import type { ThreatReport } from "@promptshield/core";
import * as vscode from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { DecorationManager } from "./decoration-manager";
import { PromptShieldStatusBar } from "./status-bar";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log("PromptShield is active!");

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { scheme: "file", language: "plaintext" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "javascript" },
      { scheme: "file", pattern: "**/*" },
    ], // Broad selector for now, or match specific languages
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "promptShieldLsp",
    "PromptShield LSP",
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();

  const decorationManager = new DecorationManager();
  decorationManager.activate(context);

  new PromptShieldStatusBar(context, decorationManager); // Init UI

  context.subscriptions.push(
    vscode.commands.registerCommand("promptshield.scanWorkspace", () => {
      // Delegate to LSP command
      vscode.commands.executeCommand("promptshield.scanWorkspace");
    }),

    vscode.commands.registerCommand("promptshield.toggleXRay", () => {
      // Read-only status bar, maybe show message?
      vscode.window.showInformationMessage(
        "PromptShield X-Ray is always active.",
      );
    }),

    vscode.commands.registerCommand(
      "promptshield.showDetailedReport",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active editor.");
          return;
        }

        const threats = decorationManager.getAllThreats(editor.document.uri);
        if (threats.length === 0) {
          vscode.window.showInformationMessage(
            "No PromptShield threats detected in this file.",
          );
          return;
        }

        const items = threats.map((t) => ({
          label: `[${t.severity}] ${t.category}`,
          description: `Line ${t.loc.line}, Col ${t.loc.column}`,
          detail: t.message,
          threat: t,
        }));

        const selection = await vscode.window.showQuickPick(items, {
          placeHolder: `Detected ${threats.length} threats. Select to jump to location.`,
        });

        if (selection) {
          const t = selection.threat;
          const pos = editor.document.positionAt(t.loc.index);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(
            new vscode.Range(pos, pos),
            vscode.TextEditorRevealType.InCenter,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      "promptshield.fixWithAI",
      async (uri: string, threats: ThreatReport[]) => {
        const docUri = vscode.Uri.parse(uri);
        const document = await vscode.workspace.openTextDocument(docUri);
        await handleFixWithAI(document, threats);
      },
    ),
  );
}

async function handleFixWithAI(
  document: vscode.TextDocument,
  threats: ThreatReport[],
) {
  console.log({ document, threats });
  vscode.window.showWarningMessage("Not implemented yet!");
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
