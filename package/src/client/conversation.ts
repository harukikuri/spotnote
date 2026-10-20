// The agent's side of a note's conversation in the panel: who wrote a message,
// and the "Thinking…" message while it works.
import { agentMark } from "./icons.ts";
import type { Pin } from "./types.ts";

// What to call the agent on this note: the last one that wrote on it.
export const agentName = (pin: Pin | undefined): string =>
  agentMark(pin?.thread?.findLast((m) => m.from === "agent")?.client)?.name ?? "The agent";

// "✳ Claude Code" over an agent's message: its mark (when we have one) and its
// name; just "Agent" when it didn't say which it is.
export function agentLabel(client: string | null | undefined): HTMLSpanElement {
  const who = document.createElement("span");
  who.className = "sn-who";
  const mark = agentMark(client);
  if (mark?.svg) {
    const i = document.createElement("span");
    i.className = "sn-agent-mark";
    i.innerHTML = mark.svg; // hardcoded SVG constants, not user input
    who.append(i);
  }
  who.append(mark?.name ?? "Agent");
  return who;
}

// The agent's message while it works: "Thinking…", "Reading the code…", … in
// turn, with moving dots (still under reduced motion: just "Thinking").
const THINKING = ["Thinking", "Reading the code", "Looking around", "Working on it", "Weighing it up", "Almost there"];
export function thinkingMsg(client: string | null | undefined): HTMLDivElement {
  const msg = document.createElement("div");
  msg.className = "sn-msg sn-msg-agent sn-thinking";
  const text = document.createElement("span");
  text.className = "sn-msg-body sn-thinking-text";
  text.textContent = THINKING[0];
  msg.append(agentLabel(client), text);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let i = 0;
    const t = setInterval(() => {
      if (!text.isConnected) return clearInterval(t);
      text.textContent = THINKING[(i = (i + 1) % THINKING.length)];
    }, 2400);
  }
  return msg;
}
