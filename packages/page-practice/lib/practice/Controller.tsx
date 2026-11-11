import { type KeyId, useKeyboard } from "@keybr/keyboard";
import { type Result } from "@keybr/result";
import { type LineList } from "@keybr/textinput";
import {
  addKey,
  deleteKey,
  emulateLayout,
  type IKeyboardEvent,
} from "@keybr/textinput-events";
import { makeSoundPlayer } from "@keybr/textinput-sounds";
import {
  useDocumentEvent,
  useHotkeys,
  useTimeout,
  useWindowEvent,
} from "@keybr/widget";
import {
  memo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type CompletedLessonListener, LessonLogger } from "./lesson-logger.ts";
import { Presenter } from "./Presenter.tsx";
import {
  type LastLesson,
  LessonState,
  makeLastLesson,
  type Progress,
} from "./state/index.ts";

export const Controller = memo(function Controller({
  progress,
  onResult,
  onLesson,
}: {
  readonly progress: Progress;
  /** Receives the result of a completed lesson right away. */
  readonly onResult: (result: Result) => void;
  /**
   * Receives a completed lesson with all its key events, once the keys
   * pressed at its end are released.
   */
  readonly onLesson: CompletedLessonListener;
}): ReactNode {
  const {
    state,
    handleResetLesson,
    handleSkipLesson,
    handleKeyDown,
    handleKeyUp,
    handleInput,
  } = useLessonState(progress, onResult, onLesson);
  useHotkeys({
    ["Ctrl+ArrowLeft"]: handleResetLesson,
    ["Ctrl+ArrowRight"]: handleSkipLesson,
    ["Escape"]: handleResetLesson,
  });
  useWindowEvent("focus", handleResetLesson);
  useWindowEvent("blur", handleResetLesson);
  useDocumentEvent("visibilitychange", handleResetLesson);
  return (
    <Presenter
      state={state}
      lines={state.lines}
      depressedKeys={state.depressedKeys}
      onResetLesson={handleResetLesson}
      onSkipLesson={handleSkipLesson}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onInput={handleInput}
    />
  );
});

function useLessonState(
  progress: Progress,
  onResult: (result: Result) => void,
  onLesson: CompletedLessonListener,
) {
  const keyboard = useKeyboard();
  const timeout = useTimeout();
  const [key, setKey] = useState(0); // Creates new LessonState instances.
  const [, setLines] = useState<LineList>({ text: "", lines: [] }); // Forces UI update.
  const [, setDepressedKeys] = useState<readonly KeyId[]>([]); // Forces UI update.
  const lastLessonRef = useRef<LastLesson | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [logger] = useState(() => new LessonLogger());
  useEffect(() => {
    logger.setListener(onLesson);
  }, [logger, onLesson]);
  useEffect(() => {
    return () => {
      logger.flush();
    };
  }, [logger]);

  return useMemo(() => {
    // New lesson.
    const state = new LessonState(progress, (result, textInput) => {
      setKey(key + 1);
      lastLessonRef.current = makeLastLesson(result, textInput.steps);
      onResultRef.current(result);
      logger.complete(result, [...textInput.steps]);
    });
    state.lastLesson = lastLessonRef.current;
    setLines(state.lines);
    setDepressedKeys(state.depressedKeys);
    const handleResetLesson = () => {
      logger.reset();
      state.resetLesson();
      setLines(state.lines);
      setDepressedKeys((state.depressedKeys = []));
      timeout.cancel();
    };
    const handleSkipLesson = () => {
      logger.reset();
      state.skipLesson();
      setLines(state.lines);
      setDepressedKeys((state.depressedKeys = []));
      timeout.cancel();
    };
    const playSounds = makeSoundPlayer(state.settings);
    const { onKeyDown, onKeyUp, onInput } = emulateLayout(
      state.settings,
      keyboard,
      {
        onKeyDown: (event) => {
          setDepressedKeys(
            (state.depressedKeys = addKey(state.depressedKeys, event.code)),
          );
        },
        onKeyUp: (event) => {
          setDepressedKeys(
            (state.depressedKeys = deleteKey(state.depressedKeys, event.code)),
          );
        },
        onInput: (event) => {
          // Logs the input after the layout emulation, as the lesson sees it.
          // It must be logged before the lesson completes with it.
          logger.input(event);
          state.lastLesson = null;
          const feedback = state.onInput(event);
          setLines(state.lines);
          playSounds(feedback);
          timeout.schedule(handleResetLesson, 10000);
        },
      },
    );
    return {
      state,
      handleResetLesson,
      handleSkipLesson,
      // Logs the physical key presses and releases.
      handleKeyDown: (event: IKeyboardEvent) => {
        logger.keyDown(event);
        onKeyDown(event);
      },
      handleKeyUp: (event: IKeyboardEvent) => {
        logger.keyUp(event);
        onKeyUp(event);
      },
      handleInput: onInput,
    };
  }, [progress, keyboard, timeout, key, logger]);
}
