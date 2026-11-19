import { posix } from "node:path";

export interface ExtractedFiles {
  [filePath: string]: string;
}

/**
 * Sanitizes a relative file path to ensure it doesn't traverse directories or contain unsafe segments.
 */
export function sanitizeRelativePath(rawPath: string): string {
  let cleaned = rawPath
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\\/g, "/")
    .replace(/^[a-zA-Z]:\/?/, "") // Remove drive letters
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/^\.\//, ""); // Remove leading ./

  // Normalize path
  cleaned = posix.normalize(cleaned);

  // Prevent path traversal outside root
  if (cleaned.startsWith("..") || cleaned.includes("/../") || cleaned === ".") {
    cleaned = cleaned.replace(/\.\.\/?/g, "");
  }

  // Fallback if empty or invalid
  if (!cleaned || cleaned === "/" || cleaned === ".") {
    return "generated-file.txt";
  }

  return cleaned;
}

/**
 * Extracts individual files from markdown code blocks or raw code returned by the AI agent.
 */
export function extractFiles(content: string, target: string): ExtractedFiles {
  const files: ExtractedFiles = {};

  // Normalize newlines
  const text = content.replace(/\r\n/g, "\n");

  // Pattern A: Look for markdown headings/text preceding code blocks
  // e.g.:
  // ### `src/App.jsx`
  // ```jsx
  // ...
  // ```
  // OR File: `src/App.jsx`
  // OR ```jsx path=src/App.jsx
  // OR ```jsx file="src/App.jsx"
  // OR ```jsx src/App.jsx
  const codeBlockRegex = /(?:(?:(?:###|\*\*|File:?|Filename:?)\s*[`*]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)[`*]?\s*\n\s*)?```(?:([a-zA-Z0-9_\-+]+)(?:[ \t]+(?:path=|file=|filename=)?["'`]?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)["'`]?)?)?\n([\s\S]*?)```)/g;

  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const headerPath = match[1];
    const lang = match[2];
    const infoPath = match[3];
    const code = match[4];

    let filePath = infoPath || headerPath;

    // Check if the first line of code specifies the file path (e.g. // filename: src/App.jsx or <!-- file: index.html -->)
    if (!filePath) {
      const firstLineMatch = code.match(/^(?:\/\/|#|<!--|\/\*)\s*(?:file(?:name)?|path):\s*([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)/i);
      if (firstLineMatch) {
        filePath = firstLineMatch[1];
      }
    }

    if (filePath) {
      const cleanPath = sanitizeRelativePath(filePath);
      files[cleanPath] = code.trim();
    } else if (Object.keys(files).length === 0) {
      // If no path was identified, assign an intelligent default based on language or target
      const inferredPath = inferFilenameFromLangOrTarget(lang, target);
      files[inferredPath] = code.trim();
    }
  }

  // If no code blocks were found, check if the content itself is raw code
  if (Object.keys(files).length === 0) {
    const trimmed = text.trim();
    if (target === "html" || trimmed.includes("<!DOCTYPE") || trimmed.includes("<!doctype") || trimmed.includes("<html")) {
      // Extract from <!doctype or <html to </html>
      const htmlMatch = trimmed.match(/<!doctype[\s\S]*?<\/html>|<html[\s\S]*?<\/html>/i);
      files["index.html"] = htmlMatch ? htmlMatch[0] : trimmed;
    } else {
      const defaultFilename = inferFilenameFromLangOrTarget(undefined, target);
      files[defaultFilename] = trimmed;
    }
  }

  // Special handling for HTML target: Ensure index.html exists
  if (target === "html" && !files["index.html"]) {
    // If there's any .html file, or only one file, make it accessible
    const htmlKey = Object.keys(files).find((f) => f.endsWith(".html"));
    if (htmlKey) {
      files["index.html"] = files[htmlKey];
    }
  }

  return files;
}

/**
 * Infers a sensible filename from code block language tag or build target.
 */
function inferFilenameFromLangOrTarget(lang?: string, target?: string): string {
  const normTarget = (target || "").toLowerCase();

  if (normTarget === "html") return "index.html";
  if (normTarget === "react") return "src/App.jsx";
  if (normTarget === "next") return "app/page.jsx";
  if (normTarget === "vite") return "src/App.jsx";
  if (normTarget === "vue") return "src/App.vue";
  if (normTarget === "svelte") return "src/App.svelte";

  if (lang) {
    const l = lang.toLowerCase();
    if (l === "html") return "index.html";
    if (l === "jsx" || l === "tsx") return "src/App." + l;
    if (l === "vue") return "src/App.vue";
    if (l === "svelte") return "src/App.svelte";
    if (l === "css") return "styles.css";
    if (l === "json") return "package.json";
    if (l === "js") return "index.js";
    if (l === "ts") return "index.ts";
  }

  return "index.html";
}
