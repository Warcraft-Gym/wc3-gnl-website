// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

    fireEvent.click(await screen.findByRole("button", { name: "Move into path A" }));
    await waitFor(() => expect(document.activeElement).toHaveAttribute("aria-label", "Move down"));
    expect(screen.getByRole("button", { name: "Move out of the paths" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Move out of the paths" }));
    // Back first: up is disabled, so focus lands on the other arrow.
    await waitFor(() => expect(document.activeElement).toHaveAttribute("aria-label", "Move into path A"));
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

/** The number on the add line: where the next map click lands. */
const addLine = (container: HTMLElement) => container.querySelector("[data-add-label]")?.textContent;

describe("RouteSubmitForm: the target and the add line", () => {
  const [a, b] = maps[0].camps;
  const loadTwo = async () => {
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: b.id }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    const view = renderForm();
    await waitFor(() => expect(view.container.querySelectorAll("li[data-stop]").length).toBe(2));
    return view;
  };

  it("a click on a leg puts the next stop between its two stops; a second click puts it back at the end", async () => {
    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route-leg" });
    const [, , c, d] = maps[0].camps;
    const { container } = await loadTwo();
    const camp = (id: string) => fireEvent.click([...container.querySelectorAll(`[data-camp="${id}"]`)].at(-1)!);
    const leg = () => container.querySelector('[data-leg="0>1"]')!;
    expect(leg().getAttribute("aria-label")).toBe("Put the next step between stop 1 and stop 2");
    fireEvent.click(leg());
    expect(addLine(container)).toBe("2");
    expect(screen.getByRole("button", { name: "Continue the route" })).toBeInTheDocument();
    fireEvent.click(leg());
    expect(addLine(container)).toBe("3");
    fireEvent.keyDown(leg(), { key: "Enter" });
    expect(addLine(container)).toBe("2");
    camp(c.id);
    // The target sits right after the new stop.
    expect(addLine(container)).toBe("3");
    fireEvent.click(screen.getByRole("button", { name: "Continue the route" }));
    camp(d.id);

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(submitCreepRoute).toHaveBeenCalled());
    const stops = JSON.parse(String((submitCreepRoute.mock.calls[0][1] as FormData).get("stopsJson")));
    expect(stops.map((s: { campId: string }) => s.campId)).toEqual([a.id, c.id, b.id, d.id]);
    expect(JSON.stringify({ ...stops[1], campId: d.id })).toBe(JSON.stringify(stops[3]));
  });

  it("opening a stop never moves the target; a camp stop opens slim", async () => {
    const { container } = await loadTwo();
    expect(addLine(container)).toBe("3");
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    expect(addLine(container)).toBe("3");
    expect(screen.queryByText(/Adds stop/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add at the end instead" })).not.toBeInTheDocument();
    // A camp stop opens with the kill order and the note; Bring and the condition wait behind add buttons.
    expect(screen.queryByLabelText("Condition")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Condition" }));
    expect(screen.getByLabelText("Condition")).toBeInTheDocument();
  });

  it("Two paths adds a block at the end and targets path A; a path's add line and Continue the route move the target", async () => {
    const { container } = await loadTwo();
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    fireEvent.click(screen.getByRole("button", { name: "Two paths" }));
    expect(container.querySelector("li[data-split]")).toBeInTheDocument();
    expect(container.querySelectorAll("li[data-stop]").length).toBe(2);
    expect(addLine(container)).toBe("3a");
    expect(screen.getByRole("button", { name: /^Undo: add paths/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Path A name")).toHaveValue("");
    // A tab shows its path and makes it the target; the other path's end is a quiet add line.
    fireEvent.click(screen.getByRole("tab", { name: "Path B" }));
    expect(screen.getByRole("tab", { name: "Path B" })).toHaveAttribute("aria-selected", "true");
    expect(addLine(container)).toBe("3b");
    fireEvent.click(screen.getByRole("tab", { name: "Path A" }));
    expect(addLine(container)).toBe("3a");
    fireEvent.click(screen.getByRole("button", { name: "Add path" }));
    expect(screen.getByRole("tab", { name: "Path C" })).toHaveAttribute("aria-selected", "true");
    expect(addLine(container)).toBe("3c");
    expect(screen.queryByRole("button", { name: "Add path" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue the route" }));
    expect(addLine(container)).toBe("3");
    expect(screen.queryByRole("button", { name: "Continue the route" })).not.toBeInTheDocument();
  });

  it("an undo takes the block away and puts the target back", async () => {
    const { container } = await loadTwo();
    fireEvent.click(screen.getByRole("button", { name: "Two paths" }));
    expect(addLine(container)).toBe("3a");
    fireEvent.click(screen.getByRole("button", { name: /^Undo: add paths/ }));
    expect(container.querySelector("li[data-split]")).not.toBeInTheDocument();
    expect(addLine(container)).toBe("3");
  });
});

describe("RouteSubmitForm: Remove paths and remove path say what stays", () => {
  const [a, b, c] = maps[0].camps;
  const load = async () => {
    const split = { mode: "or", arms: [{ label: "Fast", stops: [{ campId: b.id }] }, { label: "Safe", stops: [{ campId: c.id }] }] };
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: null, split }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route-5" });
    const view = renderForm();
    await waitFor(() => expect(view.container.querySelector("li[data-split]")).toBeInTheDocument());
    return view;
  };
  const submitted = async (container: HTMLElement) => {
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(submitCreepRoute).toHaveBeenCalled());
    return JSON.parse(String((submitCreepRoute.mock.calls[0][1] as FormData).get("stopsJson"))).map((s: { campId: string | null; split?: unknown }) => s.split ? "split" : s.campId);
  };

  it("the block's trash keeps path A, even while path B is the target, and the target goes to the route", async () => {
    const { container } = await load();
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    expect(addLine(container)).toBe("3b");
    fireEvent.click(screen.getByRole("button", { name: "Remove paths, keep path A" }));
    expect(screen.getByRole("button", { name: /^Undo: remove paths/ })).toBeInTheDocument();
    expect(addLine(container)).toBe("3");
    expect(await submitted(container)).toEqual([a.id, b.id]);
  });

  it("a path heading's x removes one of two paths, and the other path's stops take the split's place", async () => {
    const { container } = await load();
    // Only the shown path's heading is listed.
    expect(screen.queryByRole("button", { name: "Remove path B" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove path B" }));
    fireEvent.click(screen.getByRole("button", { name: /^Undo: remove path B/ }));
    // Undo keeps the current target, the end of the route, which still exists.
    expect(addLine(container)).toBe("3");
    fireEvent.click(screen.getByRole("tab", { name: "Fast" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove path A" }));
    expect(addLine(container)).toBe("3");
    expect(container.querySelector("li[data-split]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Undo: remove path A/ })).toBeInTheDocument();
    expect(await submitted(container)).toEqual([a.id, c.id]);
  });
});

describe("RouteSubmitForm: focus never drops to the page", () => {
  it("lands on Waypoint after a stop is removed", async () => {
    const [a, b] = maps[0].camps;
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: b.id }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    const { container } = renderForm();
    await waitFor(() => expect(container.querySelectorAll("li[data-stop]").length).toBe(2));
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    fireEvent.click(await screen.findByRole("button", { name: "Remove stop" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Waypoint" })));
  });
});

describe("RouteSubmitForm: waypoints on the route, pins and no place", () => {
  const [a, b] = maps[0].camps;
  const their = String(maps[0].starts[1].player);
  const load = async (more: object[] = [], numbered = 2) => {
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: b.id }, ...more] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    const view = renderForm();
    await waitFor(() => expect(view.container.querySelectorAll("li[data-stop]").length).toBe(numbered));
    return view;
  };
  const waypoint = () => screen.getByRole("button", { name: "Waypoint" });
  const theirBase = () => screen.getByRole("button", { name: "Add a waypoint at Their base" });
  // The hero's Bring entry is the one toggle in Bring.
  const heroEntry = () => document.querySelector("[data-bring] button[aria-pressed]");
  const pressed = (name: string) => within(screen.getByRole("group", { name: "Waypoint" })).getByRole("button", { name }).getAttribute("aria-pressed");

  it("in the normal state bases, mines and shops take no click", async () => {
    await load();
    expect(waypoint()).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /^Add a waypoint at/ })).not.toBeInTheDocument();
    expect(document.querySelector("[data-places]")).toBeNull();
  });

  it("Waypoint switches the map to its places; pressing it again, Cancel and Escape leave, focus comes back", async () => {
    await load();
    fireEvent.click(waypoint());
    expect(waypoint()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Click a base, gold mine, shop or any spot")).toBeInTheDocument();
    expect(screen.getByText("Tap a base, gold mine, shop or any spot")).toBeInTheDocument();
    expect(theirBase()).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add a waypoint at Gold mine" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(waypoint()));
    expect(screen.queryByRole("button", { name: /^Add a waypoint at/ })).not.toBeInTheDocument();
    fireEvent.click(waypoint());
    fireEvent.click(waypoint());
    expect(waypoint()).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(waypoint());
    fireEvent.keyDown(theirBase(), { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(waypoint()));
    expect(document.querySelector("[data-armed-bar]")).toBeNull();
  });

  it("keeps No place unavailable when the numbered stop cap is full", async () => {
    await load(maps[0].camps.slice(2, 12).map((camp) => ({ campId: camp.id })), 12);
    fireEvent.click(waypoint());
    expect(screen.getByRole("button", { name: "No place" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "No place" }));
    expect(screen.queryByText("New action")).not.toBeInTheDocument();
  });

  it("No place adds an action row at the target and focuses its text", async () => {
    await load();
    fireEvent.click(waypoint());
    fireEvent.click(screen.getByRole("button", { name: "No place" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "What happens" })));
    expect(screen.getByText("New action")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Undo: add action/ })).toBeInTheDocument();
    expect(document.querySelector("[data-armed-bar]")).toBeNull();
  });

  it("a target click adds at the target with the kind of its place, opens the row and focuses its text", async () => {
    const { container } = await load();
    fireEvent.click(waypoint());
    fireEvent.click(screen.getAllByRole("button", { name: "Add a waypoint at Gold mine" })[0]);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "What happens" })));
    expect(screen.getByRole("button", { name: "Expand" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Undo: add waypoint/ })).toBeInTheDocument();
    expect(container.querySelector("li[data-waypoint]")).toBeInTheDocument();
    expect(document.querySelector("[data-places]")).toBeNull();

    // Their base is an attack: a numbered stop.
    fireEvent.click(waypoint());
    fireEvent.click(theirBase());
    expect(container.querySelector('li[data-stop="3"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attack" })).toHaveAttribute("aria-pressed", "true");
  });

  it("the switch: pin to route and back, each one undo step; no Hero entry on a waypoint; no No place in it", async () => {
    const { container } = await load([{ campId: null, action: "Scout", place: { kind: "scout", at: { start: their } }, hero: false }]);
    fireEvent.click(container.querySelector("li[data-waypoint] button")!);
    expect(pressed("Pin")).toBe("true");
    const kinds = () => within(screen.getByRole("group", { name: "What happens here" })).getAllByRole("button").map((b) => b.textContent?.trim());
    expect(kinds()).toEqual(["Shop", "Expand", "Build", "Scout", "Other"]);
    expect(within(screen.getByRole("group", { name: "Waypoint" })).queryByRole("button", { name: "No place" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bring units" }));
    expect(document.querySelector("[data-bring]")).toBeInTheDocument();
    expect(heroEntry()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "On the route" }));
    expect(pressed("On the route")).toBe("true");
    expect(kinds()).toEqual(["Shop", "Expand", "Build", "Scout", "Other", "Attack"]);
    expect(container.querySelector("li[data-pin]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Undo: edit waypoint/ })).toBeInTheDocument();
    expect(heroEntry()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    expect(container.querySelector("li[data-pin]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Undo:/ }));
    expect(pressed("On the route")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Undo:/ }));
    expect(pressed("Pin")).toBe("true");
  });

  it("Move moves the row to the clicked place and keeps its text, kind and type, in one undo step", async () => {
    const { container } = await load([{ campId: null, action: "Scout", place: { kind: "scout", at: { start: their } }, hero: false }]);
    fireEvent.click(container.querySelector("li[data-waypoint] button")!);
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(screen.getByText("Click the new place for this waypoint")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No place" })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Add a waypoint at Gold mine" })[0]);
    expect(within(container.querySelector("li[data-pin]") as HTMLElement).getByText("a gold mine")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "What happens" })).toHaveValue("Scout");
    expect(screen.getByRole("button", { name: "Scout" })).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Pin")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Move" })));
    expect(screen.getByRole("button", { name: /^Undo: move waypoint/ })).toBeInTheDocument();
  });

  it("a move to a free point keeps the text and the kind; a new free point is Other", async () => {
    const { container } = await load([{ campId: null, action: "Scout", place: { kind: "scout", at: { start: their } } }]);
    fireEvent.click(container.querySelector("li[data-waypoint] button")!);
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    fireEvent.click(container.querySelector("[data-places]")!);
    expect(screen.getByRole("textbox", { name: "What happens" })).toHaveValue("Scout");
    const kind = (name: string) => within(screen.getByRole("group", { name: "What happens here" })).getByRole("button", { name }).getAttribute("aria-pressed");
    expect(kind("Scout")).toBe("true");
    expect(screen.getByRole("button", { name: /^Undo: move waypoint/ })).toBeInTheDocument();
    fireEvent.click(waypoint());
    fireEvent.click(container.querySelector("[data-places]")!);
    expect(kind("Other")).toBe("true");
    expect(screen.getByRole("textbox", { name: "What happens" })).toHaveAttribute("placeholder", "e.g. Wait here until the creeps sleep");
  });

  it("an action row has only its text and the note", async () => {
    await load();
    fireEvent.click(waypoint());
    fireEvent.click(screen.getByRole("button", { name: "No place" }));
    expect(screen.queryByRole("group", { name: "Waypoint" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bring units" })).toBeNull();
    expect(screen.getByLabelText("Note")).toHaveAttribute("placeholder", "Note (optional)");
    expect(screen.queryByText("What to do at this camp and why")).toBeNull();
  });

  it("a click on a waypoint's mark opens its row and adds nothing; pointing at a row rings its mark", async () => {
    const { container } = await load([{ campId: null, action: "Build", place: { kind: "build", at: { start: their } } }]);
    const rows = container.querySelectorAll("li").length;
    // The header counts waypoints apart from the numbered stops.
    expect(screen.getByText("· 2 stops · 1 waypoint")).toBeInTheDocument();
    fireEvent.click(container.querySelector("svg g[data-waypoint]")!);
    expect(screen.getByRole("button", { name: "Move" })).toBeInTheDocument();
    expect(container.querySelectorAll("li").length).toBe(rows);
    expect(container.querySelector("svg [data-ring]")).toBeNull();
    fireEvent.mouseEnter(container.querySelector('li[data-stop="1"]')!);
    expect(container.querySelector("svg [data-ring]")).toBeInTheDocument();
    fireEvent.mouseLeave(container.querySelector('li[data-stop="1"]')!);
    expect(container.querySelector("svg [data-ring]")).toBeNull();
  });

  it("an attack switched to Pin scouts", async () => {
    const { container } = await load([{ campId: null, action: "Harass", place: { kind: "attack", at: { start: their } } }], 3);
    fireEvent.click(container.querySelector('li[data-stop="3"] button')!);
    expect(pressed("On the route")).toBe("true");
    // An attack keeps the hero's Bring entry.
    fireEvent.click(screen.getByRole("button", { name: "Bring units" }));
    expect(heroEntry()).not.toBeNull();
    expect(screen.getByRole("button", { name: "Attack" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    expect(pressed("Pin")).toBe("true");
    expect(screen.getByRole("button", { name: "Scout" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
  });

  it("a pin submits the same stop object as today's hero-off waypoint", async () => {
    submitCreepRoute.mockResolvedValue({ status: "ok", slug: "test-route-5" });
    const old = { campId: null, action: "Scout their base", place: { kind: "scout", at: { start: their } }, hero: false };
    const { container } = await load([old]);
    fireEvent.click(waypoint());
    fireEvent.click(theirBase());
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    fireEvent.change(screen.getByRole("textbox", { name: "What happens" }), { target: { value: "Scout their base" } });

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(submitCreepRoute).toHaveBeenCalled());
    const stops = JSON.parse(String((submitCreepRoute.mock.calls[0][1] as FormData).get("stopsJson")));
    expect(JSON.stringify(stops[3])).toBe(JSON.stringify(stops[2]));
    expect(stops[3]).toMatchObject(old);
  });
});

describe("RouteSubmitForm: paths blocks keep the target on screen", () => {
  const [a, b, c, d] = maps[0].camps;
  const load = async (arms = [{ label: "Fast", stops: [{ campId: b.id }] }, { label: "Safe", stops: [{ campId: c.id }] }], mode = "or") => {
    const payload = { format: EXCHANGE_FORMAT, route: { title: "Imported route", map: maps[0].slug, stops: [{ campId: a.id }, { campId: null, split: { mode, arms } }] } };
    window.location.hash = `#${IMPORT_HASH_KEY}=${encodeForHash(JSON.stringify(payload))}`;
    const view = renderForm();
    await waitFor(() => expect(view.container.querySelector("li[data-split]")).toBeInTheDocument());
    return view;
  };
  // The click target is the innermost of a camp's `data-camp` elements.
  const camp = (container: HTMLElement, id: string) => fireEvent.click([...container.querySelectorAll(`[data-camp="${id}"]`)].at(-1)!);
  const focused = () => document.activeElement as HTMLElement;

  it("a map click adds at path B when it is the target; a camp already there opens instead", async () => {
    const { container } = await load();
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    camp(container, d.id);
    expect(container.querySelector('li[data-stop="3b"]')).toBeInTheDocument();
    camp(container, c.id);
    expect(container.querySelector('li[data-stop="2b"]')).toHaveAttribute("aria-current", "step");
    expect(container.querySelectorAll("li[data-stop]").length).toBe(3);
  });

  it("Two paths goes to the end of the route while the target is in another block", async () => {
    const { container } = await load();
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    fireEvent.click(screen.getByRole("button", { name: "Two paths" }));
    expect(container.querySelectorAll("li[data-split]").length).toBe(2);
    expect(addLine(container)).toBe("3a");
  });

  it("with a fine pointer, Two paths puts focus in path A's name field", async () => {
    const before = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes("pointer: fine") })) as unknown as typeof window.matchMedia;
    try {
      await load();
      fireEvent.click(screen.getByRole("button", { name: "Two paths" }));
      await waitFor(() => expect(focused()).toHaveAttribute("data-path-field"));
      expect(focused()).toHaveAccessibleName("Path A name");
    } finally {
      window.matchMedia = before;
    }
  });

  it("arrow keys move between the builder's tabs", async () => {
    await load();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Fast" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Safe" })).toHaveAttribute("aria-selected", "true");
    expect(focused()).toBe(screen.getByRole("tab", { name: "Safe" }));
  });

  it("switching the kind keeps every path and stop; Take all lists both headings and both add lines", async () => {
    const { container } = await load();
    fireEvent.click(screen.getByRole("radio", { name: "Take all paths simultaneously" }));
    expect(container.querySelectorAll("li[data-stop]").length).toBe(3);
    expect(screen.getByText("The hero's path")).toBeInTheDocument();
    expect(screen.getByText("Units without the hero")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add stops to path 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add stops to path 2" }));
    await waitFor(() => expect(focused()).toHaveAttribute("data-focus", "waypoint"));
    fireEvent.click(screen.getByRole("radio", { name: "Choose one path" }));
    expect(screen.getByRole("tab", { name: "Safe" })).toHaveAttribute("aria-selected", "true");
    expect(container.querySelectorAll("li[data-stop]").length).toBe(2);
  });

  it("focus goes to Waypoint after Continue the route", async () => {
    await load();
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue the route" }));
    await waitFor(() => expect(focused()).toHaveAttribute("data-focus", "waypoint"));
  });

  it("a submit error in a hidden path shows it and leaves a route target; arrows leave the block; the quiet labels read right", async () => {
    submitCreepRoute.mockResolvedValue({ status: "error", message: "Please fix the highlighted fields.", fields: { "stops.1.split.arms.1.stops.0.kills": "Too long" } });
    const { container } = await load();
    // The route is the target: showing path B does not move it.
    expect(screen.getByRole("button", { name: "Add stops to path A" })).toBeInTheDocument();
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("Too long")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Safe" })).toHaveAttribute("aria-selected", "true");
    expect(addLine(container)).toBe("3");
    expect(screen.getByRole("button", { name: "Add stops to path B" })).toBeInTheDocument();
    // Arrows skip the hidden path A: up and down both leave the block.
    expect(screen.getAllByRole("button", { name: "Move out of the paths" }).length).toBe(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Move out of the paths" })[1]);
    expect(screen.getByRole("button", { name: "Path B is empty. Add its stops" })).toBeInTheDocument();
    expect(container.querySelector('li[data-stop="2"]')).toBeInTheDocument();
  });

  it("a stop error in path B moves a target in path A to path B", async () => {
    submitCreepRoute.mockResolvedValue({ status: "error", message: "Please fix the highlighted fields.", fields: { "stops.1.split.arms.1.stops.0.kills": "Too long" } });
    const { container } = await load();
    fireEvent.click(screen.getByRole("tab", { name: "Fast" }));
    expect(addLine(container)).toBe("3a");
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("Too long")).toBeInTheDocument();
    expect(addLine(container)).toBe("3b");
  });

  it("a path's own error shows its tab and focuses its name field", async () => {
    submitCreepRoute.mockResolvedValue({ status: "error", message: "Please fix the highlighted fields.", fields: { "stops.1.split.arms.1.label": "Say when to take this path" } });
    const { container } = await load();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(focused()).toHaveAccessibleName("Path B name"));
    expect(screen.getByText("Say when to take this path")).toBeInTheDocument();
  });

  it("undo keeps the current target when it still exists", async () => {
    const { container } = await load();
    fireEvent.click(screen.getByRole("tab", { name: "Fast" }));
    fireEvent.click(container.querySelector('li[data-stop="1"] button')!);
    fireEvent.click(screen.getByRole("button", { name: "Remove stop" }));
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    expect(addLine(container)).toBe("2b");
    fireEvent.click(screen.getByRole("button", { name: /^Undo: remove stop 1/ }));
    expect(addLine(container)).toBe("3b");
  });

  it("the reader's tabs: the tablist is named by the kind and the panel by its tab", async () => {
    await load();
    fireEvent.click(screen.getByRole("radio", { name: "Preview" }));
    const list = await screen.findByRole("tablist", { name: "Choose one path" });
    fireEvent.click(within(list).getByRole("tab", { name: /Safe/ }));
    const tab = within(list).getByRole("tab", { name: /Safe/ });
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", tab.id);
  });

  it("removing a path keeps the target's path shown, also after a kind switch", async () => {
    const { container } = await load([{ label: "", stops: [{ campId: b.id }] }, { label: "", stops: [{ campId: c.id }] }, { label: "", stops: [{ campId: d.id }] }], "and");
    fireEvent.click(screen.getByRole("button", { name: "Add stops to path 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove path 1" }));
    fireEvent.click(screen.getByRole("radio", { name: "Choose one path" }));
    expect(screen.getByRole("tab", { name: "Path B" })).toHaveAttribute("aria-selected", "true");
    expect(addLine(container)).toBe("3b");
  });

  it("the builder's panel is named by the shown tab", async () => {
    await load();
    fireEvent.click(screen.getByRole("tab", { name: "Safe" }));
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: "Safe" }).id);
  });
});
