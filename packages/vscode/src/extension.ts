import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { DecorationManager } from "./protection/decorationManager";
import {
  handleFixWithAI,
  PromptShieldCodeActionProvider,
} from "./providers/codeActionProvider";
import { PromptShieldHoverProvider } from "./providers/hoverProvider";
import { PromptShieldStatusBar } from "./ui/statusBar";

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log("PromptShield is active!");

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("..", "lsp", "dist", "index.js"),
  );

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

  const hoverProvider = new PromptShieldHoverProvider(decorationManager);

  // CodeActionProvider might need update or be removed if LSP handles it
  // But requirement says "Code Action Provider... Keep existing provider... It should read threats from DecorationManager."
  // And "Do not move AI fix logic to LSP."
  const codeActionProvider = new PromptShieldCodeActionProvider(
    decorationManager,
  );

  new PromptShieldStatusBar(context, decorationManager); // Init UI

  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: "file" }, hoverProvider),
    vscode.languages.registerCodeActionsProvider(
      { scheme: "file" },
      codeActionProvider,
    ),

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
      async (document: vscode.TextDocument, threat: any) => {
        await handleFixWithAI(document, threat);
      },
    ),
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
