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
    expect(screen.getByRole("button", { name: "Move out of the split" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Move out of the split" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Path" }));
    expect(screen.getByRole("tab", { name: "Path C" })).toHaveAttribute("aria-selected", "true");
    expect(addLine(container)).toBe("3c");
    expect(screen.queryByRole("button", { name: "Path" })).not.toBeInTheDocument();
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
    expect(addLine(container)).toBe("3b");
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
  const theirBase = () => screen.getByRole("button", { name: "Add a stop at their base" });
  // The hero's Bring entry is the one toggle in Bring.
  const heroEntry = () => document.querySelector("[data-bring] button[aria-pressed]");
  const pressed = (name: string) => within(screen.getByRole("group", { name: "Waypoint" })).getByRole("button", { name }).getAttribute("aria-pressed");

  it("Waypoint asks first: three choices in the row, Cancel and Escape close it, focus comes back", async () => {
    await load();
    fireEvent.click(waypoint());
    expect(screen.getByText("Waypoint after stop 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^On the route/ })).toHaveTextContent("The line goes through it.");
    expect(screen.getByRole("button", { name: /^A pin/ })).toHaveTextContent("Marks a spot. The line skips it.");
    expect(screen.getByRole("button", { name: /^No place/ })).toHaveTextContent("An action, e.g. TP home.");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /^On the route/ })));
    expect(screen.getByText("Choose the kind of waypoint first.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(waypoint()));
    fireEvent.click(waypoint());
    fireEvent.keyDown(screen.getByRole("button", { name: /^A pin/ }), { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(waypoint()));
    expect(screen.queryByText("Waypoint after stop 2")).not.toBeInTheDocument();
  });

  it("keeps No place unavailable when the numbered stop cap is full", async () => {
    await load(maps[0].camps.slice(2, 12).map((camp) => ({ campId: camp.id })), 12);
    fireEvent.click(waypoint());
    expect(screen.getByRole("button", { name: /^No place/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^A pin/ })).toBeEnabled();
    expect(screen.getByText(/cap of 12 numbered stops/)).toBeInTheDocument();
  });

  it("No place adds an action row and focuses its text; A pin arms the map and adds a pin there", async () => {
    const { container } = await load();
    fireEvent.click(waypoint());
    fireEvent.click(screen.getByRole("button", { name: /^No place/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "What happens" })));
    expect(screen.getByText("New action")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Undo: add action/ })).toBeInTheDocument();

    fireEvent.click(waypoint());
    fireEvent.click(screen.getByRole("button", { name: /^A pin/ }));
    expect(screen.getByText("Click the spot to pin")).toBeInTheDocument();
    expect(screen.getByText("Any spot. The line skips it.")).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
    fireEvent.click(theirBase());
    const pin = container.querySelector("li[data-pin]")!;
    expect(within(pin as HTMLElement).getByText("Meanwhile")).toBeInTheDocument();
    expect(within(pin as HTMLElement).getByText("New pin")).toBeInTheDocument();
    expect(within(pin as HTMLElement).getByText("their base")).toBeInTheDocument();
    // A pin at their base scouts; it is never an attack.
    expect(pressed("Pin")).toBe("true");
    expect(screen.getByRole("button", { name: "Scout" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
  });

  it("the switch: pin to route, to No place and back, each one undo step; no Hero entry on a waypoint", async () => {
    const { container } = await load([{ campId: null, action: "Scout", place: { kind: "scout", at: { start: their } }, hero: false }]);
    fireEvent.click(container.querySelector("li[data-waypoint] button")!);
    expect(pressed("Pin")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Bring units" }));
    expect(document.querySelector("[data-bring]")).toBeInTheDocument();
    expect(heroEntry()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "On the route" }));
    expect(pressed("On the route")).toBe("true");
    expect(container.querySelector("li[data-pin]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Undo: edit waypoint/ })).toBeInTheDocument();
    expect(heroEntry()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "No place" }));
    expect(pressed("No place")).toBe("true");
    expect(screen.queryByRole("button", { name: "Scout" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "What happens" })).toHaveValue("Scout");

    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    expect(screen.getByText("Click the spot to pin")).toBeInTheDocument();
    fireEvent.click(theirBase());
    expect(pressed("Pin")).toBe("true");
    expect(container.querySelector("li[data-pin]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Undo:/ }));
    expect(pressed("No place")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Undo:/ }));
    expect(pressed("On the route")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Undo:/ }));
    expect(pressed("Pin")).toBe("true");
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
    fireEvent.click(screen.getByRole("button", { name: /^A pin/ }));
    fireEvent.click(theirBase());
    fireEvent.change(screen.getByRole("textbox", { name: "What happens" }), { target: { value: "Scout their base" } });

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(submitCreepRoute).toHaveBeenCalled());
    const stops = JSON.parse(String((submitCreepRoute.mock.calls[0][1] as FormData).get("stopsJson")));
    expect(JSON.stringify(stops[3])).toBe(JSON.stringify(stops[2]));
    expect(stops[3]).toMatchObject(old);
  });
});
