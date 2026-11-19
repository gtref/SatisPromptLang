import { existsSync } from "node:fs";
import { extname } from "node:path";
import { buildApp } from "./core/builder.js";
import type { BuildTarget } from "./core/prompt-builder.js";

function printUsage(): void {
  console.log("SatisPromptLang - compile a .ps prompt file into an application using AI models & agents\n");
  console.log("Usage:");
  console.log("  npm run build -- <file.ps> [output] [flags]\n");
  console.log("Target Flags:");
  console.log("  --html            Build standalone HTML/CSS/JS application (default)");
  console.log("  --react           Build React application (components, state, styles)");
  console.log("  --next            Build Next.js application (App Router, components)");
  console.log("  --vite            Build Vite application (vite.config, index.html, src)");
  console.log("  --vue             Build Vue 3 application");
  console.log("  --svelte          Build Svelte application");
  console.log("  --target <name>   Custom application target\n");
  console.log("Model & Provider Flags:");
  console.log("  --model <model>   Specify ANY model name (e.g. llama-3.3-70b-versatile, gpt-4o, claude-3-5-sonnet)");
  console.log("  --groq            Use Groq API provider (https://api.groq.com/openai/v1)");
  console.log("  --ollama          Use local Ollama server (http://localhost:11434, no key needed)");
  console.log("  --openai          Use OpenAI API provider");
  console.log("  --anthropic       Use Anthropic API provider");
  console.log("  --gemini          Use Google Gemini API provider");
  console.log("  --agent <name>    Agent / provider preset to use from .env");
  console.log("  --api-url <url>   API URL override");
  console.log("  --api-key <key>   API Key override (not needed for Ollama or local servers)\n");
  console.log("General Options:");
  console.log("  -o, --out <path>  Output directory or file path");
  console.log("  --env-file <path> Custom path to .env file");
  console.log("  --dry-run         Print generated prompt and model config without calling API");
  console.log("  --brief           Generate HTML prompt brief only (original legacy mode)");
  console.log("  -h, --help        Show this help message\n");
  console.log("Examples:");
  console.log("  npm run build -- examples/music-player.ps --html");
  console.log("  npm run build -- examples/music-player.ps --react --groq --model llama-3.3-70b-versatile");
  console.log("  npm run build -- examples/music-player.ps --next --model gpt-4o");
  console.log("  npm run build -- examples/music-player.ps --vite --ollama --model codellama");
  console.log("  npm run build -- examples/music-player.ps --dry-run\n");
}

export interface ParsedCliArgs {
  inputPath?: string;
  outputPath?: string;
  target?: BuildTarget;
  agent?: string;
  model?: string;
  apiUrl?: string;
  apiKey?: string;
  envFile?: string;
  dryRun?: boolean;
  briefOnly?: boolean;
  help?: boolean;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const result: ParsedCliArgs = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--brief") {
      result.briefOnly = true;
    } else if (arg === "--html") {
      result.target = "html";
    } else if (arg === "--react") {
      result.target = "react";
    } else if (arg === "--next") {
      result.target = "next";
    } else if (arg === "--vite") {
      result.target = "vite";
    } else if (arg === "--vue") {
      result.target = "vue";
    } else if (arg === "--svelte") {
      result.target = "svelte";
    } else if (arg === "--target" && i + 1 < argv.length) {
      result.target = argv[++i];
    } else if (arg === "--groq") {
      result.agent = "groq";
    } else if (arg === "--ollama") {
      result.agent = "ollama";
    } else if (arg === "--openai") {
      result.agent = "openai";
    } else if (arg === "--anthropic") {
      result.agent = "anthropic";
    } else if (arg === "--gemini") {
      result.agent = "gemini";
    } else if ((arg === "--out" || arg === "-o") && i + 1 < argv.length) {
      result.outputPath = argv[++i];
    } else if (arg === "--agent" && i + 1 < argv.length) {
      result.agent = argv[++i];
    } else if (arg === "--model" && i + 1 < argv.length) {
      result.model = argv[++i];
    } else if (arg === "--api-url" && i + 1 < argv.length) {
      result.apiUrl = argv[++i];
    } else if (arg === "--api-key" && i + 1 < argv.length) {
      result.apiKey = argv[++i];
    } else if (arg === "--env-file" && i + 1 < argv.length) {
      result.envFile = argv[++i];
    } else if (arg.startsWith("-")) {
      console.warn(`Warning: Unknown option "${arg}".`);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length > 0) {
    result.inputPath = positionals[0];
  }
  if (positionals.length > 1 && !result.outputPath) {
    result.outputPath = positionals[1];
  }

  return result;
}

export async function main(args: string[]): Promise<number> {
  const parsed = parseCliArgs(args);

  if (parsed.help || args.length === 0) {
    printUsage();
    return parsed.help ? 0 : 1;
  }

  let inputPath = parsed.inputPath;

  if (!inputPath) {
    if (existsSync("examples/music-player.ps")) {
      console.log('No input file provided. Using default "examples/music-player.ps".');
      inputPath = "examples/music-player.ps";
    } else {
      console.error("Error: Missing input .ps file.");
      printUsage();
      return 1;
    }
  }

  if (extname(inputPath).toLowerCase() !== ".ps") {
    console.error(`Error: Expected a .ps file, received "${inputPath}".`);
    return 1;
  }

  try {
    const res = await buildApp({
      inputPath,
      outputPath: parsed.outputPath,
      target: parsed.target || "html",
      agent: parsed.agent,
      apiUrl: parsed.apiUrl,
      apiKey: parsed.apiKey,
      model: parsed.model,
      envFile: parsed.envFile,
      dryRun: parsed.dryRun,
      briefOnly: parsed.briefOnly,
    });

    if (res.message) {
      console.log(res.message);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nBuild error: ${message}`);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
