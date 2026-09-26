/**
 * Syncs the classic (pre-Reforged) Warcraft III command-button art into
 * public/wc3-icons and writes the generated half of the icon manifest.
 *
 * Source: the W3Champions launcher, hotkeys/icons/classic, the same set the
 * curated icons in src/lib/builds/icons.ts came from, so the art matches.
 *
 * The curated entries stay hand written: they carry the names players use
 * and the race and kind the picker groups by. Everything else the game has,
 * abilities above all, is written to icons-generated.ts, titled from the
 * tables below and from the file name when no table knows it.
 *
 * Run: node scripts/icons-sync.mjs [--dry]
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readdirSync } from "node:fs";

/** sharp ships inside next, so it is resolved from the store rather than
 *  added as a dependency of its own. */
const store = "node_modules/.pnpm/";
const sharp = (await import(`../${store}${readdirSync(store).find((d) => d.startsWith("sharp@"))}/node_modules/sharp/dist/index.mjs`)).default;

const REPO = "w3champions/launcher";
const BRANCH = "master";
const DIR = "src/assets/images/hotkeys/icons/classic";
const OUT_DIR = "public/wc3-icons";
const GENERATED = "src/lib/builds/icons-generated.ts";
const SIZE = 64;

const dry = process.argv.includes("--dry");

/** Words the file names are built from, longest first, so "stormbolt"
 *  segments into "Storm Bolt" and "manaflare" into "Mana Flare". */
const WORDS = `of the and abomination acid acolyte adept advanced air alleria altar ancient animal anti arcane archer archmage armor arrow attack aura avatar aviary axe backpack ballista bane banish banshee barracks barrage barrow bash basic bat battle bear beast beastmaster berserk berserker big black blacksmith blade blademaster blight blizzard blood bloodlust boat bolt bomb bone book boots bow brew brewmaster brilliance build building burrow cage cairne cannon canopy carapace carrion catapult cauldron cavalry cave chain chaos charm chief chieftain chimaera circlet claws cleave cloak cloud coil cold command control corpse corrosive creature crypt crystal cyclone dagger damage dark death defend demolish demon destroyer detonate devotion dispel divine doom dragon dragonhawk dreadlord drum dryad dust earth earthquake elder elemental elune ember enchanted energy engine ensnare entangled entangle envenomed evasion exhume eye faerie far farm feral fiend fire firelord flak flame flare fly flying foot footman forge fountain frenzy frost frostwyrm furbolg gargoyle gate gem ghoul giant gnoll goblin gold golem grain great greater grom gryphon guard guardian gyrocopter hall hammer harpy harvest head healing health hero hex hides hippogryph hit hold holy honor hood hoof horn hunter huntress hydra ice illusion immolation impale infernal inner invisibility invulnerable iron item keeper keep kings knight kodo lab laboratory lesser level lich life light lightning lion locust long lumber magic mana mark mask mass master mastery maul mech medium mill mine mirror missile moon mortar mountain mount murloc naga necromancer nether night obsidian ogre orb order pack paladin panda pandaren peasant peon phase pierce pillage pit plague plating poison polymorph portal potion power priest protector pulverize purge quill quilbeast raider rain raise ranger ravenform reforged regeneration reincarnation reinforced rejuvenation repair research resistant restoration resurrection ring rifle rifleman roar robe rock rod roost rune sacrifice sanctum scout scroll sea searing seer sentinel sentry sentinels serpent shade shadow shaman shield ship shockwave shop siege silence skeleton slam slaughterhouse sleep slow snap sorceress soul sphinx spider spike spiked spirit spy staff stampede starfall statue stone storm strength strike stronghold summon sundering swarm sword tank tauren temple tent thorns thunder tiny tinker tomb tome torrent tower town training trap treant tree trueshot tundra ultravision undead unholy vampiric vault vision voodoo wagon walker wand war ward warden warlock warrior watch water wave wagon web werewolf whirlwind wind wisp witch wolf wood workshop wyrm wyvern ziggurat knives entangling roots howl terror devour taunt rally scatter resistant skin hardened speed reveal cannibalize unsummon transmute disenchant deep lord revenant forest corrupted drunken dodge generic spell immunity freezing breath intervention trapper shadowpriest sludge flinger revenant`
  .split(/\s+/)
  // Two letter words like "of" only ever match at the start of a run, so the
  // search for the next known word below never cuts a name mid-syllable.
  .filter((w) => w.length >= 2)
  .sort((a, b) => b.length - a.length);

const LONG_WORDS = WORDS.filter((w) => w.length >= 4);

