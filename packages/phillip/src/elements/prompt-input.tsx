// Vendored from AI SDK Elements' PromptInput, decoupled from useChat: the form
// owns its textarea state and reports plain text through onSubmit. Children
// compose Elements-style:
//
//   <PromptInput onSubmit={send} disabled={busy}>
//     <PromptInputTextarea />
//     <PromptInputToolbar>
//       <PromptInputSubmit />
//     </PromptInputToolbar>
//   </PromptInput>
import {
  type ButtonHTMLAttributes,
  type FormEvent,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/cn";
import { SendArrow } from "../ui/icons";

interface PromptInputContextValue {
  value: string;
  setValue: (next: string) => void;
  disabled: boolean;
  submit: () => void;
}

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInput(component: string): PromptInputContextValue {
  const ctx = useContext(PromptInputContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <PromptInput>`);
  return ctx;
}

export interface PromptInputProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onChange"> {
  /** Called with the trimmed text; the textarea clears itself afterwards. */
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function PromptInput({
  onSubmit,
  disabled = false,
  className,
  children,
  ...props
}: PromptInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSubmit(text);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <PromptInputContext.Provider value={{ value, setValue, disabled, submit }}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          // Figma dark-rail composer: ink card, hairline border, soft drop +
          // faint inner glow.
          "flex flex-col gap-2 rounded-xl border border-ink-800 bg-ink-850 p-3 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.10),inset_0px_0px_36px_0px_rgba(255,255,255,0.02)]",
          className,
        )}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

export interface PromptInputTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "disabled"> {
  placeholder?: string;
}

export function PromptInputTextarea({
  className,
  placeholder = "What do you want to change?",
  onKeyDown,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, disabled, submit } = usePromptInput("PromptInputTextarea");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow with content: measure scrollHeight each change; the max-h-32
  // class caps it (CSS max-height beats the inline height) and the textarea
  // scrolls internally past that.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure on every value change
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // Enter submits (when non-empty), Shift+Enter inserts a newline; never
    // steal Enter mid-IME composition.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "max-h-32 min-h-[40px] w-full resize-none bg-transparent text-[13px] text-white/90 outline-none placeholder:text-white/75",
        className,
      )}
      {...props}
    />
  );
}

export interface PromptInputToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Actions left of the spacer (element-picker toggle; paperclip in v1.1). */
  leading?: ReactNode;
}

/**
 * Footer row under the textarea: `leading` actions sit flush left, submit
 * (children) flush right.
 */
export function PromptInputToolbar({
  className,
  leading,
  children,
  ...props
}: PromptInputToolbarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {leading}
      <div className="flex-1" />
      {children}
    </div>
  );
}

export type PromptInputSubmitProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PromptInputSubmit({ className, children, ...props }: PromptInputSubmitProps) {
  const { value, disabled } = usePromptInput("PromptInputSubmit");
  return (
    <button
      type="submit"
      aria-label="Send"
      disabled={disabled || value.trim().length === 0}
      className={cn(
        // Raised porcelain button off the Figma rail: light disc, inset top
        // highlight, soft drop shadow.
        "flex size-7 items-center justify-center rounded-full border border-[#d9d9d9] bg-[#f0f0f0] text-black shadow-[inset_0px_4px_4px_0px_white] drop-shadow-[0px_4px_6px_rgba(0,0,0,0.15)] disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children ?? <SendArrow size={16} />}
    </button>
  );
}
