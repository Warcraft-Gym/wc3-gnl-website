"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { submitCreepRoute, type SubmitState } from "@/app/(site)/learn/creep-routes/submit/actions";
import { RouteSetup } from "./RouteSetup";
import { RouteEditor } from "./RouteEditor";
import { RouteDetailsFields } from "./RouteDetailsFields";
import { SectionTitle } from "./SectionTitle";
import { CampCard } from "./CampCard";
import { useCampCard } from "./useCampCard";
import type { StopRowData } from "./StopRow";
import { ButtonLink } from "@/components/ui/Button";
import type { CrestOption } from "@/components/builds/RaceCrestPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { BuildRace } from "@/lib/builds/types";
import type { CreepMap, RouteLevel } from "@/lib/creep-routes/types";
import { IMPORT_HASH_KEY, decodeFromHash, parseExchange, type ExchangeCreepRoute } from "@/lib/creep-routes/exchange";

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
  const { card, openCampId, hoverEnter, hoverLeave, cancelHoverLeave, pin, close } = useCampCard();
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState({
    title: "", summary: "", patch: "", author: "", authorDiscord: "", sourceUrl: "", supersedes: "", description: "",
  });
  const bind = (k: keyof typeof text) => ({
    id: k,
    name: k,
    value: text[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setText((t) => ({ ...t, [k]: e.target.value })),
  });

  // Client-only timestamp for the fill-time spam check.
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setStartedAt(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  // A camp is on the route at most once via the click path: clicking a camp
  // that isn't on the route yet appends a stop; clicking a camp that's
  // already there removes that stop (toggle) instead of adding a duplicate.
  // Base-action stops (`campId: null`) are never touched by this — only
  // camp clicks go through here. Prefilled/imported routes may still carry
  // a repeated campId (older data, the schema allows it); this only guards
  // the click path, so a duplicate from prefill removes just the one match.
  //
  // `useCallback` (F012b, root-cause fix): a fresh function identity on
  // every render used to cascade into `CreepMap`'s `isCampInteractive`
  // (memoized on `[onCampSelect, interactiveCampIds]`), which fed the
  // arrow-key-walk "behaves like hover" effect's own dependency array. That
  // effect re-ran on *every* render — not just real walk-index transitions
  // — and since there's no active walk in the editor it always took the
  // "walk cleared" branch and called `onCampCardHoverLeave()` unconditionally.
  // The moment `hoverEnter`'s 120ms timer opened the card (`openCampId`
  // flowing back down through props), that re-render re-fired the effect,
  // which called `hoverLeave` immediately, whose own 180ms timer then closed
  // the card that had *just* opened — the card flashed open and silently
  // closed before a human dwelling ~1s ever saw it. `CreepMapPlayground`
  // (route page) never hit this because its own `onMarkerSelect` was already
  // `useCallback`d. See `CreepMap`'s walk effect below for the matching
  // hardening, so this class of bug can't recur even if a future caller
  // forgets to memoize its own `onCampSelect`.
  const onCampSelect = useCallback((campId: string) => {
    setStops((rows) => {
      const idx = rows.findIndex((r) => r.campId === campId);
      if (idx !== -1) return rows.filter((_, i) => i !== idx);
      return [
        ...rows,
        { id: Date.now() + Math.random(), campId, action: "", units: [], note: "", condition: "" },
      ];
    });
  }, []);

  // #route= deep link from a future overlay/replay importer.
  const applyExchange = (r: ExchangeCreepRoute) => {
    setText({
      title: r.title, summary: r.summary, patch: r.patch ?? "", author: r.author,
      authorDiscord: r.authorDiscord ?? "", sourceUrl: r.sourceUrl ?? "",
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
    setStops(
      r.stops.map((s) => ({
        id: Date.now() + Math.random(),
        campId: s.campId,
        action: s.action ?? "",
        units: (s.units ?? []).map((u) => ({ id: Date.now() + Math.random(), icon: u.icon, count: String(u.count) })),
        note: s.note ?? "",
        condition: s.condition ?? "",
      })),
    );
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
  const stopsJson = JSON.stringify(
    stops.map((s) => ({
      campId: s.campId,
      action: s.action || undefined,
      units: s.units.filter((u) => u.icon).map((u) => ({ icon: u.icon, count: Number(u.count) || 1 })),
      note: s.note || undefined,
      condition: s.condition || undefined,
    })),
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
            <ChevronDown size={16} className="shrink-0 text-gold transition-transform group-open:rotate-180" />
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
          {errors.stops ? <p className="mb-3 mt-3 text-xs text-loss">{errors.stops}</p> : null}
          <div className="mt-4">
            <RouteEditor
              map={map}
              stops={stops}
              setStops={setStops}
              onCampSelect={onCampSelect}
              start={start}
              onStartChange={setStart}
              iconRace={(race && race !== "any" ? (race as IconRace) : undefined)}
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
            camp={card.camp}
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
          pending={pending}
          submissionsOpen={submissionsOpen}
        />
      </div>
    </form>
  );
}
