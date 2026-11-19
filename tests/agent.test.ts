import assert from "node:assert/strict";
import test = require("node:test");
import { parseCliArgs } from "../index.js";
import { callAgent } from "../core/agent.js";

test("parseCliArgs parses target flags correctly", () => {
  assert.equal(parseCliArgs(["file.ps", "--react"]).target, "react");
  assert.equal(parseCliArgs(["file.ps", "--next"]).target, "next");
  assert.equal(parseCliArgs(["file.ps", "--vite"]).target, "vite");
  assert.equal(parseCliArgs(["file.ps", "--html"]).target, "html");
  assert.equal(parseCliArgs(["file.ps", "--vue"]).target, "vue");
  assert.equal(parseCliArgs(["file.ps", "--svelte"]).target, "svelte");
  assert.equal(parseCliArgs(["file.ps", "--target", "custom"]).target, "custom");
});

test("parseCliArgs parses groq and any model flag", () => {
  const parsed = parseCliArgs([
    "file.ps",
    "--groq",
    "--model",
    "llama-3.3-70b-versatile",
  ]);

  assert.equal(parsed.agent, "groq");
  assert.equal(parsed.model, "llama-3.3-70b-versatile");
});

test("parseCliArgs parses options and flags", () => {
  const parsed = parseCliArgs([
    "examples/music-player.ps",
    "-o",
    "output-dir",
    "--agent",
    "my-agent",
    "--model",
    "llama3.1",
    "--api-url",
    "http://localhost:11434",
    "--api-key",
    "test-key",
    "--dry-run",
    "--brief",
  ]);

  assert.equal(parsed.inputPath, "examples/music-player.ps");
  assert.equal(parsed.outputPath, "output-dir");
  assert.equal(parsed.agent, "my-agent");
  assert.equal(parsed.model, "llama3.1");
  assert.equal(parsed.apiUrl, "http://localhost:11434");
  assert.equal(parsed.apiKey, "test-key");
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.briefOnly, true);
});

test("callAgent gives clear error on connection failure", async () => {
  await assert.rejects(
    async () => {
      await callAgent(
        {
          type: "ollama",
          apiUrl: "http://127.0.0.1:59999",
          model: "llama3",
        },
        "system",
        "user"
      );
    },
    (err: any) => err instanceof Error && err.message.includes("Failed to connect")
  );
});
