/**
 * F001 (site-owns-replay-parser): a site-local, structurally identical copy
 * of `EditorFormInput`/`EditorStepInput` from the overlay app's private-
 * build editor schema module (`buildEditorSchema.ts`, lines 28-54 there) —
 * the shape `extractBuild.ts` returns its draft as. The site does not
 * import that module (it drags in zod, the overlay's builds API schema and
 * a React hook); only the shape is needed here, so it is copied field-for-
 * field instead. Keep these two definitions in step if either changes.
 */

export type EditorStepInput = {
  time: string;
  supply: string;
  instruction: string;
  icon: string;
  /** A replay-import-only provenance caption ("5 ordered · 1 cancelled" /
   *  "2 dropped (likely rejected)") set by `extractBuild`. Optional so the
   *  type still accepts hand-authored steps without it. */
  importNote?: string;
};

export type EditorFormInput = {
  title: string;
  race: string;
  vsRaces: string[];
  difficulty: string;
  patch: string;
  tags: string;
  summary: string;
  author: string;
  authorDiscord: string;
  sourceUrl: string;
  description: string;
  steps: EditorStepInput[];
};