/** Names the segmenter cannot reach, and names players say differently. */
const TITLES = {
  btnabsorbmagic: "Absorb Magic",
  btnadvstruct: "Advanced Structure",
  btnaiff: "Ability",
  btnalleriaflute: "Alleria's Flute of Accuracy",
  btnankh: "Ankh of Reincarnation",
  btnbansheemaster: "Banshee Adept Training",
  btnberserkfortrolls: "Berserker Strength",
  btncriticalstrike: "Critical Strike",
  btndoom: "Doom",
  btnevasion: "Evasion",
  btnfanofknives: "Fan of Knives",
  btnfeedback: "Feedback",
  btnflamestrike: "Flame Strike",
  btnfrostarmor: "Frost Armor",
  btnfrostnova: "Frost Nova",
  btnhealingward: "Healing Ward",
  btnhealingwave: "Healing Wave",
  btnholybolt: "Holy Light",
  btninnerfire: "Inner Fire",
  btnmanaburn: "Mana Burn",
  btnmanaflareon: "Mana Flare",
  btnmanashieldon: "Mana Shield",
  btnmirrorimage: "Mirror Image",
  btnreplenishhealth: "Replenish Life",
  btnreplenishmana: "Replenish Mana",
  btnscout: "Sentinel",
  btnseargingarrow: "Searing Arrows",
  btnstormbolt: "Storm Bolt",
  btnstrengthofthemoon: "Strength of the Moon",
  btnstrengthofthewild: "Strength of the Wild",
  btnthunderclap: "Thunder Clap",
  btntrueshot: "Trueshot Aura",
  btnwindwalkoff: "Wind Walk",
  btnwindwalkon: "Wind Walk",
};

/** Race by the words in the name; first match wins, else neutral. */
const RACE_WORDS = [
  ["human", "peasant footman rifleman knight priest sorceress spellbreaker mortar gryphon militia archmage paladin mountainking bloodmage townhall keep castle farm altarofkings barracks lumbermill blacksmith arcanesanctum workshop aviary arcanevault scouttower guardtower arcanetower cannontower flyingmachine siegeengine dragonhawk holy divine defend flare masonry plating gunpowder swords longrifles stormhammer flakcannon controlmagic magicsentry animalwar priesttraining sorceresstraining blizzard waterelemental brilliance massteleport holybolt divineshield devotion resurrection stormbolt thunderclap avatar flamestrike banish siphon phoenix innerfire slow dispelmagic invisibility polymorph controlmagic spellsteal feedback"],
  ["orc", "peon grunt raider catapult shaman witchdoctor headhunter troll kodo tauren spiritwalker batrider wyvern demolisher blademaster farseer taurenchieftain shadowhunter greathall stronghold fortress burrow altarofstorms warmill spiritlodge beastiary tauren watchtower voodoo pillage berserk ensnare bloodlust purge hex serpentward healingward stasistrap criticalstrike windwalk mirrorimage bladestorm chainlightning farsight spiritwolf earthquake warstomp endurance reincarnation shockwave healingwave voodoo devour warstomp liquidfire"],
  ["nightelf", "wisp archer huntress dryad druid talon claw hippogryph chimaera glaive mountaingiant faerie treeoflife treeofages treeofeternity altarofelders ancientofwar ancientoflore ancientofwind ancientofwonders moonwell huntershall entangled moon elune keeper priestess warden demonhunter sentinel ultravision markofthe scout trueshot strengthofthewild strengthofthemoon reinforcedhides moonarmor manaburn immolation evasion metamorphosis entanglingroots forceofnature thorns tranquility searingarrow starfall fanofknives blink shadowstrike vengeance rejuvenation roar abolishmagic faeriefire cyclone"],
  ["undead", "acolyte ghoul abomination crypt fiend gargoyle necromancer bansheeskeleton obsidian statue frostwyrm shade meatwagon destroyer deathknight lich dreadlord cryptlord necropolis ziggurat graveyard slaughterhouse boneyard tombofrelics sacrificialpit templeofthedamned haunted blight unholy cannibalize raisedead web skeletal disease plague carrionswarm deathcoil deathpact animatedead frostnova frostarmor darkritual deathanddecay sleep vampiric inferno impale spikedcarapace carrionbeetle locustswarm cripple curse antimagic possession unholyfrenzy"],
];

/** The kind a picker groups by, from the words in the name. */
const KIND_WORDS = [
  ["upgrade", "upgrade armor plating swords attack claws hides carapace strength masonry training mastery research adept master advanced improved"],
  ["building", "hall tower keep castle farm altar barracks mill blacksmith sanctum workshop aviary vault burrow lodge beastiary moonwell necropolis ziggurat graveyard slaughterhouse boneyard crypt temple pit shop laboratory tent fountain"],
  ["ability", "bolt blast wave nova aura strike slam clap coil frenzy shield ward summon heal healing charm banish polymorph hex purge ensnare cyclone roar rejuvenation entangle immolation evasion bash avatar doom sleep sacrifice impale spike stampede starfall silence blizzard breath spirit burn walk image storm teleport ritual decay pact swarm beetle locust cannibalize possession curse cripple blink vengeance tranquility thorns metamorphosis stomp lightning sight quake voodoo devour critical feedback steal dispel invisibility slow taunt pulverize howl"],
];

