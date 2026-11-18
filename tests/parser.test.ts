import assert from "node:assert/strict";
import test from "node:test";
import { generateHtml } from "../core/html-generator.js";
import { parsePromptScript, ParseError } from "../core/parser.js";

test("parses a feature, typed options, actions, and prompt comments", () => {
  const program = parsePromptScript(`// Build a small player.
music player options {
  autoplay: false
  initialVolume: 0.8
  repeat: "none"
  formats: ["mp3", "wav"]
}

play {
  Start the current track.
}
`);

  assert.equal(program.feature.name, "music player");
  assert.deepEqual(program.context, [{ kind: "PromptText", value: "Build a small player." }]);
  assert.deepEqual(
    program.feature.options.map(({ name, value }) => [name, value]),
    [
      ["autoplay", { kind: "Literal", value: false }],
      ["initialVolume", { kind: "Literal", value: 0.8 }],
      ["repeat", { kind: "Literal", value: "none" }],
      [
        "formats",
        {
          kind: "ArrayLiteral",
          elements: [
            { kind: "Literal", value: "mp3" },
            { kind: "Literal", value: "wav" },
          ],
        },
      ],
    ],
  );
  assert.deepEqual(program.feature.actions, [
    {
      kind: "ActionDeclaration",
      name: "play",
      body: [{ kind: "PromptText", value: "Start the current track." }],
    },
  ]);
});

test("reports an unclosed options block", () => {
  assert.throws(
    () => parsePromptScript("music player options {\n  autoplay: false"),
    (error: unknown) => error instanceof ParseError && error.message === "Unclosed options block",
  );
});

test("compiles prompt content into a copyable, AI-ready HTML brief", () => {
  const program = parsePromptScript(`music player options {
  title: "</textarea><script>alert(1)</script>"
}
play {}
`);
  const html = generateHtml(program);

  assert.match(html, /Copy prompt/);
  assert.match(html, /id="ai-prompt"/);
  assert.match(html, /Build a complete, polished, accessible, responsive HTML application/);
  assert.match(html, /No behavior was specified; infer and implement a useful behavior/);
  assert.match(html, /&lt;\/textarea&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /data-action=/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /navigator\.clipboard\.writeText/);
});

test("keeps comments as prompt context and asks AI to infer unspecified options", () => {
  const program = parsePromptScript(`music player options {
  // Come up with sensible options for a music player.
}
play {}
`);
  const html = generateHtml(program);

  assert.match(html, /Come up with sensible options for a music player/);
  assert.match(html, /No options were specified\. Choose sensible defaults/);
});
