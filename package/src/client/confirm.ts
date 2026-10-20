// A question asked over one of our surfaces (the note panel, the notes list)
// before something that can't be undone: the surface dims, and a small dialog
// on top of it takes the answer.
//
//   confirmOver(host, { title, body, action, onConfirm, onCancel })
//
// The action button has the focus, so Enter confirms; Cancel or a press on the
// dimmed surface backs out. Returns `cancel`, to back out from outside.

export function confirmOver(
  host: HTMLElement,
  {
    title,
    body,
    action,
    onConfirm,
    onCancel,
  }: { title: string; body?: string; action: string; onConfirm: () => void; onCancel?: () => void },
): () => void {
  const scrim = document.createElement("div");
  scrim.className = "sn-confirm";
  const card = document.createElement("div");
  card.className = "sn-confirm-card";
  card.setAttribute("role", "alertdialog");
  card.setAttribute("aria-label", title);
  const h = document.createElement("p");
  h.className = "sn-confirm-title";
  h.textContent = title;
  card.append(h);
  if (body) {
    const p = document.createElement("p");
    p.className = "sn-confirm-body";
    p.textContent = body;
    card.append(p);
  }
  const btns = document.createElement("div");
  btns.className = "sn-confirm-btns";
  const button = (cls: string, text: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    b.addEventListener("click", fn);
    btns.append(b);
    return b;
  };
  const close = () => {
    scrim.remove();
    host.classList.remove("sn-confirming");
  };
  const cancel = () => {
    close();
    onCancel?.();
  };
  button("sn-confirm-no", "Cancel", cancel);
  const yes = button("sn-confirm-yes", action, () => {
    close();
    onConfirm();
  });
  card.append(btns);
  scrim.append(card);
  // A press on the dimmed surface backs out (and doesn't start a drag).
  scrim.addEventListener("mousedown", (e) => {
    if (e.target !== scrim) return;
    e.preventDefault();
    cancel();
  });
  host.classList.add("sn-confirming");
  host.append(scrim);
  yes.focus({ preventScroll: true });
  return cancel;
}
