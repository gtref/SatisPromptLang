// src/core/agent.ts
// Re‑implemented from the compiled JavaScript with error‑wrapping fixes.

export interface AgentConfig {
  type: string;
  apiUrl: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callAgent(
  config: AgentConfig,
  systemPrompt: string,
  userPrompt: string
) {
  switch (config.type) {
    case "groq":
      return callGroq(config, systemPrompt, userPrompt);
    case "ollama":
      return callOllama(config, systemPrompt, userPrompt);
    case "anthropic":
      return callAnthropic(config, systemPrompt, userPrompt);
    case "gemini":
      return callGemini(config, systemPrompt, userPrompt);
    case "openai":
    case "generic":
    default:
      return callOpenAI(config, systemPrompt, userPrompt);
  }
}

async function callGroq(config: AgentConfig, systemPrompt: string, userPrompt: string) {
  let url = config.apiUrl.replace(/\/+$/, "");
  if (!url.endsWith("/chat/completions")) {
    url = url.endsWith("/v1") ? `${url}/chat/completions` : `${url}/chat/completions`;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey || ""}`,
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 4096,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Groq API error (${res.status} ${res.statusText}): ${errText || "No response body"}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response from Groq API: choices[0].message.content was missing");
    }
    return { text: content, model: config.model, provider: "groq" };
  } catch (err: any) {
    if (err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED") {
      throw new Error(`Failed to connect to Groq API at ${url}. Check your internet connection or API_URL.`);
    }
    throw err;
  }
}

async function callOllama(config: AgentConfig, systemPrompt: string, userPrompt: string) {
  const baseUrl = config.apiUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: { temperature: config.temperature ?? 0.7 },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.message?.content) {
        return { text: data.message.content, model: config.model, provider: "ollama" };
      }
    }
  } catch (err: any) {
    if (err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED") {
      throw new Error(`Failed to connect to Ollama at ${baseUrl}. Ensure Ollama is running (e.g. run "ollama serve" or start the Ollama app).`);
    }
    throw err;
  }
  // Fallback to /api/generate if /api/chat didn't succeed
  try {
    const genRes = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: { temperature: config.temperature ?? 0.7 },
      }),
    });
    if (genRes.ok) {
      const data = await genRes.json();
      if (data?.response) {
        return { text: data.response, model: config.model, provider: "ollama" };
      }
    } else {
      const errText = await genRes.text().catch(() => "");
      throw new Error(`Ollama error (${genRes.status}): ${errText || genRes.statusText}`);
    }
  } catch (err: any) {
    if (err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED") {
      throw new Error(`Failed to connect to Ollama at ${baseUrl}. Ensure Ollama is running (e.g. run "ollama serve" or start the Ollama app).`);
    }
    throw err;
  }
  throw new Error(`Ollama returned an unexpected empty response from ${baseUrl}`);
}

async function callOpenAI(config: AgentConfig, systemPrompt: string, userPrompt: string) {
  let url = config.apiUrl.replace(/\/+$/, "");
  if (!url.endsWith("/chat/completions")) {
    url = url.endsWith("/v1") ? `${url}/chat/completions` : `${url}/chat/completions`;
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 4096,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AI API error (${res.status} ${res.statusText}): ${errText || "No response body"}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response from API: choices[0].message.content was missing");
    }
    return { text: content, model: config.model, provider: config.type };
  } catch (err: any) {
    if (err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED") {
      throw new Error(`Failed to connect to model server at ${url}. Check your API_URL in .env and verify the server is running.`);
    }
    throw err;
  }
}

async function callAnthropic(config: AgentConfig, systemPrompt: string, userPrompt: string) {
  let url = config.apiUrl.replace(/\/+$/, "");
  if (!url.endsWith("/messages")) {
    url = `${url}/messages`;
  }
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": config.apiKey || "",
    "anthropic-version": "2023-06-01",
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic API error (${res.status}): ${errText || res.statusText}`);
    }
    const data = await res.json();
    const textParts = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text);
    return { text: textParts.join("\n"), model: config.model, provider: "anthropic" };
  } catch (err: any) {
    if (err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED") {
      throw new Error(`Failed to connect to Anthropic API at ${url}.`);
    }
    throw err;
  }
}

async function callGemini(config: AgentConfig, systemPrompt: string, userPrompt: string) {
  const baseUrl = config.apiUrl.replace(/\/+$/, "");
  const model = config.model || "gemini-1.5-flash";
  const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey || "")}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 4096,
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini API error (${res.status}): ${errText || res.statusText}`);
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: any) => p.text).join("\n");
    return { text, model: config.model, provider: "gemini" };
  } catch (err: any) {
    if (err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED") {
      throw new Error(`Failed to connect to Gemini API at ${baseUrl}.`);
    }
    throw err;
  }
}
