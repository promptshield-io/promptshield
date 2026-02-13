## UI: [ZWSP] vs. Encoded Logic

**The Hybrid Approach:**

* **For pure invisible chars (`ZWSP`, `NBSP`):** Use inline decorators like `[ZWSP]` or a subtle `·`.
* **For logic-altering chars (`BIDI`, `Homoglyphs`):** Use a "Split-View Hover" or "Ghost Overlay." If the code says `print("Safe")` but the BIDI override makes the AI see `print("Malicious")`, show the **True Prompt** in a side-by-side ghost window.
* **The "X-Ray" Toggle:** A global command to toggle all invisible characters into their escaped hex forms (e.g., `\u200B`) for editing.


## 3. PRD: Stage 1 — The "Skeleton" & Core Engine

### Project Vision

To create the industry-standard "Clean Room" for AI prompts, ensuring what the human sees is exactly what the LLM receives.

### Architecture Breakdown (The Monorepo)

| Component | Responsibility | Tech Stack |
| --- | --- | --- |
| **`@ghostbuster/core`** | Functional AST/Regex logic for detection. | TypeScript (Zero-deps) |
| **`@promptshield/vscode`** | UI/UX, Decorations, Quick-fixes, Status Bar. | VS Code API |
| **`@ghostbuster/cli`** | CI/CD gatekeeper; exits with code 1 on "High" threats. | Oclif / Commander |
| **`@promptshield/web`** | Education, "Visualizer" tool, and API demo. | Next.js + Tailwind |

### Implementation Phases

#### **Stage 1: The Detection Engine (Alpha)**

* **Goal:** 100% accuracy in detecting "The Big 4": Invisible spaces, BIDI overrides, Homoglyphs, and Hidden Markdown.
* **Deliverable:** A `@ghostbuster/core` library that passes a comprehensive Vitest suite.

#### **Stage 2: The IDE Experience (Beta)**

* **Goal:** Zero-friction highlighting in VS Code.
* **Deliverable:** Extension that highlights threats and provides "Sanitize" code actions.

#### **Stage 3: The Ecosystem (Production)**

* **Goal:** Agentic support and CI/CD integration.
* **Deliverable:** MCP Server for Agentic IDEs (Cursor/Windsurf) and the `.promptignore` logic.

