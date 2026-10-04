// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RouteSubmitForm } from "./RouteSubmitForm";
import { FIXTURE_MAPS } from "@/lib/creep-routes/fixtures";
import { EXCHANGE_FORMAT, IMPORT_HASH_KEY, encodeForHash } from "@/lib/creep-routes/exchange-codec.mjs";
import { routeEditHref } from "@/lib/creep-routes/edit-link.mjs";

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

describe("RouteSubmitForm: Submit another with the builder", () => {
  it("resets the stop list, the undo stack and the preview with the rest of the form", async () => {
    const [a, b] = maps[0].camps;
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: b.id }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route-3" });
    const { container } = renderForm();

    // The imported stops, one removed (an undo step), and the preview on.
    await waitFor(() => expect(container.querySelectorAll("li[data-stop]").length).toBe(2));
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    fireEvent.click(await screen.findByRole("button", { name: "Remove stop" }));
    expect(screen.getByRole("button", { name: /^Undo: remove stop 1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Preview" }));

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByText(/Thanks, it.s in the queue/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /submit another/i }));

    await screen.findByLabelText("Title");
    expect(container.querySelectorAll("li[data-stop]").length).toBe(0);
    expect(screen.queryByRole("button", { name: /^Undo:/ })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Edit" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("RouteSubmitForm: the submit check opens the stop it names", () => {
  it("opens the first stop with an error, so its message shows", async () => {
    const [a, b] = maps[0].camps;
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: b.id }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    submitCreepRoute.mockResolvedValue({ status: "error", message: "Please fix the highlighted fields.", fields: { "stops.1.kills": "Too long" } });
    const { container } = renderForm();
    await waitFor(() => expect(container.querySelectorAll("li[data-stop]").length).toBe(2));
    // Neither stop is open, so a stop's message has nowhere to show.
    expect(screen.queryByText("Too long")).not.toBeInTheDocument();

    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("Too long")).toBeInTheDocument();
    expect(container.querySelector('li[data-stop="2"]')).toHaveAttribute("aria-current", "step");
  });
});

describe("RouteSubmitForm: the arrows move a stop into and out of a split", () => {
  it("names the crossing move and keeps focus on the moved stop's arrow", async () => {
    const [a, b, c] = maps[0].camps;
    const split = { mode: "or", arms: [{ label: "Fast", stops: [{ campId: b.id }] }, { label: "Safe", stops: [{ campId: c.id }] }] };
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: null, split }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    const { container } = renderForm();
    await waitFor(() => expect(container.querySelector('li[data-stop="1"]')).toBeInTheDocument());
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);

    fireEvent.click(await screen.findByRole("button", { name: "Move into path 1" }));
    await waitFor(() => expect(document.activeElement).toHaveAttribute("aria-label", "Move down"));
    expect(screen.getByRole("button", { name: "Move out of the split" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Move out of the split" }));
    // Back first: up is disabled, so focus lands on the other arrow.
    await waitFor(() => expect(document.activeElement).toHaveAttribute("aria-label", "Move into path 1"));
    expect(screen.getByRole("button", { name: /^Undo: move stop/ })).toBeInTheDocument();
  });
});

describe("RouteSubmitForm: a stop keeps its key from the edit link to the submit", () => {
  it("shows the pictures line and submits each stop's key, in a path too", async () => {
    const [a, b, c] = maps[0].camps;
    const split = { mode: "xor", arms: [{ label: "Fast", stops: [{ _key: "k2", campId: b.id }] }, { label: "Safe", stops: [{ campId: c.id }] }] };
    const route = { title: "Old route", slug: "old-route", map: { slug: maps[0].slug }, stops: [{ _key: "k1", campId: a.id, images: [{}, {}] }, { split }] };
    window.location.hash = routeEditHref(route)!.split("#")[1];
    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route-4" });
    const { container } = renderForm();
    await waitFor(() => expect(container.querySelector('li[data-stop="1"]')).toBeInTheDocument());
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    expect(await screen.findByText("2 pictures stay with this stop")).toBeInTheDocument();

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(submitCreepRoute).toHaveBeenCalled());
    const stops = JSON.parse(String((submitCreepRoute.mock.calls[0][1] as FormData).get("stopsJson")));
    expect(stops[0].key).toBe("k1");
    expect(stops[1].split.arms[0].stops[0].key).toBe("k2");
  });
});

describe("RouteSubmitForm: the next-stop row and the split form", () => {
  it("asks before it splits, then puts the next stop in path A; a camp stop opens slim", async () => {
    const [a, b] = maps[0].camps;
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: b.id }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    const { container } = renderForm();
    await waitFor(() => expect(container.querySelectorAll("li[data-stop]").length).toBe(2));
    expect(screen.getByText("Adds stop 3 at the end.")).toBeInTheDocument();

    // A camp stop opens with the kill order and the note; Bring and the condition wait behind add buttons.
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    expect(await screen.findByText("Adds stop 2 after stop 1.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Condition")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Condition" }));
    expect(screen.getByLabelText("Condition")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add at the end instead" }));

    fireEvent.click(screen.getByRole("button", { name: "Split here" }));
    expect(container.querySelector("li[data-split]")).not.toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start path A" });
    fireEvent.change(screen.getByPlaceholderText("e.g. Safe"), { target: { value: "Safe" } });
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("e.g. Risky"), { target: { value: "Risky" } });
    expect(start).toBeEnabled();
    fireEvent.click(start);

    expect(container.querySelector("li[data-split]")).toBeInTheDocument();
    expect(screen.getByText("Adds stop 3a to path A (Safe).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Undo: add split/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Path B is empty. Add its stops" }));
    expect(screen.getByText("Adds stop 3b to path B (Risky).")).toBeInTheDocument();
  });
});
