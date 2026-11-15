/**
 * Narrator: reads the page aloud. Fixed phrases play as recorded clips (public/narrator, made once
 * with pipeline/build_narrator.py); anything without a clip uses the browser's voice (Web Speech API).
 * It follows both the mouse and the keyboard focus, and reuses the labels the page already
 * exposes to screen readers, so there is one source of truth for every description.
 * It is off by default so it never talks over a real screen reader.
 */

const TARGETS = '[data-say], button, a[href], select, input, [role="slider"], summary, h2, h3, li, p, img, [role="img"], output';
const WATCHED = ["aria-valuetext", "aria-pressed", "aria-checked", "aria-selected"];
const ROLE_WORDS: Record<string, string> = { button: "button", a: "link", select: "list", slider: "slider", range: "slider", tab: "tab", radio: "option", switch: "switch", summary: "section" };

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const byIds = (el: Element, attr: string) =>
  clean(
    (el.getAttribute(attr) ?? "")
      .split(/\s+/)
      .map((id) => (id ? document.getElementById(id)?.textContent : ""))
      .join(" "),
  );

function roleOf(el: Element): string {
  const role = el.getAttribute("role");
  if (role) return role;
  const tag = el.tagName.toLowerCase();
  return tag === "input" ? (el as HTMLInputElement).type : tag;
}

/** Recorded clips: phrase → file name. Empty until the index loads, or if it is missing. */
const CLIP_BASE = `${import.meta.env.BASE_URL}narrator/`;
let clips: Record<string, string> = {};
fetch(`${CLIP_BASE}index.json`)
  .then((r) => (r.ok ? r.json() : {}))
  .then((d) => (clips = d))
  .catch(() => {});
/** How a phrase is looked up in the clip index. Must match pipeline/build_narrator.py. */
export const clipKey = (s: string) => clean(s).replace(/[.!]+$/, "").toLowerCase();

/** Current value or state of a control, in words. */
export function valueOf(el: Element): string {
  const role = roleOf(el);
  if (el instanceof HTMLSelectElement) return clean(el.selectedOptions[0]?.textContent);
  if (role === "slider" || role === "range") return el.getAttribute("aria-valuetext") ?? (el as HTMLInputElement).value ?? "";
  if (role === "switch") return el.getAttribute("aria-checked") === "true" ? "on" : "off";
  if (el.hasAttribute("aria-pressed")) return el.getAttribute("aria-pressed") === "true" ? "on" : "off";
  if (el.getAttribute("aria-checked") === "true" || el.getAttribute("aria-selected") === "true") return "selected";
  return "";
}

/** What to say for an element, as separate phrases: its name, what kind of control it is, its value, and what it does. */
export function describeParts(el: Element, simple: boolean): string[] {
  const said = el.getAttribute("data-say");
  if (said) return [said];
  const role = roleOf(el);
  const labelFor = el.id ? clean(document.querySelector(`label[for="${el.id}"]`)?.textContent) : "";
  const name =
    clean(el.getAttribute("aria-label")) ||
    byIds(el, "aria-labelledby") ||
    labelFor ||
    (role === "button" ? clean(el.getAttribute("title")) : "") ||
    clean(el.getAttribute("alt")) ||
    (clean((el as HTMLElement).innerText) || clean(el.textContent)).slice(0, 400);
  const hint = byIds(el, "aria-describedby") || (role !== "button" ? clean(el.getAttribute("title")) : "");
  const word = simple ? "" : (ROLE_WORDS[role] ?? "");
  return [name, word, valueOf(el), hint].filter(Boolean);
}

export const describeElement = (el: Element, simple: boolean) => describeParts(el, simple).join(". ");

/** Every phrase the page can say right now. Used by pipeline/build_narrator.py to know which clips to record. */
export const harvest = (simple: boolean, skip: string) =>
  [...document.querySelectorAll(TARGETS)].filter((el) => !el.closest(skip)).flatMap((el) => describeParts(el, simple));

