"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { submitCreepRoute, type SubmitState } from "@/app/(site)/learn/creep-routes/submit/actions";
import { RouteSetup } from "./RouteSetup";
import { RouteEditor } from "./RouteEditor";
import { RouteDetailsFields } from "./RouteDetailsFields";
import type { StopRowData } from "./StopRow";
import { tryClockSeconds } from "./StopRow";
import { ButtonLink } from "@/components/ui/Button";
import type { CrestOption } from "@/components/builds/RaceCrestPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { BuildRace } from "@/lib/builds/types";
import type { CreepMap, RouteLevel } from "@/lib/creep-routes/types";
import { formatClock } from "@/lib/creep-routes/clock.mjs";
import { IMPORT_HASH_KEY, decodeFromHash, parseExchange, type ExchangeCreepRoute } from "@/lib/creep-routes/exchange";

const initial: SubmitState = { status: "idle" };

/**
 * `/learn/creep-routes/submit`: a two-panel click-to-author editor above a
 * details form. Mirrors `BuildSubmitForm`'s shape (honeypot, `startedAt`,
 * `useActionState`, field-level errors keyed like `stops.2.time`) with a
 * map instead of a step list. `submissionsOpen` is read from the server
 * (`canAcceptSubmissions()`, evaluated in `page.tsx`) so the "closed"
 * notice is in the very first server-rendered HTML, not only after a
 * failed submit.
 */
export function RouteSubmitForm({
  maps,
  builds,
  defaultMapSlug,
  submissionsOpen,
}: {
  maps: CreepMap[];
  builds: { slug: string; title: string }[];
  defaultMapSlug?: string;
  submissionsOpen: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitCreepRoute, initial);

  const [mapSlug, setMapSlug] = useState(defaultMapSlug ?? maps[0]?.slug ?? "");
  const map = maps.find((m) => m.slug === mapSlug) ?? maps[0];

  const [race, setRace] = useState<CrestOption | "">("");
  const [vsRaces, setVsRaces] = useState<BuildRace[]>([]);
  const [level, setLevel] = useState<RouteLevel>("standard");
  const [hero, setHero] = useState("");
  const [buildSlug, setBuildSlug] = useState("");
  const [stops, setStops] = useState<StopRowData[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState({
    title: "", summary: "", patch: "", author: "", authorDiscord: "", sourceUrl: "", description: "",
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

  // Appends a new stop for the clicked camp; clicking the same camp again
  // appends another — a camp can be revisited.
  const nextTimeGuess = () => {
    if (!stops.length) return "0:15";
    const last = stops[stops.length - 1];
    const secs = tryClockSeconds(last.timeText);
    return secs == null ? "" : formatClock(secs + 20);
  };
  function onCampSelect(campId: string) {
    setStops((rows) => [
      ...rows,
      { id: Date.now() + Math.random(), campId, action: "", timeText: nextTimeGuess(), units: [], note: "", condition: "" },
    ]);
  }

  // #route= deep link from a future overlay/replay importer.
  const applyExchange = (r: ExchangeCreepRoute) => {
    setText({
      title: r.title, summary: r.summary, patch: r.patch ?? "", author: r.author,
      authorDiscord: r.authorDiscord ?? "", sourceUrl: r.sourceUrl ?? "", description: r.description ?? "",
    });
    if (maps.some((m) => m.slug === r.map)) setMapSlug(r.map);
    if (r.race) setRace(r.race as BuildRace);
    setVsRaces(r.vsRaces as BuildRace[]);
    setLevel(r.level as RouteLevel);
    setHero(r.hero ?? "");
    setBuildSlug(r.build ?? "");
    setTags(r.tags.slice(0, 8));
    setStops(
      r.stops.map((s) => ({
        id: Date.now() + Math.random(),
        campId: s.campId,
        action: s.action ?? "",
        timeText: s.time,
        units: (s.units ?? []).map((u) => ({ id: Date.now() + Math.random(), icon: u.icon, count: String(u.count) })),
        note: s.note ?? "",
        condition: s.condition ?? "",
      })),
    );
  };
  useEffect(() => {
    const m = window.location.hash.match(new RegExp(`[#&]${IMPORT_HASH_KEY}=([^&]+)`));
    if (!m) return;
    const json = decodeFromHash(m[1]);
    const id = window.setTimeout(() => {
      if (json) {
        const r = parseExchange(json);
        if (r.ok) applyExchange(r.route);
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = state.status === "error" ? state.fields ?? {} : {};
  const stopsJson = JSON.stringify(
    stops.map((s) => ({
      campId: s.campId,
      action: s.action || undefined,
      time: s.timeText,
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
            <li className="flex gap-2"><span className="text-gold">·</span> Times from the in-game clock — either form works, 1:30 or the day clock 16:30.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> A note or condition on a stop says <em>why</em>: when it works, what to watch for.</li>
          </ul>
        </details>

        <section aria-labelledby="route-setup-heading">
          <h2 id="route-setup-heading" className="sr-only">Route setup</h2>
          <RouteSetup
            maps={maps}
            mapSlug={mapSlug}
            onMapChange={setMapSlug}
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
        </section>

        <section className="panel p-5 sm:p-7">
          {errors.stops ? <p className="mb-3 text-xs text-loss">{errors.stops}</p> : null}
          <RouteEditor
            map={map}
            stops={stops}
            setStops={setStops}
            onCampSelect={onCampSelect}
            iconRace={(race && race !== "any" ? (race as IconRace) : undefined)}
            fieldError={(k) => errors[k]}
          />
        </section>

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
