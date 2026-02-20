import { scan } from "@promptshield/core";
import { filterThreats } from "@promptshield/ignore";
import {
  createConnection,
  DidChangeConfigurationNotification,
  type InitializeParams,
  type InitializeResult,
  type Position,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  getAiFixAction,
  getFixAllAction,
  getIgnoreAction,
  getThreatFixActions,
} from "./code-actions";
import { getHover } from "./hover";
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
      hoverProvider: true,
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
  fetchConfiguration();
});

connection.onDidChangeConfiguration(() => {
  fetchConfiguration();
});

async function fetchConfiguration() {
  if (hasConfigurationCapability) {
    try {
      const config =
        await connection.workspace.getConfiguration("promptshield");
      if (config) {
        globalConfig.noIgnore = config.noIgnore ?? DEFAULT_CONFIG.noIgnore;
        // Optionally map other config properties here if they get added
      }
    } catch {
      // ignore
    }
  }
}

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

  /*
   * Filter threats to those intersecting the requested range.
   * This ensures we only provide actions for relevant threats.
   */
  const activeThreats = threats.filter((t) => {
    const start = document.positionAt(t.loc.index);
    const end = document.positionAt(t.loc.index + t.offendingText.length);

    // Check intersection with params.range
    // Overlap exists if (StartA <= EndB) AND (EndA >= StartB)
    return (
      comparePositions(start, params.range.end) <= 0 &&
      comparePositions(end, params.range.start) >= 0
    );
  });

  const actions = getThreatFixActions(document, activeThreats);

  const fixAll = getFixAllAction(document, threats);
  if (fixAll) {
    actions.push(fixAll);
  }

  // Add single AI Fix action if any threats exist
  if (threats.length > 0) {
    const ignoreAction = getIgnoreAction(document, threats[0]);
    if (ignoreAction) {
      actions.push(ignoreAction);
    }
    actions.push(getAiFixAction(document, threats));
  }

  return actions;
});

/**
 * Provide hover information.
 */
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  return getHover(document, params.position);
});

/**
 * Compare two positions.
 * Returns < 0 if p1 is before p2, 0 if equal, > 0 if p1 is after p2.
 */
function comparePositions(p1: Position, p2: Position): number {
  if (p1.line !== p2.line) {
    return p1.line - p2.line;
  }
  return p1.character - p2.character;
}

/**
 * Execute PromptShield workspace commands.
 */
connection.onExecuteCommand(async (params) => {
  if (params.command === "promptshield.scanWorkspace") {
    const force = params.arguments?.[0] === true;
    const folders = await connection.workspace.getWorkspaceFolders();
    if (folders && folders.length > 0) {
      await scanWorkspace(connection, documents, folders[0].uri, {
        force,
        config: globalConfig,
      });
    }
  }
});

/**
 * Start document manager and LSP connection.
 */
export function startLspServer() {
  documents.listen(connection);
  connection.listen();
}
