import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { generateHtml } from "./core/html-generator.js";
import { parsePromptScript } from "./core/parser.js";

function printUsage(): void {
  console.log("SatisPromptLang - compile a .ps prompt file to HTML");
  console.log("");
  console.log("Usage:");
  console.log("  npm start -- <file.ps> [output.html]");
  console.log("  npm start -- --help");
}

function main(args: string[]): number {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return args.length === 0 ? 1 : 0;
  }

  if (args.length < 1 || args.length > 2) {
    console.error("Expected a .ps input file and optional .html output file.");
    printUsage();
    return 1;
  }

  const inputPath = args[0];
  if (extname(inputPath).toLowerCase() !== ".ps") {
    console.error(`Expected a .ps file, received "${inputPath}".`);
    return 1;
  }

  const outputPath =
    args[1] ??
    join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.html`);
  if (extname(outputPath).toLowerCase() !== ".html") {
    console.error(`Expected an .html output file, received "${outputPath}".`);
    return 1;
  }

  try {
    const source = readFileSync(inputPath, "utf8");
    const program = parsePromptScript(source);
    writeFileSync(outputPath, generateHtml(program), "utf8");
    console.log(`Compiled ${inputPath} to ${outputPath}`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PromptScript: ${message}`);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));