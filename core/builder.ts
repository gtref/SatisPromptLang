import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { callAgent } from "./agent.js";
import { resolveAgentConfig, type CliConfigOverrides } from "./env.js";
import { extractFiles, type ExtractedFiles } from "./file-extractor.js";
import { generateHtml } from "./html-generator.js";
import { parsePromptScript } from "./parser.js";
import { buildAppPrompt, type BuildTarget } from "./prompt-builder.js";

export interface BuildOptions extends CliConfigOverrides {
  inputPath: string;
  outputPath?: string;
  target?: BuildTarget;
  dryRun?: boolean;
  briefOnly?: boolean;
}

export interface BuildResult {
  success: boolean;
  target: BuildTarget;
  outputPath: string;
  files: ExtractedFiles;
  modelUsed?: string;
  agentProvider?: string;
  message?: string;
}

/**
 * Executes the compilation of a .ps file into an application or HTML brief.
 */
export async function buildApp(options: BuildOptions): Promise<BuildResult> {
  const inputPath = resolve(options.inputPath);

  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: "${options.inputPath}"`);
  }

  if (extname(inputPath).toLowerCase() !== ".ps") {
    throw new Error(`Expected a .ps input file, received "${options.inputPath}".`);
  }

  const source = readFileSync(inputPath, "utf8");
  const program = parsePromptScript(source);
  const target: BuildTarget = (options.target || "html").toLowerCase();
  const baseName = basename(inputPath, extname(inputPath));
  const fileDir = dirname(inputPath);

  // If user explicitly asked for --brief, retain original HTML brief functionality
  if (options.briefOnly) {
    const briefOutputPath =
      options.outputPath || join(fileDir, `${baseName}.html`);
    const htmlContent = generateHtml(program);
    mkdirSync(dirname(briefOutputPath), { recursive: true });
    writeFileSync(briefOutputPath, htmlContent, "utf8");

    return {
      success: true,
      target: "brief",
      outputPath: briefOutputPath,
      files: { [basename(briefOutputPath)]: htmlContent },
      message: `Generated HTML build brief at "${briefOutputPath}".`,
    };
  }

  // Determine output directory or file path
  let finalOutputPath: string;
  const isHtmlTarget = target === "html";

  if (options.outputPath) {
    finalOutputPath = resolve(options.outputPath);
  } else {
    // Default output path
    if (isHtmlTarget) {
      finalOutputPath = join(fileDir, `${baseName}.html`);
    } else {
      finalOutputPath = join(fileDir, `${baseName}-${target}`);
    }
  }

  // Resolve agent configuration from .env and CLI overrides
  const agentConfig = resolveAgentConfig({
    agent: options.agent,
    apiUrl: options.apiUrl,
    apiKey: options.apiKey,
    model: options.model,
    envFile: options.envFile,
  });

  // Build the target prompt
  const { systemPrompt, userPrompt } = buildAppPrompt(program, target);

  // If dry-run, output the prompt and agent configuration without calling the API
  if (options.dryRun) {
    console.log(`\n[DRY RUN] Target: ${target}`);
    console.log(`[DRY RUN] Agent: ${agentConfig.type} (${agentConfig.apiUrl})`);
    console.log(`[DRY RUN] Model: ${agentConfig.model}`);
    console.log(`[DRY RUN] Output destination: ${finalOutputPath}`);
    console.log(`\n--- System Prompt ---\n${systemPrompt}`);
    console.log(`\n--- User Prompt ---\n${userPrompt}\n`);

    return {
      success: true,
      target,
      outputPath: finalOutputPath,
      files: {},
      modelUsed: agentConfig.model,
      agentProvider: agentConfig.type,
      message: "[DRY RUN] Prompt generated and validated successfully without calling agent API.",
    };
  }

  console.log(`Contacting agent [${agentConfig.type}] using model [${agentConfig.model}]...`);
  console.log(`Generating ${target.toUpperCase()} application for "${program.feature.name}"...`);

  const agentResult = await callAgent(agentConfig, systemPrompt, userPrompt);
  const files = extractFiles(agentResult.text, target);

  const fileCount = Object.keys(files).length;
  if (fileCount === 0) {
    throw new Error("Agent did not return any code files for the application.");
  }

  // Write out the generated files
  if (isHtmlTarget && (finalOutputPath.endsWith(".html") || finalOutputPath.endsWith(".htm"))) {
    // Write single HTML file
    mkdirSync(dirname(finalOutputPath), { recursive: true });
    const content = files["index.html"] || Object.values(files)[0];
    writeFileSync(finalOutputPath, content, "utf8");
    console.log(`\n✔ Successfully created ${finalOutputPath}`);
  } else {
    // Write into output directory
    mkdirSync(finalOutputPath, { recursive: true });

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(finalOutputPath, relPath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf8");
      console.log(`  + ${relPath}`);
    }

    console.log(`\n✔ Successfully generated ${fileCount} file(s) in "${finalOutputPath}"`);
  }

  return {
    success: true,
    target,
    outputPath: finalOutputPath,
    files,
    modelUsed: agentResult.model,
    agentProvider: agentResult.provider,
  };
}
