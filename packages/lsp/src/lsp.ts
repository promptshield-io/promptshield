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
import { getFixAllAction, getThreatFixActions } from "./code-actions";
import { DEFAULT_CONFIG, type LspConfig } from "./types";
import { validateDocument } from "./validation";
import { scanWorkspace } from "./workspace-scanning";

/**
 * PromptShield Language Server
 *
 * Responsibilities:
 * - Manage document lifecycle
 * - Trigger validation
 * - Publish diagnostics
 * - Provide quick fixes
 * - Execute workspace scans
 *
 * This module intentionally contains only orchestration logic.
 * All scanning, sanitizing, and conversion logic lives in dedicated modules.
 */

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

/**
 * Debounce timers per document URI.
 */
const debounceMap = new Map<string, NodeJS.Timeout>();

/**
 * Global LSP configuration.
 * Falls back to DEFAULT_CONFIG when client configuration is unavailable.
 */
const globalConfig: LspConfig = { ...DEFAULT_CONFIG };

/**
 * Initialize LSP server capabilities.
 */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!capabilities.workspace?.configuration;

  hasWorkspaceFolderCapability = !!capabilities.workspace?.workspaceFolders;

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      codeActionProvider: true,
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: { supported: true },
    };
  }

  return result;
});

/**
 * Register configuration change listener after initialization.
 */
connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
});

/**
 * Trigger validation when document content changes.
 */
documents.onDidChangeContent((change) => {
  triggerValidation(change.document);
});

/**
 * Debounced validation execution.
 */
const triggerValidation = (document: TextDocument): void => {
  const uri = document.uri;

  const existing = debounceMap.get(uri);
  if (existing) {
    clearTimeout(existing);
  }

  const timeout = setTimeout(() => {
    validateDocument(document, connection, globalConfig);
    debounceMap.delete(uri);
  }, globalConfig.debounceMs);

  debounceMap.set(uri, timeout);
};

/**
 * Provide code actions for the active document.
 */
connection.onCodeAction((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const result = scan(text);
  const { threats } = filterThreats(text, result.threats);

  const actions = getThreatFixActions(document, threats);

  const fixAll = getFixAllAction(document, threats);
  if (fixAll) {
    actions.push(fixAll);
  }

  return actions;
});

/**
 * Execute PromptShield workspace commands.
 */
connection.onExecuteCommand(async (params) => {
  if (params.command !== "promptshield.scanWorkspace") {
    return;
  }

  const folders = await connection.workspace.getWorkspaceFolders();
  if (!folders) return;

  const folderUris = folders.map((f) => f.uri);
  await scanWorkspace(connection, documents, folderUris);
});

/**
 * Start document manager and LSP connection.
 */
/**
 * Start document manager and LSP connection.
 */
export function startLspServer() {
  documents.listen(connection);
  connection.listen();
}
