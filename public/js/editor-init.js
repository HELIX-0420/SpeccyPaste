require(["vs/editor/editor.main"], function () {
  const expiryInfoEl = document.getElementById("expiryInfo");

  if (pasteId) {
    Promise.all([
      fetch(`/raw/${pasteId}`).then(res => res.ok ? res.text() : "// Paste not found"),
      fetch(`/meta/${pasteId}`).then(res => res.ok ? res.json() : {})
    ])
    .then(([code, meta]) => {
      const lang = meta.language || "plaintext";

      monacoEditor = monaco.editor.create(document.getElementById("editor"), {
        value: code,
        language: lang,
        theme: "vs-dark",
        fontSize: 14,
        lineNumbers: "on",
        automaticLayout: true,
        scrollBeyondLastLine: true,
        readOnly: true
      });

      document.getElementById("saveBtn").style.display = "none";
      document.getElementById("shareBtn").disabled = true;
      document.getElementById("language").disabled = true;
      document.getElementById("expiry").disabled = true;
      document.getElementById("language").value = lang;

      if (meta.expires) {
        startTimer(meta.expires, expiryInfoEl);
      }
    })
    .catch(() => {
      document.getElementById("editor").innerText = "// Failed to load paste";
    });

  } else {
    monacoEditor = monaco.editor.create(document.getElementById("editor"), {
      value: "// Paste your code here...",
      language: "plaintext",
      theme: "vs-dark",
      fontSize: 14,
      lineNumbers: "on",
      automaticLayout: true,
      scrollBeyondLastLine: true
    });

    document.getElementById("language").addEventListener("change", function () {
      monaco.editor.setModelLanguage(monacoEditor.getModel(), this.value);
    });
  }

  const showOnlyOnPastePage = ["copyBtn", "shareBtn", "rawBtn"];
  showOnlyOnPastePage.forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = pasteId ? "inline-block" : "none";
    }
  });

});
