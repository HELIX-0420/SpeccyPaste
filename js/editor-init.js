require(["vs/editor/editor.main"], function () {
  const expiryInfoEl = document.getElementById("expiryInfo");

  window.__hideSensitive__ = true;
  let decorations = [];
  const ipTokenRegex = /\b\d{1,3}(?:\.\d{1,3}){3}\b|(?:token|api[_-]?key|authorization)[:=]?\s*["']?[a-z0-9\-_\.]{16,}["']?/gi;

  function redactContent(content) {
    return content.replace(ipTokenRegex, "⛔ sensitive data");
  }

  function updateDecorations() {
    const model = monacoEditor.getModel();
    if (!model) return;

    if (decorations.length > 0) {
      decorations = monacoEditor.deltaDecorations(decorations, []);
    }

    const code = model.getValue();
    const matches = [...code.matchAll(ipTokenRegex)];

    const newDecorations = matches.map(match => {
      const start = model.getPositionAt(match.index);
      const end = model.getPositionAt(match.index + match[0].length);
      return {
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: {
          inlineClassName: window.__hideSensitive__ ? "fogged-token" : "highlight-token",
          afterContentClassName: window.__hideSensitive__ ? "fogged-token-after" : undefined,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      };
    });

    decorations = monacoEditor.deltaDecorations([], newDecorations);
  }

  function showPasswordOverlay(onSubmit) {
    const codeBox = document.getElementById("code-box");
    const overlay = document.getElementById("passwordOverlay");
    const unlockBtn = document.getElementById("submitPassword");
    const input = document.getElementById("passwordInput");

    if (!overlay || !input || !unlockBtn) return;

    codeBox.classList.add("locked");
    overlay.style.display = "flex";

    unlockBtn.onclick = async () => {
      const pw = input.value;
      if (!pw) return;
      try {
        await onSubmit(pw);
        overlay.style.display = "none";
        codeBox.classList.remove("locked");
      } catch (e) {
        alert("Incorrect password.");
      }
    };
  }

  async function savePaste() {
    let content = monacoEditor.getValue();
    const lang = document.getElementById("language").value;
    const expiry = document.getElementById("expiry").value;
    const redacted = window.__hideSensitive__;
    const password = document.getElementById("pastePassword").value;

    if (redacted) {
      content = redactContent(content);
    }

    try {
      const res = await fetch("/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language: lang, expiry, redacted, password })
      });

      const json = await res.json();

      if (!res.ok || !json.key) {
        alert("Failed to save paste");
        return;
      }

      window.location.href = `/p/${json.key}`;
    } catch (err) {
      console.error("Error saving paste:", err);
      alert("Something went wrong while saving.");
    }
  }

  const settingsDropdown = document.getElementById("settingsDropdown");
  const pastePasswordInput = document.getElementById("pastePassword");

  function updateSettingsOptions() {
    if (!settingsDropdown) return;
    settingsDropdown.innerHTML = `
      <option value="">Options</option>
      <option value="add-password">${pastePasswordInput.value ? "Unset Password" : "Add Password"}</option>
    `;
  }

  if (settingsDropdown) {
    updateSettingsOptions();

    settingsDropdown.addEventListener("change", () => {
      const selected = settingsDropdown.value;
      if (selected === "add-password") {
        if (pastePasswordInput.value) {
          const confirmUnset = confirm("Do you want to remove the password?");
          if (confirmUnset) {
            pastePasswordInput.value = "";
            alert("Password removed.");
          }
        } else {
          const pw = prompt("Enter a password to protect this paste:");
          if (pw !== null && pw.trim() !== "") {
            pastePasswordInput.value = pw;
            alert("Password set successfully!");
          }
        }
        updateSettingsOptions();
      }
      settingsDropdown.value = "";
    });
  }

  if (typeof pasteId !== "undefined" && pasteId) {
    document.getElementById("settingsDropdown")?.classList.add("hidden");
    document.getElementById("saveBtn")?.classList.add("hidden");
    document.getElementById("mobileSaveBtn")?.classList.add("hidden");
    document.getElementById("pastePassword")?.classList.add("hidden");
    document.getElementById("toggleSensitive")?.classList.add("hidden");

    fetch(`/meta/${pasteId}`)
      .then(res => res.json())
      .then(async (meta) => {
        const lang = meta.language || "plaintext";
        const redacted = meta.redacted || false;
        window.__hideSensitive__ = redacted;

        async function loadProtectedPaste(pw) {
          const retry = await fetch(`/raw/${pasteId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pw })
          });
          if (!retry.ok) throw new Error("Still locked");
          const code = await retry.text();
          renderEditor(code, lang);
        }

        if (meta.passwordHash) {
          await showPasswordOverlay(loadProtectedPaste);
        } else {
          const rawRes = await fetch(`/raw/${pasteId}`);
          if (rawRes.ok) {
            const code = await rawRes.text();
            renderEditor(code, lang);
          } else {
            document.getElementById("editor").innerText = "// Failed to load paste.";
          }
        }

        function renderEditor(code, lang) {
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

          updateDecorations();

          const iconToggle = document.getElementById("toggleSensitive");
          const icon = document.getElementById("sensitiveIcon");

          if (iconToggle && icon) {
            iconToggle.style.display = "inline-block";
            iconToggle.disabled = true;
            iconToggle.style.cursor = "not-allowed";
            iconToggle.title = redacted
              ? "Sensitive data hidden in this paste"
              : "Sensitive data visible in this paste";

            icon.classList.remove("fa-eye", "fa-lock");
            icon.classList.add(redacted ? "fa-lock" : "fa-eye");
          }

          const dropdown = document.getElementById("expiry");
          if (meta.expires && dropdown) {
            startTimer(meta.expires, expiryInfoEl);

            const mins = Math.round((meta.expires - Date.now()) / 60000);
            for (let option of dropdown.options) {
              if (parseInt(option.value) >= mins) {
                dropdown.value = option.value;
                break;
              }
            }
          }

          document.getElementById("saveBtn").style.display = "none";
          document.getElementById("shareBtn").disabled = true;
          document.getElementById("language").disabled = true;
          document.getElementById("expiry").disabled = true;
          document.getElementById("language").value = lang;
        }
      })
      .catch(() => {
        document.getElementById("editor").innerText = "// Failed to load paste or incorrect password.";
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

    document.getElementById("saveBtn").addEventListener("click", savePaste);

    updateDecorations();

    monacoEditor.onDidChangeModelContent(() => {
      updateDecorations();
    });

    const icon = document.getElementById("sensitiveIcon");
    const toggleBtn = document.getElementById("toggleSensitive");

    if (toggleBtn && icon) {
      toggleBtn.addEventListener("click", () => {
        window.__hideSensitive__ = !window.__hideSensitive__;
        document.getElementById("redactionState").value = window.__hideSensitive__;

        icon.classList.remove("fa-eye", "fa-lock");
        icon.classList.add(window.__hideSensitive__ ? "fa-lock" : "fa-eye");

        updateDecorations();
      });
    }
  }

  const viewOnlyButtons = ["copyBtn", "shareBtn", "rawBtn"];
  viewOnlyButtons.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = typeof pasteId !== "undefined" && pasteId ? "inline-block" : "none";
    }
  });
});
