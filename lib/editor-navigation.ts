/** Reveal the actual editor, regardless of list length or responsive layout. */
export function revealEditor(selector: string) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const editor = document.querySelector<HTMLElement>(selector);
    if (!editor) return;
    editor.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    // Focus the heading instead of an input: do not open the phone keyboard yet.
    const heading = editor.querySelector<HTMLElement>("h2, h3") ?? editor;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }));
}
