# type-tune plan

Project: `tsconfig.json`
Created: `2026-11-18T04:43:13.8384261Z`
Candidates: 2

## Candidates

- [apply] 1f916ad49360 `OptionValueNode`
  - kind: `typeAlias`
  - from: `core/nodes.ts`
  - to: `core/types/core.ts`
  - referrers: 3
  - local dependencies: `LiteralNode`, `ArrayLiteralNode`
  - strategies:
    - `core/html-generator.ts`: `relative` import `./types/core.js`
    - `core/parser.ts`: `relative` import `./types/core.js`
    - `core/prompt-builder.ts`: `relative` import `./types/core.js`

- [apply] 7aa3275e412d `ProgramNode`
  - kind: `interface`
  - from: `core/nodes.ts`
  - to: `core/types/core.ts`
  - referrers: 3
  - local dependencies: `ActionDeclarationNode`, `LiteralNode`, `OptionValueNode`, `FeatureDeclarationNode`, `ArrayLiteralNode`, `OptionDeclarationNode`, `PromptTextNode`
  - strategies:
    - `core/html-generator.ts`: `relative` import `./types/core.js`
    - `core/parser.ts`: `relative` import `./types/core.js`
    - `core/prompt-builder.ts`: `relative` import `./types/core.js`
