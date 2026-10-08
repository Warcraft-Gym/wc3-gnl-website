import * as impl from "./night-board.mjs";

/** Typed façade over the pure plain-JS implementation, so `node --test` runs
 *  the tests with no loader while the component gets types. */

export type NightRow = {
  id: number;
  winner: string;
  loser: string;
  undecided: boolean;
  inferred: boolean;
  withdrew: boolean;
  forfeit: boolean;
  crown: string | null;
  note: string | null;
};
export type NightBracket = { id: number; label: string; king: string | null; rows: NightRow[] };

export const nightBrackets = impl.nightBrackets as (board: unknown) => NightBracket[];
