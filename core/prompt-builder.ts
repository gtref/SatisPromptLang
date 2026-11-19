import type { OptionValueNode, ProgramNode } from "./nodes.js";

export type BuildTarget =
  | "html"
  | "react"
  | "next"
  | "vite"
  | "vue"
  | "svelte"
  | "vanilla"
  | string;

function formatOptionValue(value: OptionValueNode): string {
  if (value.kind === "ArrayLiteral") {
    return `[${value.elements.map(formatOptionValue).join(", ")}]`;
  }
  return JSON.stringify(value.value);
}

function appendPromptSection(lines: string[], title: string, values: string[]): void {
  if (values.length === 0) return;

  lines.push(`${title}:`);
  for (const value of values) {
    lines.push(`- ${value}`);
  }
  lines.push("");
}

/**
 * Builds the target-specific instructions for the agent.
 */
function getTargetInstructions(target: BuildTarget, featureName: string): { system: string; instructions: string[] } {
  const norm = target.toLowerCase();

  switch (norm) {
    case "react":
      return {
        system: "You are an expert React and TypeScript/JavaScript developer. You build production-ready, beautiful, modern React applications.",
        instructions: [
          `Build a complete, modular, interactive React application for "${featureName}".`,
          "Generate all necessary project files including:",
          "  1. package.json with react, react-dom, and build/start scripts",
          "  2. index.html entry point",
          "  3. src/index.jsx (or main.jsx) and src/App.jsx",
          "  4. Any required components and CSS stylesheets (e.g., src/styles.css)",
          "Format every generated file with a markdown code block preceded by its relative path or in the block info, e.g.:",
          "### `src/App.jsx`",
          "```jsx",
          "// code...",
          "```",
          "Ensure the application works seamlessly and includes interactive state management for all requested actions.",
        ],
      };

    case "next":
      return {
        system: "You are an expert Next.js and React full-stack developer. You build high-performance, polished Next.js applications.",
        instructions: [
          `Build a complete, modern Next.js application (App Router) for "${featureName}".`,
          "Generate all necessary project files including:",
          "  1. package.json with next, react, react-dom, and dev/build scripts",
          "  2. next.config.js",
          "  3. app/layout.jsx and app/page.jsx",
          "  4. Components and CSS styles (e.g. app/globals.css)",
          "Format every generated file with a markdown code block preceded by its relative path, e.g.:",
          "### `app/page.jsx`",
          "```jsx",
          "// code...",
          "```",
          "Ensure all interactive UI controls and states are fully functional (use 'use client' where appropriate).",
        ],
      };

    case "vite":
      return {
        system: "You are an expert front-end engineer specializing in modern Vite web applications.",
        instructions: [
          `Build a complete, fast, modern Vite application for "${featureName}".`,
          "Generate all necessary project files including:",
          "  1. package.json with vite and dev/build scripts",
          "  2. vite.config.js",
          "  3. index.html",
          "  4. src/main.jsx (or main.js) and src/App.jsx",
          "  5. CSS styles (src/style.css)",
          "Format every generated file with a markdown code block preceded by its relative path, e.g.:",
          "### `src/App.jsx`",
          "```jsx",
          "// code...",
          "```",
          "Ensure the application runs cleanly with `npm run dev`.",
        ],
      };

    case "vue":
      return {
        system: "You are an expert Vue 3 and modern web developer.",
        instructions: [
          `Build a complete Vue 3 (Composition API) application for "${featureName}".`,
          "Generate all necessary project files including:",
          "  1. package.json with vue and vite",
          "  2. vite.config.js",
          "  3. index.html",
          "  4. src/main.js and src/App.vue",
          "Format every generated file with a markdown code block preceded by its relative path.",
        ],
      };

    case "svelte":
      return {
        system: "You are an expert Svelte and modern web developer.",
        instructions: [
          `Build a complete Svelte application for "${featureName}".`,
          "Generate all necessary project files including:",
          "  1. package.json with svelte and vite",
          "  2. vite.config.js and svelte.config.js",
          "  3. index.html",
          "  4. src/main.js and src/App.svelte",
          "Format every generated file with a markdown code block preceded by its relative path.",
        ],
      };

    case "html":
    default:
      return {
        system: "You are an expert front-end developer who crafts self-contained, responsive, beautiful HTML/CSS/JS applications.",
        instructions: [
          `Build a complete, polished, accessible, responsive standalone HTML application for "${featureName}".`,
          "Return a single, complete HTML document with CSS and JavaScript included in the document.",
          "Do not use external network-dependent libraries, CDNs, or build tools.",
          "Wrap the complete HTML document inside a ```html code block.",
          "The application must run immediately when opened as an HTML file in any modern web browser.",
        ],
      };
  }
}

