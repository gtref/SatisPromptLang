import assert from "node:assert/strict";
import test from "node:test";
import { parsePromptScript } from "../core/parser.js";
import { buildAppPrompt, buildHtmlPrompt } from "../core/prompt-builder.js";

const samplePs = `// Simple counter
counter app options {
  initialCount: 0
  step: 1
}

increment {
  Add step to count.
}

decrement {
  Subtract step from count.
}
`;

test("buildAppPrompt generates target-specific prompt for --react", () => {
  const program = parsePromptScript(samplePs);
  const { systemPrompt, userPrompt } = buildAppPrompt(program, "react");

  assert.match(systemPrompt, /React/i);
  assert.match(userPrompt, /Feature: counter app/);
  assert.match(userPrompt, /Target: react/);
  assert.match(userPrompt, /initialCount: 0/);
  assert.match(userPrompt, /increment/);
  assert.match(userPrompt, /package\.json/);
  assert.match(userPrompt, /src\/App\.jsx/);
});

test("buildAppPrompt generates target-specific prompt for --next", () => {
  const program = parsePromptScript(samplePs);
  const { systemPrompt, userPrompt } = buildAppPrompt(program, "next");

  assert.match(systemPrompt, /Next\.js/i);
  assert.match(userPrompt, /Target: next/);
  assert.match(userPrompt, /app\/page\.jsx/);
  assert.match(userPrompt, /next\.config\.js/);
});

test("buildAppPrompt generates target-specific prompt for --vite", () => {
  const program = parsePromptScript(samplePs);
  const { systemPrompt, userPrompt } = buildAppPrompt(program, "vite");

  assert.match(systemPrompt, /Vite/i);
  assert.match(userPrompt, /Target: vite/);
  assert.match(userPrompt, /vite\.config\.js/);
});

test("buildAppPrompt generates target-specific prompt for --html", () => {
  const program = parsePromptScript(samplePs);
  const { systemPrompt, userPrompt } = buildAppPrompt(program, "html");

  assert.match(systemPrompt, /HTML/i);
  assert.match(userPrompt, /Target: html/);
  assert.match(userPrompt, /standalone HTML application/);
});

test("buildHtmlPrompt maintains backward compatibility", () => {
  const program = parsePromptScript(samplePs);
  const prompt = buildHtmlPrompt(program);

  assert.match(prompt, /Feature: counter app/);
  assert.match(prompt, /Target: standalone HTML, CSS, and browser JavaScript/);
});
