import assert from "node:assert/strict";
import test from "node:test";
import { extractFiles, sanitizeRelativePath } from "../core/file-extractor.js";

test("sanitizeRelativePath protects against path traversal and cleans paths", () => {
  assert.equal(sanitizeRelativePath("../secret.txt"), "secret.txt");
  assert.equal(sanitizeRelativePath("src/../../evil.js"), "evil.js");
  assert.equal(sanitizeRelativePath("./src/App.jsx"), "src/App.jsx");
  assert.equal(sanitizeRelativePath("C:/Users/app.js"), "Users/app.js");
  assert.equal(sanitizeRelativePath("/absolute/path.js"), "absolute/path.js");
});

test("extractFiles extracts multiple files with markdown headers", () => {
  const llmResponse = `Here is the React application:

### \`package.json\`
\`\`\`json
{
  "name": "my-app",
  "version": "1.0.0"
}
\`\`\`

### \`src/App.jsx\`
\`\`\`jsx
export default function App() {
  return <h1>Hello World</h1>;
}
\`\`\`
`;

  const files = extractFiles(llmResponse, "react");
  assert.equal(Object.keys(files).length, 2);
  assert.ok(files["package.json"]);
  assert.match(files["package.json"], /"name": "my-app"/);
  assert.ok(files["src/App.jsx"]);
  assert.match(files["src/App.jsx"], /Hello World/);
});

test("extractFiles extracts files with path in code block info string", () => {
  const llmResponse = `
\`\`\`jsx path=src/App.jsx
import React from 'react';
export default function App() { return <div>Player</div>; }
\`\`\`

\`\`\`css path=src/index.css
body { margin: 0; }
\`\`\`
`;

  const files = extractFiles(llmResponse, "react");
  assert.ok(files["src/App.jsx"]);
  assert.ok(files["src/index.css"]);
  assert.match(files["src/App.jsx"], /Player/);
  assert.match(files["src/index.css"], /margin: 0/);
});

test("extractFiles extracts raw HTML for --html target", () => {
  const rawHtml = `<!DOCTYPE html>
<html lang="en">
<head><title>App</title></head>
<body><h1>Music Player</h1></body>
</html>`;

  const files = extractFiles(rawHtml, "html");
  assert.ok(files["index.html"]);
  assert.match(files["index.html"], /Music Player/);
});

test("extractFiles extracts code block HTML for --html target", () => {
  const response = `Here is your app:
\`\`\`html
<!DOCTYPE html>
<html>
<body><h1>Player</h1></body>
</html>
\`\`\`
`;

  const files = extractFiles(response, "html");
  assert.ok(files["index.html"]);
  assert.match(files["index.html"], /Player/);
});
