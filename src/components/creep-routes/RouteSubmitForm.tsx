"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ChevronDown, Undo2 } from "lucide-react";
import { submitCreepRoute, type SubmitState } from "@/app/(site)/learn/creep-routes/submit/actions";
import { RouteSetup } from "./RouteSetup";
import { RouteEditor } from "./RouteEditor";
import { CreepMapPlayground } from "./CreepMapPlayground";
import { RouteDetailsFields } from "./RouteDetailsFields";
import { SectionTitle } from "./SectionTitle";
import { CampCard } from "./CampCard";
import { useCampCard } from "./useCampCard";
import type { StopRowData } from "./StopEditBody";
import { SAME_CAMP_LINE, popUndo, pushUndo, rowsToStops, sameCampSequence, stopToRow, type UndoEntry } from "./stop-rows";
import { ButtonLink } from "@/components/ui/Button";
import type { CrestOption } from "@/components/builds/RaceCrestPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { BuildRace } from "@/lib/builds/types";
import type { CreepMap, CreepRoute, RouteLevel } from "@/lib/creep-routes/types";
import { IMPORT_HASH_KEY, decodeFromHash, parseExchange, type ExchangeCreepRoute } from "@/lib/creep-routes/exchange";
import { normalizePatch } from "@/lib/patches.mjs";

const initial: SubmitState = { status: "idle" };

/**
 * `/learn/creep-routes/submit`: a two-panel click-to-author editor above a
 * details form. Mirrors `BuildSubmitForm`'s shape (honeypot, `startedAt`,
 * `useActionState`, field-level errors keyed like `stops.2.action`) with a
 * map instead of a step list. `submissionsOpen` is read from the server
 * (`canAcceptSubmissions()`, evaluated in `page.tsx`) so the "closed"
 * notice is in the very first server-rendered HTML, not only after a
 * failed submit.
 */
