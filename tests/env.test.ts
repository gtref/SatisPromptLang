import assert from "node:assert/strict";
import test from "node:test";
import {
  parseEnvContent,
  isApiKeyRequired,
  inferAgentType,
  resolveAgentConfig,
  getDefaultModel,
} from "../core/env.js";

test("parses .env file content with comments and quotes", () => {
  const envContent = `
# Comment line
API_URL="http://localhost:11434"
API_KEY=
MODEL='llama3'
TEMPERATURE=0.8 # inline comment
ESCAPED="hello\\nworld"
`;

  const parsed = parseEnvContent(envContent);
  assert.equal(parsed.API_URL, "http://localhost:11434");
  assert.equal(parsed.API_KEY, "");
  assert.equal(parsed.MODEL, "llama3");
  assert.equal(parsed.TEMPERATURE, "0.8");
  assert.equal(parsed.ESCAPED, "hello\nworld");
});

test("isApiKeyRequired correctly identifies servers that do not need an API key", () => {
  // Local servers and Ollama do NOT need an API key
  assert.equal(isApiKeyRequired("http://localhost:11434"), false);
  assert.equal(isApiKeyRequired("http://127.0.0.1:11434"), false);
  assert.equal(isApiKeyRequired("http://ollama-server:11434"), false);
  assert.equal(isApiKeyRequired("http://my-ollama.internal:8080"), false);
  assert.equal(isApiKeyRequired("http://localhost:1234/v1"), false); // LM Studio
  assert.equal(isApiKeyRequired("http://localhost:8000/v1"), false); // vLLM
  assert.equal(isApiKeyRequired("https://custom.com", "ollama"), false);

  // Cloud providers DO need an API key
  assert.equal(isApiKeyRequired("https://api.groq.com/openai/v1"), true);
  assert.equal(isApiKeyRequired("https://api.openai.com/v1"), true);
  assert.equal(isApiKeyRequired("https://api.anthropic.com/v1"), true);
  assert.equal(isApiKeyRequired("https://generativelanguage.googleapis.com/v1beta"), true);
});

test("inferAgentType detects groq and other known agent types", () => {
  assert.equal(inferAgentType("https://api.groq.com/openai/v1"), "groq");
  assert.equal(inferAgentType("http://localhost:11434"), "ollama");
  assert.equal(inferAgentType("https://api.openai.com/v1"), "openai");
  assert.equal(inferAgentType("https://api.anthropic.com/v1"), "anthropic");
  assert.equal(inferAgentType("https://generativelanguage.googleapis.com/v1beta"), "gemini");
  assert.equal(inferAgentType("http://localhost:1234/v1"), "generic");
  assert.equal(inferAgentType("http://localhost:1234/v1", "groq"), "groq");
});

test("resolveAgentConfig supports Groq with custom or any model", () => {
  const config = resolveAgentConfig({
    agent: "groq",
    apiKey: "gsk-mock-key-12345",
    model: "llama-3.3-70b-versatile",
  });

  assert.equal(config.type, "groq");
  assert.equal(config.apiUrl, "https://api.groq.com/openai/v1");
  assert.equal(config.apiKey, "gsk-mock-key-12345");
  assert.equal(config.model, "llama-3.3-70b-versatile");
});

test("resolveAgentConfig supports ANY custom model name", () => {
  const config = resolveAgentConfig({
    apiUrl: "http://localhost:11434",
    model: "deepseek-coder-v2:16b",
  });

  assert.equal(config.model, "deepseek-coder-v2:16b");
});

test("resolveAgentConfig succeeds without API key for Ollama and local servers", () => {
  const config = resolveAgentConfig({
    apiUrl: "http://localhost:11434",
    model: "llama3",
  });

  assert.equal(config.type, "ollama");
  assert.equal(config.apiUrl, "http://localhost:11434");
  assert.equal(config.model, "llama3");
  assert.equal(config.apiKey, undefined);
});

test("resolveAgentConfig throws error if API key is missing for cloud provider", () => {
  assert.throws(
    () => {
      resolveAgentConfig({
        apiUrl: "https://api.openai.com/v1",
        apiKey: "",
      });
    },
    (err: any) => err instanceof Error && err.message.includes("API_KEY is required")
  );
});
