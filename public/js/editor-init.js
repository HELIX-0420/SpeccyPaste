require(["vs/editor/editor.main"], function () {
  const expiryInfoEl = document.getElementById("expiryInfo");

  window.__hideSensitive__ = true;
  let decorations = [];
  const ipTokenRegex = /\b\d{1,3}(?:\.\d{1,3}){3}\b|(?:token|api[_-]?key|authorization)[:=]?\s*["']?[a-z0-9\-_\.]{16,}["']?/gi;

  function updateDecorations(redactedMode = false) {
    const model = monacoEditor.getModel();
    const code = model.getValue();
    const matches = [...code.matchAll(ipTokenRegex)];

    if (decorations.length > 0) {
      decorations = monacoEditor.deltaDecorations(decorations, []);
    }

    const newDecorations = matches.map(match => {
      const start = model.getPositionAt(match.index);
      const end = model.getPositionAt(match.index + match[0].length);

      return {
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: {
          inlineClassName: redactedMode ? 'fogged-token' : 'highlight-token',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      };
    });

    decorations = monacoEditor.deltaDecorations([], newDecorations);
  }

  if (pasteId) {
    Promise.all([
      fetch(`/raw/${pasteId}`).then(res => res.ok ? res.text() : "// Paste not found"),
      fetch(`/meta/${pasteId}`).then(res => res.ok ? res.json() : {})
    ])
    .then(([code, meta]) => {
      const lang = meta.language || "plaintext";
      const redacted = meta.redacted || false;
      window.__hideSensitive__ = redacted;

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

      updateDecorations(redacted);

      const iconToggle = document.getElementById("toggleSensitive");
      const icon = document.getElementById("sensitiveIcon");

      if (iconToggle && icon) {
        iconToggle.style.display = "inline-block";
        iconToggle.disabled = true;
        iconToggle.style.cursor = "not-allowed";
        iconToggle.title = redacted
          ? "Paste was saved with sensitive content redacted"
          : "Paste was saved with redaction off";

        icon.classList.remove("fa-eye", "fa-lock");
        icon.classList.add(redacted ? "fa-lock" : "fa-eye");
      }

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

    updateDecorations(true);

    monacoEditor.onDidChangeModelContent(() => {
      updateDecorations(window.__hideSensitive__);
    });

    const icon = document.getElementById("sensitiveIcon");
    const toggleBtn = document.getElementById("toggleSensitive");

    if (toggleBtn && icon) {
      toggleBtn.addEventListener("click", () => {
        window.__hideSensitive__ = !window.__hideSensitive__;
        document.getElementById("redactionState").value = window.__hideSensitive__;

        icon.classList.remove("fa-eye", "fa-lock");
        icon.classList.add(window.__hideSensitive__ ? "fa-lock" : "fa-eye");

        updateDecorations(window.__hideSensitive__);
      });
    }
  }

  // Show/hide extra buttons
  const viewOnlyButtons = ["copyBtn", "shareBtn", "rawBtn"];
  viewOnlyButtons.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = pasteId ? "inline-block" : "none";
    }
  });
});
