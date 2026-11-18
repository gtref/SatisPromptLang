import type { OptionValueNode, ProgramNode } from "./nodes.js";

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
    [...program.context, ...feature.context].map((text) => text.value),
  );

  if (feature.options.length > 0) {
    appendPromptSection(
      lines,
      "Specified options (preserve these values and use them to guide the implementation)",
      feature.options.map((option) => `${option.name}: ${formatOptionValue(option.value)}`),
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
