import type {
  ActionDeclarationNode,
  ArrayLiteralNode,
  FeatureDeclarationNode,
  LiteralNode,
  OptionDeclarationNode,
  OptionValueNode,
  ProgramNode,
  PromptTextNode,
} from "./nodes.js";

export class ParseError extends Error {
  constructor(message: string, readonly line?: number) {
    super(line === undefined ? message : `Line ${line}: ${message}`);
    this.name = "ParseError";
  }
}

function isOptionValue(value: unknown): value is string | number | boolean | null | (string | number | boolean | null)[] {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  return Array.isArray(value) && value.every(isOptionValue);
}

function parseOptionValue(rawValue: string, line: number): OptionValueNode {
  const value = rawValue.trim().replace(/,\s*$/, "");
  if (!value) throw new ParseError("Expected an option value", line);

  if (value === "true" || value === "false" || value === "null") {
    const literal: LiteralNode = {
      kind: "Literal",
      value: value === "null" ? null : value === "true",
    };
    return literal;
  }

  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    return { kind: "Literal", value: Number(value) };
  }

  if (value.startsWith('"') || value.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new ParseError(`Invalid option value: ${value}`, line);
    }

    if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean" || parsed === null) {
      return { kind: "Literal", value: parsed };
    }
    if (Array.isArray(parsed) && isOptionValue(parsed)) {
      const array: ArrayLiteralNode = {
        kind: "ArrayLiteral",
        elements: parsed.map((item) => optionValueFromParsed(item)),
      };
      return array;
    }

    throw new ParseError("Option values must be scalars or arrays of scalars", line);
  }

  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return { kind: "Literal", value: value.slice(1, -1) };
  }

  return { kind: "Literal", value };
}

function optionValueFromParsed(value: string | number | boolean | null | (string | number | boolean | null)[]): OptionValueNode {
  if (Array.isArray(value)) {
    return {
      kind: "ArrayLiteral",
      elements: value.map(optionValueFromParsed),
    };
  }
  return { kind: "Literal", value };
}

function promptText(value: string): PromptTextNode {
  return { kind: "PromptText", value };
}

function commentText(line: string): string | undefined {
  const comment = line.match(/^\/\/\s?(.*)$/);
  return comment?.[1];
}

function parseOptions(
  lines: string[],
  startIndex: number,
  feature: FeatureDeclarationNode,
): number {
  const optionNames = new Set<string>();

  for (let index = startIndex; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line) continue;

    const comment = commentText(line);
    if (comment !== undefined) {
      feature.context.push(promptText(comment));
      continue;
    }
    if (line === "}") return index + 1;

    const option = line.match(/^([A-Za-z_][\w-]*)\s*[:=]\s*(.*?)\s*,?$/);
    if (!option) throw new ParseError("Expected an option in the form `name: value` or `}`", lineNumber);
    if (optionNames.has(option[1])) throw new ParseError(`Duplicate option "${option[1]}"`, lineNumber);

    optionNames.add(option[1]);
    const declaration: OptionDeclarationNode = {
      kind: "OptionDeclaration",
      name: option[1],
      value: parseOptionValue(option[2], lineNumber),
    };
    feature.options.push(declaration);
  }

  throw new ParseError("Unclosed options block");
}

function parseAction(
  lines: string[],
  startIndex: number,
  actionName: string,
  inlineBody: string,
  inline: boolean,
): { action: ActionDeclarationNode; nextIndex: number } {
  const action: ActionDeclarationNode = {
    kind: "ActionDeclaration",
    name: actionName,
    body: [],
  };

  if (inline) {
    const text = inlineBody.trim().replace(/^\/\/\s?/, "");
    if (text) action.body.push(promptText(text));
    return { action, nextIndex: startIndex + 1 };
  }

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === "}") return { action, nextIndex: index + 1 };
    if (!line) continue;

    const comment = commentText(line);
    action.body.push(promptText(comment ?? line));
  }

  throw new ParseError(`Unclosed action block "${actionName}"`, startIndex + 1);
}

export function parsePromptScript(source: string): ProgramNode {
  const lines = source.split(/\r?\n/);
  const program: ProgramNode = {
    kind: "Program",
    context: [],
    feature: {
      kind: "FeatureDeclaration",
      name: "",
      options: [],
      actions: [],
      context: [],
    },
  };
  let featureFound = false;
  const actionNames = new Set<string>();

  for (let index = 0; index < lines.length; ) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const comment = commentText(line);
    if (comment !== undefined) {
      (featureFound ? program.feature.context : program.context).push(promptText(comment));
      index += 1;
      continue;
    }

    if (!featureFound) {
      const declaration = line.match(/^(.+?)\s+options\s*\{\s*$/i);
      if (!declaration) {
        program.context.push(promptText(line));
        index += 1;
        continue;
      }

      program.feature.name = declaration[1].trim();
      featureFound = true;
      index = parseOptions(lines, index + 1, program.feature);
      continue;
    }

    const action = line.match(/^([A-Za-z_][\w-]*)\s*\{\s*(.*?)\s*\}\s*$/);
    if (action) {
      if (actionNames.has(action[1])) throw new ParseError(`Duplicate action "${action[1]}"`, lineNumber);
      actionNames.add(action[1]);
      const parsed = parseAction(lines, index, action[1], action[2], true);
      program.feature.actions.push(parsed.action);
      index = parsed.nextIndex;
      continue;
    }

    const openAction = line.match(/^([A-Za-z_][\w-]*)\s*\{\s*$/);
    if (openAction) {
      if (actionNames.has(openAction[1])) throw new ParseError(`Duplicate action "${openAction[1]}"`, lineNumber);
      actionNames.add(openAction[1]);
      const parsed = parseAction(lines, index, openAction[1], "", false);
      program.feature.actions.push(parsed.action);
      index = parsed.nextIndex;
      continue;
    }

    if (line === "}") throw new ParseError("Unexpected closing brace", lineNumber);
    program.feature.context.push(promptText(line));
    index += 1;
  }

  if (!featureFound) {
    throw new ParseError('Missing feature declaration (expected: "feature name options {")');
  }

  return program;
}
