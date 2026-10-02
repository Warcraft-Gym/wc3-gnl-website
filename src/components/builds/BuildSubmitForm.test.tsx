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

afterEach(() => {
  cleanup();
  submitBuild.mockReset();
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
