# SatisPromptLang usage guide

This guide covers the current MVP: writing a `.ps` feature description and
compiling it into a standalone HTML page containing a structured, copyable
prompt for an AI coding assistant.

SatisPromptLang does not contact an AI service or generate the described
application. The HTML output is a prompt brief, not a working music player or
other feature implementation.

## Install

Install [Node.js 20 or newer](https://nodejs.org/) and npm, then install the
project dependencies:

```sh
npm install
```

## Write a `.ps` file

Create a text file with the `.ps` extension. For example:

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

nextTrack {
  Move to the next track in the current queue.
}

toggleShuffle {}
```

### Feature declaration

Each file currently has one feature declaration:

```text
feature name options {
  optionName: value
}
```

The feature name is free-form text before the `options` keyword. The options
block is required, but it can be empty:

```text
music player options {
}
```

### Options

Options use `name: value` or `name = value`. Supported values are:

- Strings in double or single quotes, such as `"none"` or `'none'`
- Numbers, such as `0.8` or `42`
- Booleans: `true` and `false`
- `null`
- Arrays of supported values, such as `["mp3", "wav"]`
- Bare text, which is treated as a string

Use distinct option names within a feature. Each option can appear only once.

### Actions

An action is named with an identifier and braces. Add plain-language
requirements inside the block:

```text
play {
  Start or resume the selected track.
}
```

An empty action is valid:

```text
toggleShuffle {}
```

When an action has no description, the generated AI prompt asks the coding
assistant to infer and implement useful behavior. Action names can use letters,
numbers, underscores, and hyphens, and must start with a letter or underscore.
Action names must be unique within the file.

### Comments and free-form context

Use `//` for comments:

```text
// Keep controls accessible and keyboard-friendly.
```

Comments are included in the generated prompt as project context; they are not
discarded as ordinary source-code comments. Plain-text lines outside the
options block and action blocks are also retained as context.

## Compile to HTML

Run the CLI with the `.ps` source:

```sh
npm start -- examples/music-player.ps
```

The default output is written beside the source file with an `.html` extension:
`examples/music-player.html`.

Specify a different output path if you want:

```sh
npm start -- examples/music-player.ps output/music-player.html
```

The input must end in `.ps` and the output must end in `.html` (extensions are
case-insensitive). The parent directory for a custom output path must already
exist. An existing output file is overwritten.

To see CLI help:

```sh
npm start -- --help
```

## Use the generated brief

Open the generated HTML file in a browser. It contains:

1. A readable summary of the feature, context, options, and actions.
2. A complete prompt that specifies a standalone HTML/CSS/JavaScript target.
3. A **Copy prompt** button, with a manual selection fallback if clipboard
   access is unavailable.

Paste the prompt into an AI coding assistant to request an implementation. The
prompt carries specified option values and action descriptions forward and
asks the AI to fill in unspecified details.

## Build and test the project

```sh
npm run build
npm test
```

TypeScript build output is placed in `dist/`. `npm start` performs a build
before running the CLI.

## Current limitations

- HTML is the only supported output target.
- The output is an AI prompt brief, not application code.
- There is no AI provider integration.
- Only one feature declaration is supported per file.
- The syntax is intentionally small and does not include conditions, loops,
  typed declarations, or executable expressions.
- Prompt instructions should be written as plain text in comments or action
  bodies; they are passed through as context rather than interpreted as code.
