/** Feature switches for things built but not yet announced. */

/** The desktop overlay beta: the /tools/overlay page, its card on /tools
 *  and the pointers on the homepage and build pages. Flip to true once the
 *  app has been tested properly. */
export const OVERLAY_BETA_LIVE = true;

/** The GNL ladder challenge page (/gnl/ladder) and its entry in the league
 *  nav and sitemap. */
export const GNL_LADDER_LIVE = true;

/** The creep route pages (/learn/creep-routes/<slug>). The list page, nav
 *  entry and editor land in later features; this flag only gates the
 *  detail page shipped here. */
export const CREEP_ROUTES_LIVE = true;
