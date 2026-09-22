import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "./site";

/**
 * The share card every page-specific `opengraph-image` route draws: black
 * ground, the gold rule, the wordmark, one big name and a row of figures,
 * so a link to a player, a team or a build looks like the site it comes
 * from. Satori supports flexbox only, and no oklch, so the tokens of
 * `globals.css` are written here as hex. See DESIGN.md for what the
 * figures may say.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const GOLD = "#E7B643";
const FG = "#F2ECE1";
const MUTED = "#A9A093";
const FAINT = "#6F675C";

/** Race marks, the same values the site uses on the black ground. */
export const OG_RACE_COLOUR: Record<string, string> = {
  human: "#02809C",
  orc: "#BA4C4B",
  nightelf: "#44AB46",
  undead: "#9B6FE4",
  random: "#9C9AA5",
};

/** Cinzel is the display face of the site. Read once per server instance;
 *  satori takes ttf, otf and woff, never woff2. */
let fontPromise: Promise<ArrayBuffer> | undefined;
function displayFont(): Promise<ArrayBuffer> {
  fontPromise ??= readFile(join(process.cwd(), "assets/cinzel-700.woff")).then(
    (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
  );
  return fontPromise;
}

export async function ogFonts() {
  return [{ name: "Cinzel", data: await displayFont(), weight: 700 as const, style: "normal" as const }];
}

/** Title size steps down with its length, the way the page mastheads do. */
function titleSize(title: string): number {
  if (title.length > 38) return 56;
  if (title.length > 26) return 72;
  if (title.length > 16) return 88;
  return 104;
}

export type OgFact = { label: string; value: string; tone?: "gold" | "plain" };

export function OgCard({
  kicker,
  title,
  subtitle,
  facts = [],
  accent,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  facts?: OgFact[];
  /** A race colour for the rule beside the name; gold when there is none. */
  accent?: string;
}) {
  const rule = accent ?? GOLD;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#000000",
        backgroundImage: `radial-gradient(900px 520px at 88% -10%, rgba(231,182,67,0.18), transparent 60%), radial-gradient(700px 500px at 0% 110%, ${hexToRgba(rule, 0.16)}, transparent 62%)`,
        padding: "56px 72px",
        fontFamily: "Cinzel",
        color: FG,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: GOLD, textTransform: "uppercase" }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, color: MUTED, textTransform: "uppercase" }}>
          {kicker}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", width: 10, alignSelf: "stretch", backgroundColor: rule, marginRight: 36 }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: titleSize(title), lineHeight: 1.05, textTransform: "uppercase" }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", marginTop: 20, fontSize: 30, color: MUTED, letterSpacing: 2 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          {facts.map((f) => (
            <div key={f.label} style={{ display: "flex", flexDirection: "column", marginRight: 56 }}>
              <div style={{ display: "flex", fontSize: 18, letterSpacing: 4, color: FAINT, textTransform: "uppercase" }}>
                {f.label}
              </div>
              <div style={{ display: "flex", marginTop: 10, fontSize: 40, color: f.tone === "gold" ? GOLD : FG }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: FAINT, textTransform: "uppercase" }}>
          warcraft3.gym
        </div>
      </div>
    </div>
  );
}

/** Satori has no colour functions, so a tint is mixed here. */
function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const n = parseInt(v.length === 3 ? v.replace(/./g, (c) => c + c) : v, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
