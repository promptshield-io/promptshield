// This file contains hidden threats for testing PromptShield.

// 1. Invisible Characters
const zeroWidthSpace = "Hello​World"; // Contains \u200B
const zeroWidthJoiner = "J‍S"; // Contains \u200D

// 2. Homoglyphs (Cyrillic characters that look like Latin)
const admin = "аdmin"; // 'a' is Cyrillic
const scope = "scopе"; // 'e' is Cyrillic

// 3. Bidi Overrides (Directional formatting)
const restricted = "user‮ ⁦// Check if admin⁩ ⁡";

console.log("If PromptShield is working, you should see red highlights above.");
