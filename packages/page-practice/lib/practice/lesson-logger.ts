import { type Result } from "@keybr/result";
import { type Step } from "@keybr/textinput";
import {
  type AnyEvent,
  type IInputEvent,
  type IKeyboardEvent,
} from "@keybr/textinput-events";

/** A completed lesson with all of its key events. */
export type CompletedLesson = {
  readonly result: Result;
  /** The characters of the lesson text, as they were typed. */
  readonly steps: readonly Step[];
  /** Every key press, key release and text input, in the order they happened. */
  readonly events: readonly AnyEvent[];
};

export type CompletedLessonListener = (lesson: CompletedLesson) => void;

/** How long a completed lesson waits for its keys to be released. */
export const releaseTimeout = 1000;

/**
 * Collects the key events of one lesson. A key release is only collected
 * if the press of the same key was collected before, so the release of a key
 * pressed in an earlier lesson does not end up in this one.
 */
export class KeyEventRecorder {
  readonly #events: AnyEvent[] = [];
  readonly #pressed = new Set<string>();

  get events(): readonly AnyEvent[] {
    return this.#events;
  }

  /** The number of keys that are pressed and not released yet. */
  get pressedKeys(): number {
    return this.#pressed.size;
  }

  reset(): void {
    this.#events.length = 0;
    this.#pressed.clear();
  }

  keyDown(event: IKeyboardEvent): void {
    this.#events.push(event);
    this.#pressed.add(event.code);
  }

  /** Collects a key release, and tells whether it was collected. */
  keyUp(event: IKeyboardEvent): boolean {
    if (this.#pressed.delete(event.code)) {
      this.#events.push(event);
      return true;
    } else {
      return false;
    }
  }

  input(event: IInputEvent): void {
    this.#events.push(event);
  }
}

/**
 * Logs the key events of lessons one after another. When a lesson completes,
 * its last keys are usually still pressed. The completed lesson keeps
 * collecting the releases of these keys, while the next lesson starts
 * collecting its own events. The completed lesson is delivered when all its
 * keys are released, after {@link releaseTimeout}, or when flushed,
 * whichever comes first.
 */
export class LessonLogger {
  readonly #setTimeout: (callback: () => void, delay: number) => unknown;
  readonly #clearTimeout: (id: any) => void;
  #listener: CompletedLessonListener = () => {};
  #current = new KeyEventRecorder();
  #completed: {
    readonly result: Result;
    readonly steps: readonly Step[];
    readonly recorder: KeyEventRecorder;
    readonly timer: unknown;
  } | null = null;

  constructor({
    // Browsers require the timer functions to be called on the global object.
    setTimeout = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout = (id) => {
      globalThis.clearTimeout(id);
    },
  }: {
    readonly setTimeout?: (callback: () => void, delay: number) => unknown;
    readonly clearTimeout?: (id: any) => void;
  } = {}) {
    this.#setTimeout = setTimeout;
    this.#clearTimeout = clearTimeout;
  }

  /** Sets the listener that receives the completed lessons. */
  setListener(listener: CompletedLessonListener): void {
    this.#listener = listener;
  }

  /** Discards the events of the current lesson. */
  reset(): void {
    this.#current.reset();
  }

  keyDown(event: IKeyboardEvent): void {
    this.#current.keyDown(event);
  }

  keyUp(event: IKeyboardEvent): void {
    const completed = this.#completed;
    if (completed != null && completed.recorder.keyUp(event)) {
      if (completed.recorder.pressedKeys === 0) {
        this.flush();
      }
    } else {
      this.#current.keyUp(event);
    }
  }

  input(event: IInputEvent): void {
    this.#current.input(event);
  }

  /**
   * Completes the current lesson and starts the next one.
   * Must be called after the last input of the lesson was logged.
   */
  complete(result: Result, steps: readonly Step[]): void {
    this.flush();
    const recorder = this.#current;
    this.#current = new KeyEventRecorder();
    if (recorder.pressedKeys === 0) {
      this.#listener({ result, steps, events: recorder.events });
    } else {
      this.#completed = {
        result,
        steps,
        recorder,
        timer: this.#setTimeout(() => {
          this.flush();
        }, releaseTimeout),
      };
    }
  }

  /** Delivers the completed lesson that still waits for key releases. */
  flush(): void {
    const completed = this.#completed;
    if (completed != null) {
      this.#completed = null;
      this.#clearTimeout(completed.timer);
      const { result, steps, recorder } = completed;
      this.#listener({ result, steps, events: recorder.events });
    }
  }
}
