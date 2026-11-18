import type { OptionValueNode, ProgramNode } from "./nodes.js";
import { buildHtmlPrompt } from "./prompt-builder.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayOptionValue(value: OptionValueNode): string {
  if (value.kind === "ArrayLiteral") {
    return `[${value.elements.map(displayOptionValue).join(", ")}]`;
  }
  return value.value === null ? "null" : String(value.value);
}

function formatName(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

export function generateHtml(program: ProgramNode): string {
  const { feature } = program;
  const title = escapeHtml(feature.name);
  const context = [...program.context, ...feature.context]
    .map((text) => `      <p>${escapeHtml(text.value)}</p>`)
    .join("\n");
  const prompt = escapeHtml(buildHtmlPrompt(program));

  const options = feature.options.length
    ? `    <section aria-labelledby="options-heading">
      <h2 id="options-heading">Options</h2>
      <dl class="options">
${feature.options
  .map(
    (option) =>
      `        <div><dt>${escapeHtml(formatName(option.name))}</dt><dd>${escapeHtml(displayOptionValue(option.value))}</dd></div>`,
  )
  .join("\n")}
      </dl>
    </section>`
    : `    <section aria-labelledby="options-heading">
      <h2 id="options-heading">Options</h2>
      <p>No options specified; sensible choices are left for the AI to infer.</p>
    </section>`;

  const actions = feature.actions.length
    ? `    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading">Actions</h2>
      <ul class="actions">
${feature.actions
  .map((action) => {
    const description = action.body.map((text) => escapeHtml(text.value)).join(" ");
    return `        <li><strong>${escapeHtml(formatName(action.name))}</strong>${description ? ` — ${description}` : " <span class=\"inferred\">(behavior to be inferred)</span>"}</li>`;
  })
  .join("\n")}
      </ul>
    </section>`
    : `    <section aria-labelledby="actions-heading">
      <h2 id="actions-heading">Actions</h2>
      <p>No actions specified; the AI prompt asks for sensible interactions.</p>
    </section>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      :root { color-scheme: light dark; font: 16px/1.6 system-ui, sans-serif; background: #10131b; color: #eef0f6; }
      body { margin: 0; padding: 3rem 1.25rem; }
      main { max-width: 54rem; margin: 0 auto; }
      h1, h2 { line-height: 1.2; }
      h1 { font-size: clamp(2rem, 6vw, 3.5rem); margin-bottom: .5rem; }
      h2 { margin-top: 2.5rem; }
      .eyebrow, .inferred { color: #aeb8d0; }
      .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: .8rem; }
      .notice { padding: 1rem; border-left: 3px solid #8da7ff; background: #ffffff0d; }
      .options { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .75rem; }
      .options > div { padding: .9rem 1rem; border: 1px solid #ffffff24; border-radius: .6rem; }
      dt { font-weight: 700; }
      dd { margin: .25rem 0 0; overflow-wrap: anywhere; }
      .actions { padding-left: 1.25rem; }
      .actions li { padding: .35rem 0; }
      .prompt-box { margin-top: 1rem; }
      textarea { box-sizing: border-box; width: 100%; min-height: 24rem; resize: vertical; padding: 1rem; border: 1px solid #ffffff30; border-radius: .6rem; background: #090b10; color: inherit; font: .9rem/1.55 ui-monospace, monospace; }
      button { margin: 0 0 .75rem; padding: .65rem 1rem; border: 0; border-radius: .45rem; background: #c6d2ff; color: #12182a; font: inherit; font-weight: 700; cursor: pointer; }
      button:focus-visible, textarea:focus-visible { outline: 3px solid #8da7ff; outline-offset: 3px; }
      #copy-status { min-height: 1.5em; }
      @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">SatisPromptLang · HTML build brief</p>
      <h1>${title}</h1>
      <p class="notice">This page turns your <code>.ps</code> file into a structured prompt. Copy it into an AI coding assistant to generate the HTML application. PromptScript does not contact an AI service.</p>
${context}
${options}
${actions}
      <section aria-labelledby="prompt-heading">
        <h2 id="prompt-heading">AI build prompt</h2>
        <p>Explicit requirements are included as written. Unspecified details are left for the AI to infer.</p>
        <div class="prompt-box">
          <button id="copy-prompt" type="button">Copy prompt</button>
          <p id="copy-status" role="status" aria-live="polite">You can also select and copy the prompt below.</p>
          <textarea id="ai-prompt" aria-label="AI build prompt" readonly spellcheck="false">${prompt}</textarea>
        </div>
      </section>
    </main>
    <script>
      const copyButton = document.getElementById("copy-prompt");
      const promptField = document.getElementById("ai-prompt");
      const copyStatus = document.getElementById("copy-status");
      copyButton?.addEventListener("click", async () => {
        if (!promptField || !copyStatus) return;
        try {
          await navigator.clipboard.writeText(promptField.value);
          copyStatus.textContent = "Prompt copied. Paste it into your AI coding assistant.";
        } catch {
          promptField.focus();
          promptField.select();
          copyStatus.textContent = "Automatic copy is unavailable here. The prompt is selected; copy it manually.";
        }
      });
    </script>
  </body>
</html>
`;
}
