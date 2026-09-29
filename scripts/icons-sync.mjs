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
/** w3gjs (the overlay's replay parser) names every unit, building, item,
 *  upgrade and hero ability; its words join the segmenter's. */
const w3gjs = await import(`../${store}${readdirSync(store).find((d) => d.startsWith("w3gjs@"))}/node_modules/w3gjs/dist/esm/mappings.js`);

const REPO = "w3champions/launcher";
const BRANCH = "master";
const DIR = "src/assets/images/hotkeys/icons/classic";
const OUT_DIR = "public/wc3-icons";
const GENERATED = "src/lib/builds/icons-generated.ts";
const SIZE = 64;

const dry = process.argv.includes("--dry");

/** Words the file names are built from, so "stormbolt" segments into
 *  "Storm Bolt" and "manaflare" into "Mana Flare". The game's own names add
 *  theirs: w3gjs's below, the launcher's hotkey names in loadWords(). */
const WORDS = `of the and abomination acid acolyte adept advanced air alleria altar ancient animal anti arcane archer archmage armor arrow attack aura avatar aviary axe backpack ballista bane banish banshee barracks barrage barrow bash basic bat battle bear beast beastmaster berserk berserker big black blacksmith blade blademaster blight blizzard blood bloodlust boat bolt bomb bone book boots bow brew brewmaster brilliance build building burrow cage cairne cannon canopy carapace carrion catapult cauldron cavalry cave chain chaos charm chief chieftain chimaera circlet claws cleave cloak cloud coil cold command control corpse corrosive creature crypt crystal cyclone dagger damage dark death defend demolish demon destroyer detonate devotion dispel divine doom dragon dragonhawk dreadlord drum dryad dust earth earthquake elder elemental elune ember enchanted energy engine ensnare entangled entangle envenomed evasion exhume eye faerie far farm feral fiend fire firelord flak flame flare fly flying foot footman forge fountain frenzy frost frostwyrm furbolg gargoyle gate gem ghoul giant gnoll goblin gold golem grain great greater grom gryphon guard guardian gyrocopter hall hammer harpy harvest head healing health hero hex hides hippogryph hit hold holy honor hood hoof horn hunter huntress hydra ice illusion immolation impale infernal inner invisibility invulnerable iron item keeper keep kings knight kodo lab laboratory lesser level lich life light lightning lion locust long lumber magic mana mark mask mass master mastery maul mech medium mill mine mirror missile moon mortar mountain mount murloc naga necromancer nether night obsidian ogre orb order pack paladin panda pandaren peasant peon phase pierce pillage pit plague plating poison polymorph portal potion power priest protector pulverize purge quill quilbeast raider rain raise ranger ravenform reforged regeneration reincarnation reinforced rejuvenation repair research resistant restoration resurrection ring rifle rifleman roar robe rock rod roost rune sacrifice sanctum scout scroll sea searing seer sentinel sentry sentinels serpent shade shadow shaman shield ship shockwave shop siege silence skeleton slam slaughterhouse sleep slow snap sorceress soul sphinx spider spike spiked spirit spy staff stampede starfall statue stone storm strength strike stronghold summon sundering swarm sword tank tauren temple tent thorns thunder tiny tinker tomb tome torrent tower town training trap treant tree trueshot tundra ultravision undead unholy vampiric vault vision voodoo wagon walker wand war ward warden warlock warrior watch water wave wagon web werewolf whirlwind wind wisp witch wolf wood workshop wyrm wyvern ziggurat knives entangling roots howl terror devour taunt rally scatter resistant skin hardened speed reveal cannibalize unsummon transmute disenchant deep lord revenant forest corrupted drunken dodge generic spell immunity freezing breath intervention trapper shadowpriest sludge flinger revenant`
  .split(/\s+/);
const KNOWN = new Set([...WORDS, "off", "on"]);
/** The words the fallback split may use: short words only from this list,
 *  since a stray "all" or "man" cuts names like "thrall" and "mannoroth". */