const kebab = (s) => s.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const has = (name, words) => words.split(" ").some((w) => name.includes(w));

function segment(base) {
  const words = [];
  let rest = base;
  while (rest.length) {
    const word = WORDS.find((w) => rest.startsWith(w));
    if (!word) {
      // An unknown run of letters stays as one word.
      const next = LONG_WORDS.map((w) => rest.indexOf(w)).filter((i) => i > 0);
      const cut = next.length ? Math.min(...next) : rest.length;
      words.push(rest.slice(0, cut));
      rest = rest.slice(cut);
      continue;
    }
    words.push(word);
    rest = rest.slice(word.length);
  }
  const small = new Set(["of", "the", "and"]);
  return words
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function describe(file) {
  const base = file.replace(/\.(png|jpg|webp)$/i, "");
  const stem = base.replace(/^(pasbtn|disbtn|disatc|atc|btn)/, "");
  const title = TITLES[base] ?? segment(stem);
  const race = RACE_WORDS.find(([, words]) => has(stem, words))?.[0] ?? "neutral";
  const kind = KIND_WORDS.find(([, words]) => has(stem, words))?.[0] ?? "misc";
  return { key: kebab(stem), title, race, kind };
}

async function listSource() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, {
    headers: { "user-agent": "wc3gym-icons" },
  });
  if (!res.ok) throw new Error(`GitHub tree: ${res.status}`);
  const tree = (await res.json()).tree;
  return tree.filter((t) => t.path.startsWith(`${DIR}/`)).map((t) => t.path.split("/").pop());
}

/** A name with nothing but its letters, for comparing a generated icon to a
 *  curated one: "hu-spellbreaker" and "Spell Breaker" both read spellbreaker. */
const plain = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The curated manifest, read as text so this script needs no TypeScript. */
async function curatedNames() {
  const src = await readFile("src/lib/builds/icons.ts", "utf8");
  const names = new Set();
  for (const [, key, title] of src.matchAll(/[HONUX]\("([^"]+)",\s*"([^"]+)"/g)) {
    names.add(plain(key.replace(/^(hu|or|ne|ud|nt)-/, "")));
    names.add(plain(title));
  }
  return names;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const existing = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".webp"));
  const taken = await curatedNames();
  for (const file of existing) taken.add(plain(file.replace(/\.webp$/, "").replace(/^(hu|or|ne|ud|nt)-/, "")));
  console.log(`have ${existing.length} icons, ${taken.size} names already covered`);

  const files = await listSource();
  console.log(`source has ${files.length} classic icons`);

  const added = [];
  let duplicate = 0;
  for (const file of files) {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${DIR}/${file}`);
    if (!res.ok) {
      console.warn(`skip ${file}: ${res.status}`);
      continue;
    }
    const png = Buffer.from(await res.arrayBuffer());
    const icon = describe(file);
    // The curated entry wins: it carries the name players use and its race.
    if (taken.has(plain(icon.key)) || taken.has(plain(icon.title))) {
      duplicate++;
      continue;
    }
    taken.add(plain(icon.key));
    taken.add(plain(icon.title));
    added.push(icon);
    if (!dry) {
      const webp = await sharp(png).resize(SIZE, SIZE, { fit: "inside" }).webp({ quality: 88 }).toBuffer();
      await writeFile(join(OUT_DIR, `${icon.key}.webp`), webp);
    }
  }

  added.sort((a, b) => a.race.localeCompare(b.race) || a.title.localeCompare(b.title));
  const body = added
    .map((i) => `  { key: ${JSON.stringify(i.key)}, title: ${JSON.stringify(i.title)}, race: ${JSON.stringify(i.race)}, kind: ${JSON.stringify(i.kind)} },`)
    .join("\n");
  const file = `import type { GameIcon } from "./icons";

/**
 * Generated by scripts/icons-sync.mjs, do not edit by hand. The rest of the
 * classic command-button art, the abilities above all, so a step can carry
 * the icon of the thing it asks for. The curated names and groups live in
 * icons.ts; these are titled from the file name.
 */
export const GENERATED_ICONS: GameIcon[] = [
${body}
];
`;
  if (!dry) await writeFile(GENERATED, file);
  console.log(`added ${added.length}, skipped ${duplicate} the curated manifest already names`);
}

await main();
