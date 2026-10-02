import { post } from "./post";
import { guide } from "./guide";
import { buildOrder } from "./buildOrder";
import { tool } from "./tool";
import { creepMap } from "./creepMap";
import { creepFork, creepRoute, creepStop } from "./creepRoute";
import { gnlRules } from "./gnlRules";
import { kothPage } from "./kothPage";
import { kothResult } from "./kothResult";

/** Document types; each needs a webhook path (`src/app/api/revalidate/route.ts`). */
export const schemaTypes = [post, guide, buildOrder, tool, creepMap, creepRoute, gnlRules, kothPage, kothResult];

/** Object types a document embeds (a creep route's stops and forks); no documents of their own. */
export const objectTypes = [creepStop, creepFork];
