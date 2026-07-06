// Desktop exit-intent: the cursor leaving through the top of the viewport is a
// strong "about to bounce" signal. (Mobile back/forward intent is unreliable to
// detect from script; left for a later pass.)
export function watchExitIntent(onExit: () => void): () => void {
  let fired = false;

  const onMouseOut = (e: MouseEvent) => {
    if (fired) return;
    // Left through the top edge, toward no related target (the chrome/tab bar).
    if (e.clientY <= 0 && e.relatedTarget == null) {
      fired = true;
      onExit();
    }
  };

  document.addEventListener("mouseout", onMouseOut);
  return () => document.removeEventListener("mouseout", onMouseOut);
}
