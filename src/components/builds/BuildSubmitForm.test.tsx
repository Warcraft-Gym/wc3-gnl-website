// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BuildSubmitForm } from "./BuildSubmitForm";
import { EXCHANGE_FORMAT_SINGLE, IMPORT_HASH_KEY, encodeForHash } from "@/lib/builds/exchange-codec.mjs";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} onClick={(e) => e.preventDefault()} {...rest}>
      {children}
    </a>
  ),
}));

const submitBuild = vi.fn();
vi.mock("@/app/(site)/learn/builds/submit/actions", () => ({
  submitBuild: (...args: unknown[]) => submitBuild(...args),
}));

// Most tests here drive what follows a sent form, so the form's own check before it sends is off;
// the "checks before it sends" tests turn it on.
const formCheck = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/useFormCheck", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/useFormCheck")>();
  return {
    ...mod,
    useFormCheck: (check: (data: FormData) => Record<string, string> | null) =>
      mod.useFormCheck((data) => (formCheck.on ? check(data) : null)),
  };
});

afterEach(() => {
  cleanup();
  submitBuild.mockReset();
  formCheck.on = false;
  window.location.hash = "";
});

describe("BuildSubmitForm: Submit another", () => {
  it("gives a fresh, empty form after a mocked submit — not the stale success panel", async () => {
    submitBuild.mockResolvedValue({ status: "ok", slug: "test-build" });
    const { container } = render(<BuildSubmitForm />);

    const titleBefore = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleBefore, { target: { value: "My test build" } });
    expect(titleBefore.value).toBe("My test build");

    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(screen.getByText(/Thanks, it.s in the queue/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit another/i }));

    expect(screen.queryByText(/Thanks, it.s in the queue/i)).not.toBeInTheDocument();
    const titleAfter = await screen.findByLabelText("Title");
    expect((titleAfter as HTMLInputElement).value).toBe("");
  });

  it("does not re-apply a #build= import hash after Submit another, and clears the hash", async () => {
    const payload = {
      format: EXCHANGE_FORMAT_SINGLE,
      build: {
        title: "Imported build",
        steps: [{ instruction: "Train a peon" }],
      },
    };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;

    submitBuild.mockResolvedValue({ status: "ok", slug: "test-build-2" });
    const { container } = render(<BuildSubmitForm />);

    const importedTitle = await screen.findByDisplayValue("Imported build");
    expect(importedTitle).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe(""));

    const form = container.querySelector("form");
    fireEvent.submit(form!);
    await waitFor(() => expect(screen.getByText(/Thanks, it.s in the queue/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit another/i }));

    expect(screen.queryByText(/Thanks, it.s in the queue/i)).not.toBeInTheDocument();
    expect(window.location.hash).toBe("");
    const titleAfter = await screen.findByLabelText("Title");
    expect((titleAfter as HTMLInputElement).value).toBe("");
  });
});

describe("BuildSubmitForm: checks before it sends", () => {
  it("keeps an empty form from the server and says what is missing", async () => {
    formCheck.on = true;
    const { container } = render(<BuildSubmitForm />);

    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByText("Give it a proper title")).toBeInTheDocument();
    expect(screen.getByText("Pick your race")).toBeInTheDocument();
    expect(screen.getByText("Who should we credit?")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Please fix the highlighted fields.");
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
    expect(submitBuild).not.toHaveBeenCalled();
  });

  it("sends a complete form", async () => {
    formCheck.on = true;
    const payload = {
      format: EXCHANGE_FORMAT_SINGLE,
      build: {
        title: "Fast Blademaster harass",
        race: "orc",
        summary: "Early harass with the Blademaster into a fast expansion.",
        author: "Tester",
        // No Food on any step: a blank Food must not stop the form.
        steps: [{ instruction: "Train a peon" }, { instruction: "Build a burrow" }, { instruction: "Build an altar" }],
      },
    };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    submitBuild.mockResolvedValue({ status: "ok", slug: "fast-blademaster" });
    const { container } = render(<BuildSubmitForm />);
    await screen.findByDisplayValue("Fast Blademaster harass");

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(submitBuild).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
