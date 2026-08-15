import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReadiverExperience } from "./ReadiverExperience";

const response = {
  id: "00d4868e-d334-49e8-8841-66c859a579c5",
  title: "Ein neuer Blick auf die Stadt",
  sourceText: "Cities change when people change how they move.",
  detectedSourceLanguage: "en",
  targetLanguage: "de" as const,
  level: "B1" as const,
  adaptedText: "Städte verändern sich, wenn Menschen sich anders bewegen.",
};

describe("ReadiverExperience", () => {
  it("keeps the CTA disabled until text is present", () => {
    render(<ReadiverExperience adapt={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Adapt for me" })).toBeDisabled();
  });

  it("lets the reader choose a language and CEFR level", async () => {
    const user = userEvent.setup();
    render(<ReadiverExperience adapt={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText("Read in"), "tr");
    await user.click(screen.getByLabelText("A2"));

    expect(screen.getByLabelText("Read in")).toHaveValue("tr");
    expect(screen.getByLabelText("A2")).toBeChecked();
  });

  it("renders the editorial reader after a successful adaptation", async () => {
    const user = userEvent.setup();
    const adapt = vi.fn().mockResolvedValue(response);
    render(<ReadiverExperience adapt={adapt} />);

    await user.type(screen.getByLabelText("Text to adapt"), response.sourceText);
    await user.click(screen.getByRole("button", { name: "Adapt for me" }));

    expect(await screen.findByRole("heading", { name: response.title })).toBeInTheDocument();
    expect(screen.getByText(response.adaptedText)).toBeInTheDocument();
    expect(screen.getByText("Original text")).toBeInTheDocument();
    expect(adapt).toHaveBeenCalledWith({
      text: response.sourceText,
      targetLanguage: "de",
      level: "B1",
    });
  });

  it("keeps the input and shows a useful API error", async () => {
    const user = userEvent.setup();
    const adapt = vi.fn().mockRejectedValue(new Error("Adaptation is temporarily unavailable."));
    render(<ReadiverExperience adapt={adapt} />);

    const textarea = screen.getByLabelText("Text to adapt");
    await user.type(textarea, "A source that should remain available for retry.");
    await user.click(screen.getByRole("button", { name: "Adapt for me" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Adaptation is temporarily unavailable.",
    );
    expect(textarea).toHaveValue("A source that should remain available for retry.");
  });
});
