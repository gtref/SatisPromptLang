# SatisPromptLang

SatisPromptLang is a small prompt-oriented language for describing software
features in `.ps` files. Its current MVP parses a description and compiles it
into a standalone HTML build brief containing a structured prompt that you can
copy into an AI coding assistant.

The HTML file is a handoff for an AI, **not** the generated application.
SatisPromptLang does not call an AI service or implement the described feature.
The first version supports HTML as its only target.

## What it does

- Keeps feature requirements, options, actions, and free-form notes in a
  readable `.ps` source file.
- Parses the source into a typed TypeScript AST.
- Creates a standalone HTML brief showing the specification and a copyable
  prompt for an AI coding assistant.
- Asks the AI to infer sensible details where the source leaves behavior
  unspecified.

## Requirements

- Node.js 20 or newer
- npm

## Quick start

Install dependencies and build the example:

```sh
npm install
npm start -- examples/music-player.ps
```

This writes `examples/music-player.html`. Open it in a browser to review the
brief and copy the AI prompt. See the [usage guide](USAGE.md) for the language
syntax, CLI options, and limitations.

To choose a different output path:

```sh
npm start -- examples/music-player.ps output/music-player.html
```

The output directory must already exist. If the output file already exists,
SatisPromptLang replaces it.

## Example

```text
// A simple music player for a personal music library.
music player options {
  autoplay: false
  initialVolume: 0.8
  repeat: "none"
  shuffle: false
  supportedFormats: ["mp3", "aac", "wav"]
  // Suggest any other useful options for a personal music player.
}

// Keep playback controls accessible and show the current track.
play {
  Start or resume the selected track.
}

pause {
  Pause playback without losing the current position.
}

toggleShuffle {}
```

Comments and action descriptions become context in the generated prompt.
Explicit option values are carried into it. An empty action asks the AI to
choose useful behavior for that action.

## Development

```sh
npm run build
npm test
```

`npm start` builds the TypeScript project before running the CLI. The generated
JavaScript is written to `dist/`.

## Project status

SatisPromptLang is an early MVP. It currently supports one feature declaration
per file, simple option values, action names with free-form descriptions, and
HTML brief generation. It does not generate application source code, execute
the prompt through an AI provider, or validate the behavior of an AI-generated
application.

Contributions and ideas are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md)
before opening a pull request.

## License

SatisPromptLang is available under the [MIT License](LICENSE).
