// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RouteSubmitForm } from "./RouteSubmitForm";
import { FIXTURE_MAPS } from "@/lib/creep-routes/fixtures";
import { EXCHANGE_FORMAT, IMPORT_HASH_KEY, encodeForHash } from "@/lib/creep-routes/exchange-codec.mjs";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} onClick={(e) => e.preventDefault()} {...rest}>
      {children}
    </a>
  ),
}));

const submitCreepRoute = vi.fn();
vi.mock("@/app/(site)/learn/creep-routes/submit/actions", () => ({
  submitCreepRoute: (...args: unknown[]) => submitCreepRoute(...args),
}));

afterEach(() => {
  cleanup();
  submitCreepRoute.mockReset();
  window.location.hash = "";
});

const maps = FIXTURE_MAPS;

function renderForm() {
  return render(<RouteSubmitForm maps={maps} builds={[]} submissionsOpen />);
}

describe("RouteSubmitForm: Submit another", () => {
  it("gives a fresh, empty form after a mocked submit — not the stale success panel", async () => {
    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route" });
    const { container } = renderForm();

    const titleBefore = screen.getByLabelText("Title") as HTMLInputElement;
    fireEvent.change(titleBefore, { target: { value: "My test route" } });
    expect(titleBefore.value).toBe("My test route");

    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(screen.getByText(/Thanks, it.s in the queue/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit another/i }));

    // The success panel is gone...
    expect(screen.queryByText(/Thanks, it.s in the queue/i)).not.toBeInTheDocument();
    // ...and the form is back, empty (not the "My test route" title that was
    // just submitted) — this is the whole point: a fresh, not-remounted form
    // used to keep showing the success panel forever.
    const titleAfter = await screen.findByLabelText("Title");
    expect((titleAfter as HTMLInputElement).value).toBe("");
  });

  it("does not re-apply a #route= import hash after Submit another, and clears the hash", async () => {
    const payload = {
      format: EXCHANGE_FORMAT,
      route: {
        title: "Imported route",
        map: maps[0].slug,
        stops: [{ campId: null }],
      },
    };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;

    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route-2" });
    const { container } = renderForm();

    // The import applied on mount.
    const importedTitle = await screen.findByDisplayValue("Imported route");
    expect(importedTitle).toBeInTheDocument();
    // ...and the hash was cleared by the importer itself.
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
