import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import {
  createConnection,
  DidChangeConfigurationNotification,
  type InitializeParams,
  type InitializeResult,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getFixAction } from "./code-actions";
import { DEFAULT_CONFIG, type LspConfig } from "./types";
import { validateDocument } from "./validation";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
// let hasDiagnosticRelatedInformationCapability = false;

// Debounce map: URI -> Timeout
const debounceMap = new Map<string, NodeJS.Timeout>();
const globalConfig: LspConfig = { ...DEFAULT_CONFIG };

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  // hasDiagnosticRelatedInformationCapability = !!(
  //   capabilities.textDocument &&
  //   capabilities.textDocument.publishDiagnostics &&
  //   capabilities.textDocument.publishDiagnostics.relatedInformation
  // );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      // completionProvider: {
      // 	resolveProvider: true
      // },
      codeActionProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  triggerValidation(change.document);
});

const triggerValidation = (document: TextDocument) => {
  const uri = document.uri;

  // Clear existing timeout
  if (debounceMap.has(uri)) {
    clearTimeout(debounceMap.get(uri));
  }

  // Set new timeout
  const timeout = setTimeout(() => {
    validateDocument(document, connection, globalConfig);
    debounceMap.delete(uri);
  }, globalConfig.debounceMs);

  debounceMap.set(uri, timeout);
};

connection.onCodeAction((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  // We need the threats to generate the fix action.
  // Ideally, we should cache the threats from the last validation.
  // For MVP, we'll re-scan quickly since scan is fast, or better,
  // rely on the logic in getFixAction which will re-scan if needed
  // or we can pass threats if we had a way to store them attached to the doc.
  //
  // Re-scanning is safest for MVP statelessness.
  // But wait, getFixAction takes threats.
  // Let's re-scan in getFixAction helper? No, separate concerns.
  // I'll scan here.

  const text = document.getText();
  const scanResult = scan(text);
  const { threats } = filterThreats(text, scanResult.threats);

  // Filter threats to those intersecting the range?
  // VSCode usually requests code actions for a range.
  // But our "Fix document" is a whole-file fix.
  // So we can just return it if there are any threats.

  const action = getFixAction(document, threats);
  return action ? [action] : null;
});

import { scanWorkspace } from "./workspace-scanning";

// ... existing imports

// ... existing code ...

connection.onExecuteCommand(async (params) => {
  if (params.command === "promptshield.scanWorkspace") {
    const folders = await connection.workspace.getWorkspaceFolders();
    if (folders) {
      const folderUris = folders.map((f) => f.uri);
      await scanWorkspace(connection, documents, folderUris);
    }
  }
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
