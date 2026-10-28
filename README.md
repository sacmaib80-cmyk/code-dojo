# Code Dojo

A coding drill site built to tutor classmates before a programming exam. The hosted version has since grown into a shared coding workspace.

![Code Dojo home](screens/dojo-home.png)

## What is inside

- **217 exercises across 21 stages**, from variables and branching through algorithms and unit tests.
- **Progressive locks.** A stage opens after the previous one reaches 70%, making skipped fundamentals visible.
- **Explanations, not answer dumps.** Incorrect choices give a reason and a directional hint.
- **TOI A1/A2 practice** and a final 29-exercise unit-testing stage with a small browser test runner.
- **Responsive tables and code panels** verified across all 21 stages at desktop, tablet, and phone widths.
- **Readable code examples.** A custom TypeScript highlighter adds VS Code Dark+ style tokens and bracket-pair colours to the lessons and code editor. It is optional, so the exercises still run if the script cannot load.
- **Static exercise app.** The exercises need no packages or build step.

## New in the hosted version: shared rooms

The [live site](https://sakuraq-b7f96.web.app/dojo/) also has two shared rooms for tutoring sessions. The room and flowchart modules are part of the deployed site; this repository is the curated source for the standalone exercise app.

### Code room

Several people edit the same TypeScript files at once. Each person has their own caret, mouse pointer, and name. Run executes the last saved version of every file, follows imports between them, and prints to a browser terminal.

![Three people in one code room: two remote carets, a remote pointer, and the output of a run](screens/dojo-code-room.png)

Type errors are underlined as people type. Hovering one shows the compiler message and a short Thai explanation under it.

![A TypeScript type error with the compiler message and a Thai explanation](screens/dojo-code-error.png)

### Flowchart room

The same group can draw a flowchart on a shared board. Everyone sees who is selecting which shape and where their pointer is.

![Three people on one flowchart board: one selecting the decision shape, one selecting a note](screens/dojo-flow-room.png)

*The screenshots show a demo session: three separate browser sessions in a temporary room, with sample names and scores. Rooms are opened by the site owner for a session, so visitors cannot open one from this page.*

## Open it

- [Live site](https://sakuraq-b7f96.web.app/dojo/)
- Or download this repository and open `index.html` in a browser. Keep `lib/tsdark.js` beside it for syntax highlighting.

## Stack

HTML · CSS · JavaScript · no build step

## Honest notes

This was used in real tutoring sessions, but it has no usage analytics. The exercise count is generated from the current source rather than estimated from an older README.
