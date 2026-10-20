// launch-editor's guess.js ships without types: it returns the running
// editor's command first, then its arguments.
declare module "launch-editor/guess.js" {
  function guessEditor(specifiedEditor?: string): (string | undefined)[];
  export = guessEditor;
}
