function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Fallback clipboard error:", err);
    }
    document.body.removeChild(textArea);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("saveBtn");
  const mobileSaveBtn = document.getElementById("mobileSaveBtn");
  const shareBtn = document.getElementById("shareBtn");
  const copyBtn = document.getElementById("copyBtn");
  const rawBtn = document.getElementById("rawBtn");
  const shareMenu = document.getElementById("shareMenu");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const qrCodeBtn = document.getElementById("qrCodeBtn");

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const content = monacoEditor.getValue();
      copyToClipboard(content);
      alert("Copied!");
    });
  }

  async function createAndSharePaste() {
    let content = monacoEditor.getValue();
    const expiry = parseInt(document.getElementById("expiry").value);
    const lang = document.getElementById("language").value;
    const redacted = window.__hideSensitive__ || false;

    try {
      const password = document.getElementById("pastePassword")?.value?.trim();

      const res = await fetch("/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          expiry,
          language: lang,
          redacted,
          password: password || undefined
        })
      });

      const text = await res.text();

      if (!res.ok) {
        console.error("Server Error:", text);
        throw new Error("Server responded with error");
      }

      const data = JSON.parse(text);
      const url = `/p/${data.key}`;
      copyToClipboard(`${window.location.origin}${url}`);
      window.location.href = url;
    } catch (err) {
      console.error("❌ Error saving paste:", err);
      alert("Failed to save paste. Check browser console.");
    }
  }

  // Shared listener
  document.getElementById("saveBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    createAndSharePaste();
  });

  document.getElementById("mobileSaveBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    createAndSharePaste();
  });

  if (shareBtn && shareMenu) {
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      shareMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!shareMenu.contains(e.target) && e.target !== shareBtn) {
        shareMenu.classList.add("hidden");
      }
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      if (pasteId) {
        const url = `${window.location.origin}/p/${pasteId}`;
        copyToClipboard(url);
        alert("Copied share link!");
      }
      shareMenu.classList.add("hidden");
    });
  }

  if (qrCodeBtn) {
    qrCodeBtn.addEventListener("click", () => {
      if (!pasteId) return;
      const url = `${window.location.origin}/p/${pasteId}`;
      window.open(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=200x200`, '_blank');
      shareMenu.classList.add("hidden");
    });
  }

  if (rawBtn) {
    rawBtn.addEventListener("click", () => {
      if (typeof pasteId !== "undefined" && pasteId) {
        window.open(`/raw/${pasteId}`, '_blank');
      }
    });
  }



  // 🔥 Removed: Redaction toggle logic — handled by editor-init.js only
});
