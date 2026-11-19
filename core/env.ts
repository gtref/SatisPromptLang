import { existsSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

export interface AgentConfig {
  name?: string;
  type: "ollama" | "openai" | "anthropic" | "gemini" | "groq" | "generic";
  apiUrl: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CliConfigOverrides {
  agent?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  envFile?: string;
}

/**
 * Parses the content of a .env file into key-value pairs.
 */
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

    // Remove quotes if present
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
      // Unescape newlines if double-quoted
      if (line.slice(eqIdx + 1).trim().startsWith('"')) {
        val = val
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t");
      }
    } else {
      // Strip inline comments if not in quotes
      const commentIdx = val.indexOf("#");
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
    }

    result[key] = val;
  }

  return result;
}

/**
 * Finds and loads a .env file into process.env if not already set.
 */
export function loadEnv(customPath?: string): Record<string, string> {
  let envPath: string | null = null;

  if (customPath) {
    const resolved = resolve(customPath);
    if (existsSync(resolved)) {
      envPath = resolved;
    }
  } else {
    // Search in current directory, parent directories, or project root
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

  if (!envPath) {
    return {};
  }

  try {
    const content = readFileSync(envPath, "utf8");
    const parsed = parseEnvContent(content);

    for (const [key, val] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }

    return parsed;
  } catch {
    return {};
  }
}

/**
 * Determines whether an API key is required based on the API URL and agent type.
 * Ollama, LM Studio, vLLM, localhost, and local model servers do not require an API key.
 */
export function isApiKeyRequired(apiUrl: string, agentType?: string): boolean {
  if (agentType === "ollama") return false;

  const urlLower = apiUrl.toLowerCase();
  if (
    urlLower.includes("localhost") ||
    urlLower.includes("127.0.0.1") ||
    urlLower.includes("0.0.0.0") ||
    urlLower.includes(":11434") ||
    urlLower.includes("ollama") ||
    urlLower.includes(":1234") || // LM Studio
    urlLower.includes(":8000") || // vLLM / LocalAI
    urlLower.includes(":8080") ||
    urlLower.includes(":5000")
  ) {
    return false;
  }

  return true;
}

/**
 * Infers agent/provider type from URL, environment, or explicit type.
 */
export function inferAgentType(apiUrl: string, explicitType?: string): AgentConfig["type"] {
  if (explicitType) {
    const norm = explicitType.toLowerCase().trim();
    if (norm === "groq") return "groq";
    if (norm === "ollama") return "ollama";
    if (norm === "openai") return "openai";
    if (norm === "anthropic" || norm === "claude") return "anthropic";
    if (norm === "gemini" || norm === "google") return "gemini";
    return "generic";
  }

  const urlLower = apiUrl.toLowerCase();
  if (urlLower.includes("groq.com")) {
    return "groq";
  }
  if (urlLower.includes("ollama") || urlLower.includes(":11434")) {
    return "ollama";
  }
  if (urlLower.includes("anthropic.com")) {
    return "anthropic";
  }
  if (urlLower.includes("googleapis.com") || urlLower.includes("gemini")) {
    return "gemini";
  }
  if (urlLower.includes("openai.com")) {
    return "openai";
  }

  return "generic";
}

/**
 * Default models for known providers if none specified.
 * Any arbitrary model name can be specified by the user for any provider.
 */
export function getDefaultModel(type: AgentConfig["type"]): string {
  switch (type) {
    case "groq":
      return "openai/gpt-oss-120b";
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

/**
 * Resolves the agent/model configuration from environment variables and CLI overrides.
 * Supports ANY model, Groq, Ollama, OpenAI, Anthropic, Gemini, or any custom API URL.
 */
export function resolveAgentConfig(overrides: CliConfigOverrides = {}): AgentConfig {
  loadEnv(overrides.envFile);

  const selectedAgentName = overrides.agent || process.env.AGENT || process.env.AGENT_NAME;
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

  // If GROQ_API_KEY is present and no type/URL is set, auto-detect groq
  if (!rawType && !overrides.apiUrl && !process.env.API_URL && process.env.GROQ_API_KEY) {
    rawType = "groq";
  }

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

  // Supports ANY model name specified by the user
  const model =
    overrides.model ||
    (prefix ? process.env[`${prefix}MODEL`] : undefined) ||
    (type === "groq" ? process.env.GROQ_MODEL : undefined) ||
    process.env.MODEL ||
    process.env.AI_MODEL ||
    process.env.AGENT_MODEL ||
    getDefaultModel(type);

  const tempStr =
    (prefix ? process.env[`${prefix}TEMPERATURE`] : undefined) ||
    process.env.TEMPERATURE;
  const temperature = tempStr ? parseFloat(tempStr) : 0.7;

  const maxTokensStr =
    (prefix ? process.env[`${prefix}MAX_TOKENS`] : undefined) ||
    process.env.MAX_TOKENS;
  const maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : 4096;

  // Validate API key requirement
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
