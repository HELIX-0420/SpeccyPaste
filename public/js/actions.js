document.getElementById("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(monacoEditor.getValue());
  alert("Copied!");
});

document.getElementById("shareBtn").addEventListener("click", () => {
  const content = monacoEditor.getValue();
  const expiry = parseInt(document.getElementById("expiry").value);
  const lang = document.getElementById("language").value;

  fetch("/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, expiry, language: lang })
  })
  .then(res => res.json())
  .then(data => {
    const url = `/p/${data.key}`;
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    window.history.pushState({}, '', url);
    alert("Shared! URL copied: " + window.location.origin + url);
  })
  .catch(() => alert("Failed to save paste"));
});

document.getElementById("saveBtn").addEventListener("click", () => {
  document.getElementById("shareBtn").click();
});

document.getElementById("rawBtn").addEventListener("click", () => {
  if (pasteId) {
    window.open(`/raw/${pasteId}`, '_blank');
  }
});
