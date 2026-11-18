# Contributing to SatisPromptLang

Thanks for your interest in contributing. SatisPromptLang is an early MVP, so
focused bug fixes, syntax improvements, tests, and clear documentation are
especially useful.

## Before you start

- Check the README and [usage guide](USAGE.md) to understand the current scope.
- For a large feature or a change to the language syntax, open an issue or
  discussion first so the intended behavior can be agreed on.
- Keep changes focused. Avoid adding AI-provider integrations, new output
  targets, or unrelated dependencies without first discussing the design.

## Development setup

Requirements: Node.js 20 or newer and npm.

```sh
git clone <repository-url>
cd SatisPromptLang
npm install
```

Build and run tests:

```sh
npm run build
npm test
```

The CLI can be exercised with the example source:

```sh
npm start -- examples/music-player.ps
```

This writes `examples/music-player.html`; review generated output locally and
avoid committing generated files unless a change specifically calls for it.

## Making a change

1. Make the smallest change that fully addresses the issue.
2. Add or update tests for changes to parsing or HTML/prompt generation. Tests
   are in `tests/`.
3. Update the README or usage guide if user-visible behavior or syntax changes.
4. Run `npm test` and verify the CLI for changes that affect the build flow.
5. Review your diff for accidental generated files, unrelated edits, and
   temporary output.

Keep the language approachable for people writing prompts rather than
traditional application code. Preserve user-authored text in the generated
prompt, distinguish explicit requirements from inferred details, and escape
user content when rendering HTML.

## Pull requests

Please include:

- A concise summary of the problem and the change.
- Any relevant issue or design discussion.
- Test commands run and their results.
- A note about syntax or output changes that users should know about.

Keep pull requests focused and ensure they do not imply that SatisPromptLang
generates or runs an application when it only creates an AI build brief.

## License

By contributing, you agree that your contributions are provided under the
project's [MIT License](LICENSE).