const TRUSTED = new Set([...WORDS, "off", "elf", "orc", "red", "fel", "up", "one", "two"]);
const addWords = (name) => {
  for (const w of name.toLowerCase().replace(/'/g, "").split(/[^a-z]+/)) if (w.length >= 3) KNOWN.add(w);
};
for (const table of ["items", "units", "buildings", "upgrades", "heroAbilities"]) {
  // "u_Footman", "a_Archmage:Blizzard": drop the kind and the hero.
  for (const name of Object.values(w3gjs[table])) addWords(name.replace(/^\w_/, "").replace(/^[^:]*:/, ""));
}
const HOTKEYS = "src/hot-keys/RaceSpecificHotkeys/hotkeyData";

/** Adds the words of the launcher's hotkey names ("Animate Dead",
 *  "Spirit of Vengeance"), the in-game names the icons are drawn for. */
async function loadWords(tree) {
  const paths = tree.filter((t) => t.path.startsWith(`${HOTKEYS}/`) && t.path.endsWith(".ts")).map((t) => t.path);
  for (const path of paths) {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`);
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    const src = await res.text();
    for (const [, name] of src.matchAll(/\(\s*['"]([^'"]+)['"]\s*,\s*['"](?:pas|dis)?(?:btn|atc)/gi)) {
      addWords(name);
    }
  }
  return paths.length;
}

/** Names the segmenter cannot reach, and names players say differently. */
const TITLES = {
  btnabsorbmagic: "Absorb Magic",
  btnaiff: "Ability",
  btnalleriaflute: "Alleria's Flute of Accuracy",
  btnankh: "Ankh of Reincarnation",
  btnarmoredogre: "Armored Ogre",
  btnbansheemaster: "Banshee Adept Training",
  btnberserkfortrolls: "Berserker Strength",
  btncalltoarms: "Call to Arms",
  btncriticalstrike: "Critical Strike",
  btncryptfiendunburrow: "Crypt Fiend Unburrow",
  btndoom: "Doom",
  btndranaimage: "Dranai Mage",
  btnevasion: "Evasion",
  btnfanofknives: "Fan of Knives",
  btnfeedback: "Feedback",
  btnflamestrike: "Flame Strike",
  btnfrostarmor: "Frost Armor",
  btnfrostnova: "Frost Nova",
  btnhealingward: "Healing Ward",
  btnhealingwave: "Healing Wave",
  btnhelmutpurple: "Crown of Kings",
  btnhumanartilleryupone: "Human Artillery Up One",
  btnholybolt: "Holy Light",
  btninnerfire: "Inner Fire",
  btnmagicalsentry: "Magical Sentry",
  btnmanaburn: "Mana Burn",
  btnmanaflareon: "Mana Flare",
  btnmanashieldon: "Mana Shield",
  btnmarketplace: "Marketplace",
  btnmirrorimage: "Mirror Image",
  btnreplenishhealth: "Replenish Life",
  btnreplenishmana: "Replenish Mana",
  btnscout: "Sentinel",
  btnseargingarrow: "Searing Arrows",
  btnstormbolt: "Storm Bolt",
  btnstrengthofthemoon: "Strength of the Moon",
  btnstrengthofthewild: "Strength of the Wild",
  btntelescope: "Telescope",
  btnthunderclap: "Thunder Clap",
  btnthunderlizard: "Thunder Lizard",
  btnthunderlizardsalamander: "Thunder Lizard Salamander",
  btnthunderlizardvizier: "Thunder Lizard Vizier",
  btntrueshot: "Trueshot Aura",
  btnwindwalkoff: "Wind Walk",
  btnwindwalkon: "Wind Walk",
  pasbtnmagicalsentry: "Magical Sentry",
};

/** Icons left out: campaign heroes, Naga, Chaos orcs and demons, campaign
 *  buildings and items, tower defence towers, and art a curated icon already
 *  draws. The site builds multiplayer orders only. Keys as describe() writes them. */
const DROP = new Set(
  `
  advanceddeathtower advancedenergytower advancedflametower advancedfrosttower advancedrocktower advstruct
  airattackoff akama altarofdepths ambushday archimonde arthas avengingassassin ballista basicstruct bearden
  blackmarket bloodelfpeasant bloodmage2 bluedemoness catapult chaosblademaster chaosgrom chaosgrunt
  chaoskodobeast chaospeon chaoswarlock chaoswarlockgreen chaoswarlord chaoswolfrider coldtower coralbed
  corpseexplode corruptedancientofwar corruptedancientprotector corruptedmoonwell corruptedtreeoflife
  dalaranguardtower dalaranmutant dalaranreject deathtower demolish demoness denofwonders dizzy dragonroost
  drain dranaiakama dranaichiefhut dranaihut elfvillager elvenfarm elvenguardtower
  energytower eredarred eredarwarlockpurple evilillidan felboar felguard felguardblue flametower flamingarrows
  frosttower furion garithos guldan guldanskull heartofaszune heartofsearinox hellscream herobloodelfprince
  herolich highelvenarcher holywater hornofcenarius hydralisk impalingbolt infernalcannon infernalflamecannon
  jaina juggernaut kelthuzad lichversion2 loaddwarf magetower mannoroth manual2 meatapult medivh nagaarmorup1
  nagaarmorup2 nagaarmorup3 nagaburrow nagamyrmidon nagamyrmidonroyalguard nagasummoner nagaunburrow
  nagaweaponup1 nagaweaponup2 nagaweaponup3 nerubianziggurat nightelfrunner oneheadedogre orcwarlock
  orcwarlockred parasite parasiteoff pigfarm proudmoore riderlesshorse riderlesskodo rocktower shandris
  shrineofaszhara sirenadept sirenmaster snapdragon spawninggrounds spellbreakermagicdefend
  spellbreakermagicundefend staffofpurification steamtank sylvanuswindrunner templeoftides thecaptain thrall
  tichondrius tidalguardian undeadairbarge unloaddwarf warden2 windserpent zergling
  `.trim().split(/\s+/),
);

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

/** Splits a file name into words: into known words only when it can (the
 *  fewest words wins), else with trusted words, known words of 4+ letters
 *  and unknown runs, the split with the fewest unknown letters winning, a
 *  run costing 3 more and a stray letter or two 9 more. So "avataroff" reads "Avatar Off", not
 *  "Avatar of F", and "furion" is not "Furi On". A number is its own word. */
function segment(base) {
  const split = (known, runCost) => {
    // best[i] = [cost, words, start of the last word] for base.slice(0, i).
    const best = [[0, 0, 0]];
    for (let i = 1; i <= base.length; i++) {
      for (let j = 0; j < i; j++) {
        if (!best[j]) continue;
        const n = i - j;
        const cost = known(base.slice(j, i)) || /^\d+$/.test(base.slice(j, i)) ? 0 : runCost(n);
        const c = [best[j][0] + cost, best[j][1] + 1, j];
        if (!best[i] || c[0] < best[i][0] || (c[0] === best[i][0] && c[1] < best[i][1])) best[i] = c;
      }
    }
    const words = [];
    for (let i = base.length; i > 0; i = best[i][2]) words.unshift(base.slice(best[i][2], i));
    return [best[base.length][0], words];
  };
  let [cost, words] = split((w) => KNOWN.has(w), () => Infinity);
  if (cost === Infinity) {
    [, words] = split((w) => TRUSTED.has(w) || (KNOWN.has(w) && w.length >= 4), (n) => n + 3 + (n < 3 ? 9 : 0));
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

async function sourceTree() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, {
    headers: { "user-agent": "wc3gym-icons" },
  });
  if (!res.ok) throw new Error(`GitHub tree: ${res.status}`);
  return (await res.json()).tree;
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
  // Only the curated art (hu-, or-, ...) is taken; a generated icon from an
  // earlier run is written again, with its title from this run.
  const existing = (await readdir(OUT_DIR)).filter((f) => /^(hu|or|ne|ud|nt)-.*\.webp$/.test(f));
  const taken = await curatedNames();
  for (const file of existing) taken.add(plain(file.replace(/\.webp$/, "").replace(/^(hu|or|ne|ud|nt)-/, "")));
  console.log(`have ${existing.length} icons, ${taken.size} names already covered`);

  const tree = await sourceTree();
  const files = tree.filter((t) => t.path.startsWith(`${DIR}/`)).map((t) => t.path.split("/").pop());
  console.log(`source has ${files.length} classic icons, words from ${await loadWords(tree)} hotkey files`);

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
    if (DROP.has(icon.key)) continue;
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