export function RouteSubmitForm({
  maps,
  builds,
  defaultMapSlug,
  defaultRace,
  defaultVsRaces,
  defaultLevel,
  submissionsOpen,
}: {
  maps: CreepMap[];
  builds: { slug: string; title: string; race: BuildRace }[];
  defaultMapSlug?: string;
  /** `?race=`/`?vs=`/`?level=` prefill — validated by the page against the
   *  known ids before reaching here (F010, gaps.md #3). */
  defaultRace?: BuildRace;
  defaultVsRaces?: BuildRace[];
  defaultLevel?: RouteLevel;
  submissionsOpen: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitCreepRoute, initial);

  const [mapSlug, setMapSlug] = useState(defaultMapSlug ?? maps[0]?.slug ?? "");
  const map = maps.find((m) => m.slug === mapSlug) ?? maps[0];

  const [race, setRace] = useState<CrestOption | "">(defaultRace ?? "");
  const [vsRaces, setVsRaces] = useState<BuildRace[]>(defaultVsRaces ?? []);
  const [level, setLevel] = useState<RouteLevel>(defaultLevel ?? "standard");
  // Index into the chosen map's `starts` — which spawn is your base. Reset
  // to 0 whenever the map changes (see `handleMapChange` below), since a
  // start index only means anything relative to the map it was picked on.
  const [start, setStart] = useState(0);
  const handleMapChange = (slug: string) => {
    setMapSlug(slug);
    setStart(0);
  };
  const [hero, setHero] = useState("");
  const [buildSlug, setBuildSlug] = useState("");
  const [stops, setStops] = useState<StopRowData[]>([]);
  // Undo for the stop list (`editor-rows.mjs`): earlier lists with what changed; no redo, gone on leaving the page.
  const [undo, setUndo] = useState<UndoEntry[]>([]);
  const remember = (label: string) => setUndo((u) => pushUndo(u, stops, label));
  const undoLast = () => {
    const top = popUndo(undo);
    if (!top) return;
    setStops(top.entry.rows);
    setUndo(top.stack);
  };
  // Ctrl+Z (Cmd+Z) undoes the last stop-list change when focus is not in a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (!undo.length) return;
      e.preventDefault();
      undoLast();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  const { card, openCampId, hoverEnter, hoverLeave, cancelHoverLeave, pin, close } = useCampCard();
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState({
    title: "", summary: "", patch: "", author: "", authorDiscord: "", sourceUrl: "", videoUrl: "", supersedes: "", description: "",
  });
  const bind = (k: keyof typeof text) => ({
    id: k,
    name: k,
    value: text[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setText((t) => ({ ...t, [k]: e.target.value })),
  });

  // Client-only timestamp for the fill-time spam check.
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setStartedAt(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  // #route= deep link from a future overlay/replay importer.
  const applyExchange = (r: ExchangeCreepRoute) => {
    setText({
      title: r.title, summary: r.summary, patch: normalizePatch(r.patch) ?? "", author: r.author,
      authorDiscord: r.authorDiscord ?? "", sourceUrl: r.sourceUrl ?? "",
      videoUrl: r.videoUrl ?? "",
      // Set when the payload came from a route page's "Suggest an update"
      // link; a plain import (replay, overlay) omits it, because that is a
      // new route rather than an edit.
      supersedes: r.supersedes ?? "",
      description: r.description ?? "",
    });
    if (maps.some((m) => m.slug === r.map)) setMapSlug(r.map);
    if (r.race) setRace(r.race as BuildRace);
    setVsRaces(r.vsRaces as BuildRace[]);
    setLevel(r.level as RouteLevel);
    setStart(r.start ?? 0);
    setHero(r.hero ?? "");
    setBuildSlug(r.build ?? "");
    setTags(r.tags.slice(0, 8));
    setStops(r.stops.map(stopToRow));
    setUndo([]);
  };
  // Applies a `#route=` payload on mount, and again on `hashchange` so a
  // link followed while the editor is already open (in-tab hash navigation,
  // a Playwright `navigate` to a same-page URL) also prefills — not just a
  // fresh page load. `lastHandledHashRef` guards against re-applying the
  // same hash value twice (mount + a stray hashchange for the same value).
  const lastHandledHashRef = useRef<string | null>(null);
  useEffect(() => {
    let timeoutId: number | undefined;

    const warnRejected = (reason: string) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[creep-routes] ignored #route= payload:", reason);
      }
    };

    const applyFromHash = () => {
      const m = window.location.hash.match(new RegExp(`[#&]${IMPORT_HASH_KEY}=([^&]+)`));
      if (!m) return;
      const raw = m[1];
      if (timeoutId != null) window.clearTimeout(timeoutId);
      // The guard is checked/set inside the deferred callback, not here at
      // match time: React 18 dev Strict Mode mounts this effect, cleans it
      // up (cancelling this timeout), then mounts it again — setting the
      // guard eagerly would make that second, real mount a no-op.
      timeoutId = window.setTimeout(() => {
        if (raw === lastHandledHashRef.current) return;
        lastHandledHashRef.current = raw;
        const json = decodeFromHash(raw);
        if (json) {
          const r = parseExchange(json);
          if (r.ok) applyExchange(r.route);
          else warnRejected(r.error);
        } else {
          warnRejected("malformed base64url #route= payload");
        }
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }, 0);
    };

    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.removeEventListener("hashchange", applyFromHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = state.status === "error" ? state.fields ?? {} : {};
  const stopsJson = JSON.stringify(rowsToStops(stops));
  // The submit check's notes that do not block: a split whose paths are the same camps in the same order.
  const notes = stops.some((r) => sameCampSequence(r.split)) ? [SAME_CAMP_LINE] : [];
  // "Edit | Preview": the preview is the route page's own section (map and list) drawn from the draft.
  const [preview, setPreview] = useState(false);
  const draftRoute = useMemo(
    () =>
      map
        ? ({
            slug: "draft", title: text.title, race: (race && race !== "any" ? race : "human") as BuildRace, vsRaces, level,
            map: { slug: map.slug, name: map.name, minimapUrl: map.minimapUrl }, start, hero: hero || undefined,
            summary: text.summary, author: text.author, featured: false, publishedAt: "", updatedAt: "",
            stops: rowsToStops(stops),
          } as CreepRoute)
        : null,
    [map, text.title, text.summary, text.author, race, vsRaces, level, start, hero, stops],
  );

  if (state.status === "ok") {
    return (
      <div className="panel mx-auto max-w-2xl p-8 text-center sm:p-12">
        <CheckCircle2 size={40} className="mx-auto text-win" />
        <h2 className="mt-4 text-[1.4rem] font-bold tracking-[0.05em]">Thanks, it&apos;s in the queue</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          A coach will look it over and publish it, usually within a few days. It will appear in the route list with your name on it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/learn/creep-routes">Back to routes</ButtonLink>
          <ButtonLink href="/learn/creep-routes/submit" variant="outline">Submit another</ButtonLink>
        </div>
      </div>
    );
  }

  if (!map) {
    return <p className="panel p-8 text-center text-sm text-muted">No maps are configured yet.</p>;
  }

  return (
    <form action={formAction}>
      <div className="hidden" aria-hidden>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="stopsJson" value={stopsJson} />
      <input type="hidden" name="map" value={mapSlug} />
      <input type="hidden" name="race" value={race === "any" ? "" : race} />
      {vsRaces.map((r) => (
        <input key={r} type="hidden" name="vsRaces" value={r} />
      ))}
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="start" value={String(start)} />
      <input type="hidden" name="hero" value={hero} />
      <input type="hidden" name="build" value={buildSlug} />
      <input type="hidden" name="tags" value={tags.join(",")} />

      <div className="min-w-0 space-y-8">
        {!submissionsOpen ? (
          <p role="alert" className="panel border-gold/40 bg-gold/5 px-5 py-4 text-sm text-fg">
            Submissions are closed on this site right now. Post your route in the Gym Discord instead — a coach can add it by hand.
          </p>
        ) : null}

        <details className="group rounded border border-gold/30 bg-gold/5 text-sm text-muted">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="kicker">What makes a good route</span>
            <ChevronDown size={18} className="shrink-0 text-gold transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-1.5 border-t border-gold/20 px-5 py-4">
            <li className="flex gap-2"><span className="text-gold">·</span> Click camps on the map in the order you clear them, no need to type camp contents.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> A note or condition on a stop says <em>why</em>: when it works, what to watch for.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> Standard is the current meta route; Beginner is the safer, simpler pick — choose the one your route actually is.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> Condition is the short trigger shown before the note (e.g. &quot;if harassed&quot;); Note explains what to do and why.</li>
          </ul>
        </details>

        <RouteSetup
          maps={maps}
          mapSlug={mapSlug}
          onMapChange={handleMapChange}
          race={race}
          onRaceChange={setRace}
          vsRaces={vsRaces}
          onVsRacesChange={setVsRaces}
          level={level}
          onLevelChange={setLevel}
          hero={hero}
          onHeroChange={setHero}
          builds={builds}
          buildSlug={buildSlug}
          onBuildChange={setBuildSlug}
          errors={errors}
        />

        <section className="panel p-5 sm:p-7">
          {/* The map is the primary fact here too, updating live with the
           *  map select in section 1: "2 · Stops on Autumn Leaves v2".
           *  Thumbnail grown from 22px to 40px (F009-followup-3, item 4) —
           *  race crests elsewhere in the editor are unchanged, only the
           *  map's own thumbnails grew. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 max-w-full">
          <SectionTitle n={2}>
            <span className="inline-flex min-w-0 items-center gap-2.5">
              <Image
                src={map.minimapUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded bg-black/40 object-contain ring-1 ring-gold/40"
              />
              <span className="truncate">Stops on {map.name}</span>
            </span>
          </SectionTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {undo.length ? (
              <button
                type="button"
                onClick={undoLast}
                title="Ctrl+Z"
                className="inline-flex h-8 items-center gap-1.5 rounded border border-line px-2.5 text-xs text-muted hover:text-fg"
              >
                <Undo2 aria-hidden size={14} />
                Undo: {undo[undo.length - 1].label}
              </button>
            ) : null}
            <div role="radiogroup" aria-label="Edit or preview" className="inline-flex overflow-hidden rounded border border-line">
              {(["Edit", "Preview"] as const).map((label) => {
                const on = (label === "Preview") === preview;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPreview(label === "Preview")}
                    className={`h-8 px-3 text-xs ${label === "Preview" ? "border-l border-line" : ""} ${on ? "bg-gold/10 text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          </div>
          {errors.stops ? <p className="mb-3 mt-3 text-xs text-loss">{errors.stops}</p> : null}
          {/* The editor stays mounted under the preview, so its selection survives the round trip. */}
          {preview && draftRoute ? (
            <div className="mt-4">
              <CreepMapPlayground key={stopsJson} map={map} route={draftRoute} />
            </div>
          ) : null}
          <div className="mt-4" hidden={preview}>
            <RouteEditor
              map={map}
              stops={stops}
              setStops={setStops}
              remember={remember}
              start={start}
              onStartChange={setStart}
              iconRace={(race && race !== "any" ? (race as IconRace) : undefined)}
              heroIcon={hero || undefined}
              fieldError={(k) => errors[k]}
              onOpenCard={pin}
              onHoverEnter={hoverEnter}
              onHoverLeave={hoverLeave}
              openCampId={openCampId}
            />
          </div>
        </section>

        {card ? (
          <CampCard
            showCampId
            camp={card.camp}
            kills={stops.find((s) => s.campId === card.camp.id)?.kills}
            leaveRest={stops.find((s) => s.campId === card.camp.id)?.leaveRest}
            anchorEl={card.trigger}
            pinned={card.pinned}
            onClose={close}
            onPointerEnter={cancelHoverLeave}
            onPointerLeave={hoverLeave}
          />
        ) : null}

        <RouteDetailsFields
          text={text}
          bind={bind}
          tags={tags}
          onTagsChange={setTags}
          errors={errors}
          errorMessage={state.status === "error" ? state.message : undefined}
          notes={notes}
          pending={pending}
          submissionsOpen={submissionsOpen}
        />
      </div>
    </form>
  );
}
