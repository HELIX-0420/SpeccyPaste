require.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs"
  }
});

let monacoEditor;
const urlParts = window.location.pathname.split("/");
const pasteId = urlParts[1] === "p" ? urlParts[2] : null;
