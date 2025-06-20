document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.querySelector('a[href="#"][id="themeToggle"]');

  const setTheme = (mode) => {
    document.body.classList.toggle("light-theme", mode === "light");
    document.body.classList.toggle("dark-theme", mode === "dark");
    localStorage.setItem("theme", mode);
  };

  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme);

  themeToggle.addEventListener("click", (e) => {
    e.preventDefault();
    const current = localStorage.getItem("theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  });
});
