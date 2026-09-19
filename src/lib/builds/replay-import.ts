import "server-only";

import { parseReplay } from "@overlay-replay/parseReplay";
import { extractBuild } from "@overlay-replay/extractBuild";
import { fetchW3ChampionsReplay, parseMatchRef, W3ChampionsError } from "@overlay-replay/w3champions";
import { ReplayParseError, type ReplayRace } from "@overlay-replay/types";
import type { ExchangeBuild } from "./exchange";

/**
 * Turns a Warcraft III replay (an uploaded `.w3g`, or one fetched from a
 * W3Champions match link) into build-order drafts, one per player, in the
 * same shape the overlay's export uses so the submit form fills in the same
 * way. The parsing pipeline is the overlay app's, imported straight from
 * `apps/overlay/src/replay` (the `@overlay-replay/*` alias); it runs here
 * on the server, where `w3gjs` needs no browser shims.
 */

/** A replay of a long game is a few MB; anything bigger is not a melee game. */
export const MAX_REPLAY_BYTES = 8 * 1024 * 1024;
/** The submit form's limit; a long replay cutoff can produce more. */
const MAX_STEPS = 60;
const RACE_LABEL: Record<string, string> = { human: "Human", orc: "Orc", nightelf: "Night Elf", undead: "Undead", random: "Random" };

export type ReplayImportPlayer = {
  id: number;
  name: string;
  race: ReplayRace;
  /** Known when the replay came from W3Champions. */
  won?: boolean;
  build: ExchangeBuild;
  /** Orders the "likely rejected" filter removed (0 when the filter is off). */
  dropped: number;
};

/** Forwarded to `extractBuild`; see its docblock. Default (unset) is on. */
export type ReplayImportOptions = { dropLikelyRejected?: boolean };

export type ReplayImport = {
  map: string;
  version: string;
  /** m:ss */
  duration: string;
  /** Where the replay came from, for the draft's summary and source link. */
  source?: { label: string; url?: string };
  players: ReplayImportPlayer[];
};

export type ReplayImportResult = { ok: true; replay: ReplayImport } | { ok: false; error: string; status: number };

/** "Dretwiak#2963" → "Dretwiak". */
function withoutTag(name: string): string {
  return name.replace(/#\d+$/, "");
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The overlay's editor draft, mapped onto the exchange shape the form reads.
 *  The title loses the BattleTag number and the dash the overlay puts in. */
function toExchange(
  draft: ReturnType<typeof extractBuild>,
  playerName: string,
  game: { map: string; duration: string },
  sourceUrl?: string,
): ExchangeBuild {
  const vs = draft.vsRaces.map((r) => RACE_LABEL[r] ?? r).join(" and ") || "the field";
  return {
    title: draft.title.replace(playerName, withoutTag(playerName)).replace(/\s[—–-]\s/g, " on ").slice(0, 90),
    race: draft.race,
    vsRaces: draft.vsRaces,
    difficulty: draft.difficulty,
    patch: draft.patch,
    tags: draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    // The form asks for a real summary; this placeholder says what to write.
    summary: `${RACE_LABEL[draft.race] ?? draft.race} vs ${vs} from a ${game.duration} game on ${game.map}. Say what the idea is and when it works.`.slice(0, 200),
    author: withoutTag(playerName),
    authorDiscord: "",
    sourceUrl: sourceUrl ?? "",
    description: draft.description,
    steps: draft.steps.slice(0, MAX_STEPS).map((s) => ({
      time: s.time,
      supply: s.supply === "" ? undefined : Number(s.supply),
      instruction: s.instruction,
      icon: s.icon || undefined,
    })),
  };
}

async function fromBytes(
  bytes: Uint8Array,
  source?: { label: string; url?: string },
  wonBy?: Map<string, boolean>,
  opts?: ReplayImportOptions,
): Promise<ReplayImportResult> {
  try {
    const summary = await parseReplay(bytes);
    const game = { map: summary.map.name, duration: clock(summary.durationMs) };
    const players = summary.players.map<ReplayImportPlayer>((p) => {
      const draft = extractBuild(summary, p.id, { dropLikelyRejected: opts?.dropLikelyRejected });
      return {
        id: p.id,
        name: p.name,
        race: p.raceDetected !== "random" ? p.raceDetected : p.race,
        won: wonBy?.get(withoutTag(p.name).toLowerCase()),
        build: toExchange(draft, p.name, game, source?.url),
        dropped: draft.dropped.count,
      };
    });
    if (!players.length) return { ok: false, error: "No players were found in this replay.", status: 422 };
    return {
      ok: true,
      replay: { ...game, version: summary.version, source, players },
    };
  } catch (err) {
    if (err instanceof ReplayParseError) {
      const text =
        err.code === "not_a_replay"
          ? "That file is not a Warcraft III replay (.w3g)."
          : err.code === "unsupported_version"
            ? "Replays from before patch 1.32 cannot be read."
            : "This replay could not be read.";
      return { ok: false, error: text, status: 422 };
    }
    console.error("[replay-import] parse failed", err);
    return { ok: false, error: "This replay could not be read.", status: 500 };
  }
}

/** An uploaded `.w3g` file. */
export async function importReplayFile(file: File, opts?: ReplayImportOptions): Promise<ReplayImportResult> {
  if (file.size > MAX_REPLAY_BYTES) {
    return { ok: false, error: "That replay is too large (8 MB max).", status: 413 };
  }
  return fromBytes(new Uint8Array(await file.arrayBuffer()), { label: file.name }, undefined, opts);
}

/** A W3Champions match link or id; the replay is fetched from their API. */
export async function importW3ChampionsMatch(ref: string, opts?: ReplayImportOptions): Promise<ReplayImportResult> {
  const matchId = parseMatchRef(ref);
  if (!matchId) {
    return { ok: false, error: "Paste a W3Champions match link, like w3champions.com/match/<id>.", status: 400 };
  }
  try {
    const { bytes, match } = await fetchW3ChampionsReplay(matchId);
    const url = `https://w3champions.com/match/${matchId}`;
    const wonBy = new Map(match?.players.map((p) => [withoutTag(p.battleTag).toLowerCase(), p.won]) ?? []);
    return fromBytes(bytes, { label: `W3Champions match ${matchId}`, url }, wonBy, opts);
  } catch (err) {
    if (err instanceof W3ChampionsError) {
      const text =
        err.code === "not_found"
          ? "W3Champions has no replay for that match. Replays are only kept for a while after the game."
          : err.code === "unreachable"
            ? "W3Champions could not be reached. Try again in a moment."
            : "W3Champions did not return a replay for that match.";
      return { ok: false, error: text, status: 502 };
    }
    console.error("[replay-import] W3Champions fetch failed", err);
    return { ok: false, error: "W3Champions did not return a replay for that match.", status: 502 };
  }
}
