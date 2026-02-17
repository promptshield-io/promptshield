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
      async (uri: string, threat: ThreatReport) => {
        const docUri = vscode.Uri.parse(uri);
        const document = await vscode.workspace.openTextDocument(docUri);
        await handleFixWithAI(document, threat);
      },
    ),
  );
}

async function handleFixWithAI(
  document: vscode.TextDocument,
  threat: ThreatReport,
) {
  try {
    const models = await vscode.lm.selectChatModels({ family: "gpt-4" }); // Prefer GPT-4
    let model = models[0];
    if (!model) {
      const allModels = await vscode.lm.selectChatModels({});
      model = allModels[0];
    }

    if (!model) {
      vscode.window.showErrorMessage(
        "No language models available for PromptShield AI Fix.",
      );
      return;
    }

    const start = document.positionAt(threat.loc.index);
    const end = document.positionAt(
      threat.loc.index + threat.offendingText.length,
    );
    const range = new vscode.Range(start, end);

    // Context: Get line or surrounding context
    const line = document.lineAt(start.line).text;

    const messages = [
      vscode.LanguageModelChatMessage.User(
        `Fix the following security threat in the code snippet below. 
                Threat: ${threat.message}
                Offending Text: "${threat.offendingText}"
                Context: "${line}"
                
                Return ONLY the corrected text replacement for the offending text, nothing else.`,
      ),
    ];

    const cancellationToken = new vscode.CancellationTokenSource().token;
    const response = await model.sendRequest(messages, {}, cancellationToken);

    let fixedText = "";
    for await (const fragment of response.text) {
      fixedText += fragment;
    }

    if (fixedText) {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, range, fixedText.trim()); // Trim to be safe
      await vscode.workspace.applyEdit(edit);
    }
  } catch (e) {
    vscode.window.showErrorMessage(`PromptShield AI Fix failed: ${e}`);
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