export class Narrator {
  enabled = false;
  simple = false; // kids mode: no words like "slider" or "button"
  /** Called when the voice starts and stops, so the music can make room for it. */
  onSpeaking: (on: boolean) => void = () => {};
  private last: string[] = [];
  private run = 0;
  private audio: HTMLAudioElement | null = null;
  private current: Element | null = null;
  private timer = 0;
  private observer: MutationObserver | null = null;

  get supported() {
    return "speechSynthesis" in window;
  }

  /** Speaks now, cutting whatever was being said. Works even when the narrator is off (used for the welcome hint). */
  say(text: string | string[]) {
    const parts = (Array.isArray(text) ? text : [text]).map(clean).filter(Boolean);
    if (!parts.length) return;
    this.last = parts;
    this.hush();
    const run = ++this.run;
    // Phrases without a clip that follow each other are spoken in one breath by the browser's voice.
    const chunks: { text: string; file?: string }[] = [];
    for (const part of parts) {
      const file = clips[clipKey(part)];
      const prev = chunks[chunks.length - 1];
      if (!file && prev && !prev.file) prev.text += `. ${part}`;
      else chunks.push({ text: part, file });
    }
    const loaded = chunks.map((c) => (c.file ? new Audio(CLIP_BASE + c.file) : null));
    this.onSpeaking(true);
    const next = (i: number) => {
      if (run !== this.run) return;
      if (i >= chunks.length) return this.onSpeaking(false);
      let moved = false;
      const then = () => !moved && ((moved = true), next(i + 1));
      const browser = () => (run === this.run ? this.browserVoice(chunks[i].text, then) : undefined);
      const audio = loaded[i];
      if (!audio) return browser();
      this.audio = audio;
      audio.onended = then;
      audio.onerror = browser;
      audio.play().catch(browser);
    };
    next(0);
  }

  private browserVoice(text: string, then: () => void) {
    if (!this.supported) return then();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1.05;
    u.onend = u.onerror = then;
    speechSynthesis.speak(u);
  }

  private hush() {
    this.run++;
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
    if (this.supported) speechSynthesis.cancel();
  }

  /** Speaks after a short pause, so sweeping the mouse across the page does not trigger every element. */
  sayLater(text: string | string[], delay = 250) {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.enabled && this.say(text), delay);
  }

  repeat() {
    this.say(this.last);
  }

  private target(from: EventTarget | null): Element | null {
    if (!(from instanceof Element) || from.closest("canvas, [data-silent]")) return null;
    const knob = from.closest(".knob")?.querySelector('[role="slider"]');
    return knob ?? from.closest(TARGETS);
  }

  private land = (e: Event) => {
    const el = this.target(e.target);
    if (!el || el === this.current) return;
    this.current = el;
    const text = describeParts(el, this.simple);
    if (e.type === "focusin") this.say(text);
    else this.sayLater(text);
  };

  private leave = (e: Event) => {
    if (e.type === "pointerout" && this.target(e.target) === this.current) {
      this.current = null;
      clearTimeout(this.timer);
    }
  };

  /** Starts or stops following the mouse and the keyboard. */
  setEnabled(on: boolean) {
    if (on === this.enabled) return;
    this.enabled = on;
    const act = on ? "addEventListener" : "removeEventListener";
    document[act]("pointerover", this.land);
    document[act]("focusin", this.land);
    document[act]("pointerout", this.leave);
    this.observer?.disconnect();
    this.observer = null;
    if (on) {
      // When the control under the mouse or the focus changes value, say only the new value.
      this.observer = new MutationObserver((changes) => {
        const hit = changes.find((c) => c.target === this.current || c.target === document.activeElement);
        if (hit) this.sayLater(valueOf(hit.target as Element), 350);
      });
      this.observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: WATCHED });
    } else {
      clearTimeout(this.timer);
      this.current = null;
    }
  }
}

// For pipeline/build_narrator.py.
(window as unknown as { __ejHarvest: typeof harvest }).__ejHarvest = harvest;