/**
 * Builds the complete prompt to instruct the AI agent to generate the application.
 */
export function buildAppPrompt(
  program: ProgramNode,
  target: BuildTarget = "html"
): { systemPrompt: string; userPrompt: string } {
  const { feature } = program;
  const targetInfo = getTargetInstructions(target, feature.name);

  const lines: string[] = [
    ...targetInfo.instructions,
    "Treat the following specification as the source of truth. Implement every stated requirement.",
    "Where details are unspecified, infer sensible, user-friendly behavior and make the result feel complete and professional.",
    "",
    `Feature: ${feature.name}`,
    `Target: ${target}`,
    "",
  ];

  appendPromptSection(
    lines,
    "Project context",
    [...program.context, ...feature.context].map((text) => text.value)
  );

  if (feature.options.length > 0) {
    appendPromptSection(
      lines,
      "Specified options (preserve these values and use them to guide the implementation)",
      feature.options.map((option) => `${option.name}: ${formatOptionValue(option.value)}`)
    );
  } else {
    lines.push("Options:");
    lines.push("- No options were specified. Choose sensible defaults for this feature.");
    lines.push("");
  }

  if (feature.actions.length > 0) {
    lines.push("Requested actions:");
    for (const action of feature.actions) {
      lines.push(`- ${action.name}`);
      if (action.body.length > 0) {
        for (const text of action.body) lines.push(`  - ${text.value}`);
      } else {
        lines.push("  - No behavior was specified; infer and implement a useful behavior.");
      }
    }
    lines.push("");
  } else {
    lines.push("Requested actions:");
    lines.push("- No actions were specified. Infer the essential interactions for this feature.");
    lines.push("");
  }

  lines.push("Make thoughtful design and interaction decisions for anything not specified above.");
  lines.push("Produce clean, readable, robust code ready to run.");

  return {
    systemPrompt: targetInfo.system,
    userPrompt: lines.join("\n"),
  };
}

/**
 * Retained for backwards compatibility with existing HTML brief generation.
 */
export function buildHtmlPrompt(program: ProgramNode): string {
  const { feature } = program;
  const lines = [
    "You are an experienced front-end developer.",
    `Build a complete, polished, accessible, responsive HTML application for "${feature.name}".`,
    "Return a single, complete HTML document with CSS and JavaScript included in the document.",
    "Do not use external libraries, services, or build tools.",
    "Treat the following specification as the source of truth. Implement every stated requirement.",
    "Where details are unspecified, infer sensible, user-friendly behavior and make the result feel complete.",
    "",
    `Feature: ${feature.name}`,
    "Target: standalone HTML, CSS, and browser JavaScript",
    "",
  ];

  appendPromptSection(
    lines,
    "Project context",
    [...program.context, ...feature.context].map((text) => text.value)
  );

  if (feature.options.length > 0) {
    appendPromptSection(
      lines,
      "Specified options (preserve these values and use them to guide the implementation)",
      feature.options.map((option) => `${option.name}: ${formatOptionValue(option.value)}`)
    );
  } else {
    lines.push("Options:");
    lines.push("- No options were specified. Choose sensible defaults for this feature.");
    lines.push("");
  }

  if (feature.actions.length > 0) {
    lines.push("Requested actions:");
    for (const action of feature.actions) {
      lines.push(`- ${action.name}`);
      if (action.body.length > 0) {
        for (const text of action.body) lines.push(`  - ${text.value}`);
      } else {
        lines.push("  - No behavior was specified; infer and implement a useful behavior.");
      }
    }
    lines.push("");
  } else {
    lines.push("Requested actions:");
    lines.push("- No actions were specified. Infer the essential interactions for this feature.");
    lines.push("");
  }

  lines.push("Make reasonable design and interaction decisions for anything not specified above.");
  lines.push("The result should work when saved as an .html file and opened in a modern browser.");

  return lines.join("\n");
}
