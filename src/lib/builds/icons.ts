/**
 * WC3 icon manifest. Shared by the Sanity step editor (option list) and the
 * site (rendering). Images live in public/wc3-icons/<key>.webp — the game's
 * command-button art, sourced from the W3Champions community site
 * (github.com/w3champions/website, originalWC3Icons) and resized to 64px.
 * The UI falls back to a text chip if an image is ever missing.
 */

export type IconRace = "human" | "orc" | "nightelf" | "undead" | "neutral";
export type IconKind = "hero" | "unit" | "building" | "upgrade" | "misc";

export type GameIcon = {
  key: string;
  title: string;
  race: IconRace;
  kind: IconKind;
};

const H = (key: string, title: string, kind: IconKind): GameIcon => ({ key, title, race: "human", kind });
const O = (key: string, title: string, kind: IconKind): GameIcon => ({ key, title, race: "orc", kind });
const N = (key: string, title: string, kind: IconKind): GameIcon => ({ key, title, race: "nightelf", kind });
const U = (key: string, title: string, kind: IconKind): GameIcon => ({ key, title, race: "undead", kind });
const X = (key: string, title: string, kind: IconKind): GameIcon => ({ key, title, race: "neutral", kind });

export const GAME_ICONS: GameIcon[] = [
  // --- Human ---
  H("hu-peasant", "Peasant", "unit"),
  H("hu-footman", "Footman", "unit"),
  H("hu-rifleman", "Rifleman", "unit"),
  H("hu-knight", "Knight", "unit"),
  H("hu-priest", "Priest", "unit"),
  H("hu-sorceress", "Sorceress", "unit"),
  H("hu-spellbreaker", "Spell Breaker", "unit"),
  H("hu-mortar", "Mortar Team", "unit"),
  H("hu-flying-machine", "Flying Machine", "unit"),
  H("hu-gryphon", "Gryphon Rider", "unit"),
  H("hu-siege-engine", "Siege Engine", "unit"),
  H("hu-dragonhawk", "Dragonhawk Rider", "unit"),
  H("hu-militia", "Militia", "unit"),
  H("hu-archmage", "Archmage", "hero"),
  H("hu-paladin", "Paladin", "hero"),
  H("hu-mountain-king", "Mountain King", "hero"),
  H("hu-blood-mage", "Blood Mage", "hero"),
  H("hu-town-hall", "Town Hall", "building"),
  H("hu-keep", "Keep", "building"),
  H("hu-castle", "Castle", "building"),
  H("hu-farm", "Farm", "building"),
  H("hu-altar", "Altar of Kings", "building"),
  H("hu-barracks", "Barracks", "building"),
  H("hu-lumber-mill", "Lumber Mill", "building"),
  H("hu-blacksmith", "Blacksmith", "building"),
  H("hu-arcane-sanctum", "Arcane Sanctum", "building"),
  H("hu-workshop", "Workshop", "building"),
  H("hu-aviary", "Gryphon Aviary", "building"),
  H("hu-arcane-vault", "Arcane Vault", "building"),
  H("hu-scout-tower", "Scout Tower", "building"),
  H("hu-guard-tower", "Guard Tower", "building"),
  H("hu-arcane-tower", "Arcane Tower", "building"),

  // --- Orc ---
  O("or-peon", "Peon", "unit"),
  O("or-grunt", "Grunt", "unit"),
  O("or-headhunter", "Troll Headhunter", "unit"),
  O("or-berserker", "Troll Berserker", "unit"),
  O("or-demolisher", "Demolisher", "unit"),
  O("or-shaman", "Shaman", "unit"),
  O("or-witch-doctor", "Witch Doctor", "unit"),
  O("or-spirit-walker", "Spirit Walker", "unit"),
  O("or-raider", "Raider", "unit"),
  O("or-kodo", "Kodo Beast", "unit"),
  O("or-wind-rider", "Wind Rider", "unit"),
  O("or-tauren", "Tauren", "unit"),
  O("or-batrider", "Troll Batrider", "unit"),
  O("or-blademaster", "Blademaster", "hero"),
  O("or-far-seer", "Far Seer", "hero"),
  O("or-tauren-chieftain", "Tauren Chieftain", "hero"),
  O("or-shadow-hunter", "Shadow Hunter", "hero"),
  O("or-great-hall", "Great Hall", "building"),
  O("or-stronghold", "Stronghold", "building"),
  O("or-fortress", "Fortress", "building"),
  O("or-burrow", "Orc Burrow", "building"),
  O("or-altar", "Altar of Storms", "building"),
  O("or-barracks", "Barracks", "building"),
  O("or-war-mill", "War Mill", "building"),
  O("or-spirit-lodge", "Spirit Lodge", "building"),
  O("or-beastiary", "Beastiary", "building"),
  O("or-tauren-totem", "Tauren Totem", "building"),
  O("or-voodoo-lounge", "Voodoo Lounge", "building"),
  O("or-watch-tower", "Watch Tower", "building"),

  // --- Night Elf ---
  N("ne-wisp", "Wisp", "unit"),
  N("ne-archer", "Archer", "unit"),
  N("ne-huntress", "Huntress", "unit"),
  N("ne-glaive-thrower", "Glaive Thrower", "unit"),
  N("ne-dryad", "Dryad", "unit"),
  N("ne-druid-of-the-claw", "Druid of the Claw", "unit"),
  N("ne-mountain-giant", "Mountain Giant", "unit"),
  N("ne-hippogryph", "Hippogryph", "unit"),
  N("ne-druid-of-the-talon", "Druid of the Talon", "unit"),
  N("ne-faerie-dragon", "Faerie Dragon", "unit"),
  N("ne-chimaera", "Chimaera", "unit"),
  N("ne-demon-hunter", "Demon Hunter", "hero"),
  N("ne-keeper-of-the-grove", "Keeper of the Grove", "hero"),
  N("ne-priestess-of-the-moon", "Priestess of the Moon", "hero"),
  N("ne-warden", "Warden", "hero"),
  N("ne-tree-of-life", "Tree of Life", "building"),
  N("ne-tree-of-ages", "Tree of Ages", "building"),
  N("ne-tree-of-eternity", "Tree of Eternity", "building"),
  N("ne-moon-well", "Moon Well", "building"),
  N("ne-altar", "Altar of Elders", "building"),
  N("ne-ancient-of-war", "Ancient of War", "building"),
  N("ne-hunters-hall", "Hunter's Hall", "building"),
  N("ne-ancient-of-lore", "Ancient of Lore", "building"),
  N("ne-ancient-of-wind", "Ancient of Wind", "building"),
  N("ne-chimaera-roost", "Chimaera Roost", "building"),
  N("ne-ancient-of-wonders", "Ancient of Wonders", "building"),
  N("ne-ancient-protector", "Ancient Protector", "building"),
  N("ne-entangled-mine", "Entangled Gold Mine", "building"),

  // --- Undead ---
  U("ud-acolyte", "Acolyte", "unit"),
  U("ud-ghoul", "Ghoul", "unit"),
  U("ud-crypt-fiend", "Crypt Fiend", "unit"),
  U("ud-gargoyle", "Gargoyle", "unit"),
  U("ud-abomination", "Abomination", "unit"),
  U("ud-meat-wagon", "Meat Wagon", "unit"),
  U("ud-obsidian-statue", "Obsidian Statue", "unit"),
  U("ud-destroyer", "Destroyer", "unit"),
  U("ud-necromancer", "Necromancer", "unit"),
  U("ud-banshee", "Banshee", "unit"),
  U("ud-frost-wyrm", "Frost Wyrm", "unit"),
  U("ud-shade", "Shade", "unit"),
  U("ud-death-knight", "Death Knight", "hero"),
  U("ud-lich", "Lich", "hero"),
  U("ud-dreadlord", "Dreadlord", "hero"),
  U("ud-crypt-lord", "Crypt Lord", "hero"),
  U("ud-necropolis", "Necropolis", "building"),
  U("ud-halls-of-the-dead", "Halls of the Dead", "building"),
  U("ud-black-citadel", "Black Citadel", "building"),
  U("ud-ziggurat", "Ziggurat", "building"),
  U("ud-altar", "Altar of Darkness", "building"),
  U("ud-crypt", "Crypt", "building"),
  U("ud-graveyard", "Graveyard", "building"),
  U("ud-slaughterhouse", "Slaughterhouse", "building"),
  U("ud-temple-of-the-damned", "Temple of the Damned", "building"),
  U("ud-boneyard", "Boneyard", "building"),
  U("ud-sacrificial-pit", "Sacrificial Pit", "building"),
  U("ud-tomb-of-relics", "Tomb of Relics", "building"),
  U("ud-nerubian-tower", "Nerubian Tower", "building"),
  U("ud-spirit-tower", "Spirit Tower", "building"),
  U("ud-haunted-mine", "Haunted Gold Mine", "building"),

  // --- Neutral ---
  X("nt-naga-sea-witch", "Naga Sea Witch", "hero"),
  X("nt-dark-ranger", "Dark Ranger", "hero"),
  X("nt-pandaren-brewmaster", "Pandaren Brewmaster", "hero"),
  X("nt-beastmaster", "Beastmaster", "hero"),
  X("nt-pit-lord", "Pit Lord", "hero"),
  X("nt-goblin-tinker", "Goblin Tinker", "hero"),
  X("nt-firelord", "Firelord", "hero"),
  X("nt-goblin-alchemist", "Goblin Alchemist", "hero"),
  X("nt-tavern", "Tavern", "building"),
  X("nt-goblin-merchant", "Goblin Merchant", "building"),
  X("nt-mercenary-camp", "Mercenary Camp", "building"),
  X("nt-goblin-lab", "Goblin Laboratory", "building"),
  X("nt-gold-mine", "Gold Mine", "building"),
  X("nt-creep", "Creep camp", "misc"),
  X("nt-expansion", "Expansion", "misc"),
  X("nt-gold", "Gold", "misc"),
  X("nt-lumber", "Lumber", "misc"),
  X("nt-scroll-of-town-portal", "Scroll of Town Portal", "misc"),
  X("nt-upgrade", "Upgrade", "upgrade"),
  X("nt-attack", "Attack / push", "misc"),
  X("nt-scout", "Scout", "misc"),
];

const BY_KEY = new Map(GAME_ICONS.map((i) => [i.key, i]));

export function getGameIcon(key?: string | null): GameIcon | undefined {
  return key ? BY_KEY.get(key) : undefined;
}

export function gameIconSrc(key: string): string {
  return `/wc3-icons/${key}.webp`;
}

/** Studio option list, grouped so the dropdown reads naturally. */
export const GAME_ICON_OPTIONS = GAME_ICONS.map((i) => ({
  title: `${{ human: "HU", orc: "OR", nightelf: "NE", undead: "UD", neutral: "—" }[i.race]} · ${i.title}`,
  value: i.key,
}));
