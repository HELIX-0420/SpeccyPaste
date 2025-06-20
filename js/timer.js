function startTimer(expires, targetEl) {
  targetEl.style.display = "block";

  const updateTimer = () => {
    const remaining = expires - Date.now();
    if (remaining > 0) {
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      targetEl.innerText = `⏰ This paste will expire in ${days}d ${hours}h ${minutes}m ${seconds}s. ⏰`;
    } else {
      targetEl.innerText = "⚠️ This paste has expired.";
      clearInterval(interval);
    }
  };

  updateTimer();
  const interval = setInterval(updateTimer, 1000);
}
