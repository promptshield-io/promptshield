/**
 * Base64 encoded SVGs for Lucid icons.
 * Used in LSP Markdown content to ensure consistent rendering across platforms.
 */

// Lucid "Shield" (Primary/Safe)
const SHIELD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

// Lucid "ShieldAlert" (High/Critical Threat)
const SHIELD_ALERT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';

// Lucid "TriangleAlert" (Medium/Low Threat)
const TRIANGLE_ALERT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

const toBase64 = (str: string) => Buffer.from(str).toString("base64");

export const ICONS = {
  SHIELD: `data:image/svg+xml;base64,${toBase64(SHIELD_SVG)}`,
  SHIELD_ALERT: `data:image/svg+xml;base64,${toBase64(SHIELD_ALERT_SVG)}`,
  TRIANGLE_ALERT: `data:image/svg+xml;base64,${toBase64(TRIANGLE_ALERT_SVG)}`,
};

/**
 * Returns a markdown image string for the given icon.
 */
export const getIconMarkdown = (iconDataUrl: string, alt = "icon") => {
  // Use a small height to align with text, though VSCode markdown styling varies.
  // Generally, just the image tag is standard.
  return `![${alt}](${iconDataUrl})`;
};
