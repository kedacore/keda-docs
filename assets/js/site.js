// Anchor link scroll offset — compensates for the fixed navbar.
const navbar = document.getElementsByClassName("navbar")[0];
const navbarHeight = navbar ? navbar.offsetHeight : 0;
const extraPadding = 15;
const navbarOffset = -1 * (navbarHeight + extraPadding);
function shiftWindow() {
  scrollBy(0, navbarOffset);
}
window.addEventListener("hashchange", shiftWindow);
window.addEventListener("pageshow", shiftWindow);
if (window.location.hash) shiftWindow();

// Copy-to-clipboard for FAQ / troubleshooting permalink buttons.
function copyPermalink(id) {
  const url = `${window.location.origin}${window.location.pathname}#${id}`;
  const container = document.getElementById(id);
  if (!navigator.clipboard) {
    console.error("Clipboard API not available");
    return;
  }
  navigator.clipboard.writeText(url).then(() => {
    container.classList.add("copy-text-active");
    setTimeout(() => container.classList.remove("copy-text-active"), 2500);
  }, (err) => {
    console.error("Could not copy text:", err);
  });
}

const copyBtns = document.querySelectorAll(".copyBtn");
copyBtns.forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    copyPermalink(btn.getAttribute("id"));
  });
});

// Expand collapsed FAQ/troubleshooting section matching the URL hash.
window.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const hash = window.location.hash.slice(1);
  const cardContents = document.querySelectorAll(".card-content-dropdown");
  cardContents.forEach((item) => {
    const id = item.getAttribute("id");
    if (hash === id) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
});
