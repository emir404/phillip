// Smoke render tests for the vendored Elements — presentational contract only
// (the widget wiring is covered by the chat/iteration suites).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  Suggestion,
  Suggestions,
  Task,
} from "./index";

function renderPromptInput(onSubmit: (text: string) => void, disabled = false) {
  return render(
    <PromptInput onSubmit={onSubmit} disabled={disabled}>
      <PromptInputTextarea />
      <PromptInputToolbar>
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>,
  );
}

describe("PromptInput", () => {
  it("submits trimmed text on Enter and clears itself", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderPromptInput(onSubmit);

    const textarea = screen.getByPlaceholderText("What do you want to change?");
    await user.type(textarea, "make the hero blue{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("make the hero blue");
    expect(textarea).toHaveValue("");
  });

  it("inserts a newline on Shift+Enter instead of submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderPromptInput(onSubmit);

    const textarea = screen.getByPlaceholderText("What do you want to change?");
    await user.type(textarea, "line one{Shift>}{Enter}{/Shift}line two");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line one\nline two");
  });

  it("never submits empty input and keeps the send button gated", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderPromptInput(onSubmit);

    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText("What do you want to change?"), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText("What do you want to change?"), "hi");
    expect(button).toBeEnabled();
  });

  it("ignores input entirely while disabled", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderPromptInput(onSubmit, true);

    const textarea = screen.getByPlaceholderText("What do you want to change?");
    expect(textarea).toBeDisabled();
    await user.type(textarea, "nope{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("Task", () => {
  it.each([
    ["submitting", "sending it over…"],
    ["working", "rebuilding your site…"],
    ["done", "live — take a look"],
    ["failed", "hmm, that one didn't take. try again?"],
    ["manual", "my colleague is picking this one up — you'll get an email shortly."],
  ] as const)("renders the %s phase copy", (phase, copy) => {
    render(<Task phase={phase} />);
    expect(screen.getByText(copy)).toBeInTheDocument();
  });

  it("shows a spinner while busy and echoes the summary", () => {
    render(<Task phase="working" summary="make the hero blue" />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getByText("make the hero blue")).toBeInTheDocument();
  });
});

describe("Suggestions", () => {
  it("fires onClick per pill and respects disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Suggestions>
        <Suggestion label="brighten it up" onClick={onClick} />
        <Suggestion label="new photos" onClick={onClick} disabled />
      </Suggestions>,
    );

    await user.click(screen.getByRole("button", { name: "brighten it up" }));
    await user.click(screen.getByRole("button", { name: "new photos" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
