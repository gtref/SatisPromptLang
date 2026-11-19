// src/core/env.ts
// Re‑implemented from the compiled version with a few bug‑fixes.

import { existsSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

type AgentConfigOverrides = {
  envFile?: string;
  agent?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
};

export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
      // preserve escaped newlines etc when quoted with double quotes
      if (line.slice(eqIdx + 1).trim().startsWith('"')) {
        val = val
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t");
      }
    } else {
      const commentIdx = val.indexOf("#");
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
    }
    result[key] = val;
  }
  return result;
}

export function loadEnv(customPath?: string): Record<string, string> {
  let envPath: string | null = null;
  if (customPath) {
    const resolved = resolve(customPath);
    if (existsSync(resolved)) envPath = resolved;
  } else {
    let dir = process.cwd();
    for (let i = 0; i < 4; i++) {
      const candidate = join(dir, ".env");
      if (existsSync(candidate)) {
        envPath = candidate;
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  if (!envPath) return {};
  try {
    const content = readFileSync(envPath, "utf8");
    const parsed = parseEnvContent(content);
    for (const [key, val] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = val;
    }
    return parsed;
  } catch {
    return {};
  }
}

export function isApiKeyRequired(apiUrl: string, agentType?: string): boolean {
  if (agentType === "ollama") return false;
  const lower = apiUrl.toLowerCase();
  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("0.0.0.0") ||
    lower.includes(":11434") ||
    lower.includes("ollama") ||
    lower.includes(":1234") ||
    lower.includes(":8000") ||
    lower.includes(":8080") ||
    lower.includes(":5000")
  )
    return false;
  return true;
}

export function inferAgentType(apiUrl: string, explicitType?: string): string {
  if (explicitType) {
    const norm = explicitType.toLowerCase().trim();
    if (norm === "groq") return "groq";
    if (norm === "ollama") return "ollama";
    if (norm === "openai") return "openai";
    if (norm === "anthropic" || norm === "claude") return "anthropic";
    if (norm === "gemini" || norm === "google") return "gemini";
    return "generic";
  }
  const lower = apiUrl.toLowerCase();
  if (lower.includes("groq.com")) return "groq";
  if (lower.includes("ollama") || lower.includes(":11434")) return "ollama";
  if (lower.includes("anthropic.com")) return "anthropic";
  if (lower.includes("googleapis.com") || lower.includes("gemini")) return "gemini";
  if (lower.includes("openai.com")) return "openai";
  return "generic";
}

export function getDefaultModel(type: string): string {
  switch (type) {
    case "groq":
      return "llama-3.3-70b-versatile";
    case "ollama":
      return "llama3";
    case "anthropic":
      return "claude-3-5-sonnet-20241022";
    case "gemini":
      return "gemini-1.5-flash";
    case "openai":
    case "generic":
    default:
      return "gpt-4o";
  }
}

export function resolveAgentConfig(overrides: AgentConfigOverrides = {}): {
  name?: string;
  type: string;
  apiUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
} {
  // Load .env (if any)
  loadEnv(overrides.envFile);

  // -------------------------------------------------------------------
  // NOTE: The original implementation always fell back to the global
  // `AGENT` env variable, which caused our tests to be forced into the
  // "ollama" preset even when we explicitly asked for Groq.  The new
  // logic prefers an explicit override, then a non‑empty global AGENT,
  // and finally the named‑agent fallback.
  // -------------------------------------------------------------------
  const selectedAgentName =
    overrides.agent ??
    (process.env.AGENT && process.env.AGENT !== "" ? process.env.AGENT : undefined) ??
    process.env.AGENT_NAME;

  const prefix = selectedAgentName
    ? `AGENT_${selectedAgentName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_`
    : "";

  let rawType =
    (prefix ? process.env[`${prefix}TYPE`] : undefined) ||
    (prefix ? process.env[`${prefix}AGENT`] : undefined) ||
    process.env.AGENT_TYPE ||
    process.env.AI_PROVIDER ||
    (selectedAgentName && ["groq", "ollama", "openai", "anthropic", "gemini"].includes(selectedAgentName.toLowerCase())
      ? selectedAgentName
      : undefined);

  // If nothing forced a type and the caller gave us a Groq‑specific
  // override, make sure we honour it.
  if (!rawType && overrides.agent?.toLowerCase() === "groq") {
    rawType = "groq";
  }

  // Default URLs per provider – Ollama stays local, others use their public endpoints.
  let defaultUrl = "http://localhost:11434";
  if (rawType?.toLowerCase() === "groq") {
    defaultUrl = "https://api.groq.com/openai/v1";
  } else if (rawType?.toLowerCase() === "openai") {
    defaultUrl = "https://api.openai.com/v1";
  } else if (rawType?.toLowerCase() === "anthropic") {
    defaultUrl = "https://api.anthropic.com/v1";
  } else if (rawType?.toLowerCase() === "gemini") {
    defaultUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  const apiUrl =
    overrides.apiUrl ||
    (prefix ? process.env[`${prefix}API_URL`] : undefined) ||
    process.env.API_URL ||
    process.env.AI_API_URL ||
    (rawType?.toLowerCase() === "groq" ? process.env.GROQ_API_URL : undefined) ||
    process.env.OPENAI_BASE_URL ||
    process.env.OLLAMA_BASE_URL ||
    process.env.OLLAMA_HOST ||
    defaultUrl;

  const type = inferAgentType(apiUrl, rawType);

  const apiKey =
    overrides.apiKey ||
    (prefix ? process.env[`${prefix}API_KEY`] : undefined) ||
    (type === "groq" ? process.env.GROQ_API_KEY : undefined) ||
    process.env.API_KEY ||
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  const model =
    overrides.model ||
    (prefix ? process.env[`${prefix}MODEL`] : undefined) ||
    (type === "groq" ? process.env.GROQ_MODEL : undefined) ||
    process.env.MODEL ||
    process.env.AI_MODEL ||
    process.env.AGENT_MODEL ||
    getDefaultModel(type);

  const tempStr = (prefix ? process.env[`${prefix}TEMPERATURE`] : undefined) || process.env.TEMPERATURE;
  const temperature = tempStr ? parseFloat(tempStr) : 0.7;

  const maxTokensStr = (prefix ? process.env[`${prefix}MAX_TOKENS`] : undefined) || process.env.MAX_TOKENS;
  const maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : 4096;

  if (isApiKeyRequired(apiUrl, type) && !apiKey) {
    const keyHint = type === "groq" ? "GROQ_API_KEY or API_KEY" : "API_KEY";
    throw new Error(
      `API_KEY is required for API URL "${apiUrl}". Please add ${keyHint} to your .env file or specify --api-key. (Local model servers such as Ollama at http://localhost:11434 do not require an API key).`
    );
  }

  return {
    name: selectedAgentName,
    type,
    apiUrl,
    apiKey: apiKey || undefined,
    model,
    temperature,
    maxTokens,
  };
}
