import type { StructureResolver } from "sanity/structure";

/**
 * Studio desk. Build orders get their own section with the review queue
 * (public submissions land as drafts) split from what's live.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Build orders")
        .child(
          S.list()
            .title("Build orders")
            .items([
              // Review state lives on the document (public submissions arrive
              // as "pending"), so the queue works regardless of the Studio's
              // draft/published perspective.
              S.listItem()
                .title("Pending review")
                .child(
                  S.documentList()
                    .title("Pending review")
                    .apiVersion("2024-10-01")
                    .filter('_type == "buildOrder" && reviewStatus == "pending"')
                    .defaultOrdering([{ field: "_updatedAt", direction: "desc" }]),
                ),
              S.listItem()
                .title("Approved")
                .child(
                  S.documentList()
                    .title("Approved")
                    .apiVersion("2024-10-01")
                    .filter('_type == "buildOrder" && coalesce(reviewStatus, "approved") == "approved"')
                    .defaultOrdering([{ field: "publishedAt", direction: "desc" }]),
                ),
              S.divider(),
              S.documentTypeListItem("buildOrder").title("All build orders"),
            ]),
        ),
      S.divider(),
      S.listItem()
        .title("Creep routes")
        .child(
          S.list()
            .title("Creep routes")
            .items([
              // Same review-state convention as build orders: the queue
              // works regardless of the Studio's draft/published perspective.
              S.listItem()
                .title("Pending review")
                .child(
                  S.documentList()
                    .title("Pending review")
                    .apiVersion("2024-10-01")
                    .filter('_type == "creepRoute" && reviewStatus == "pending"')
                    .defaultOrdering([{ field: "_updatedAt", direction: "desc" }]),
                ),
              S.listItem()
                .title("Approved")
                .child(
                  S.documentList()
                    .title("Approved")
                    .apiVersion("2024-10-01")
                    .filter('_type == "creepRoute" && coalesce(reviewStatus, "approved") == "approved"')
                    .defaultOrdering([{ field: "publishedAt", direction: "desc" }]),
                ),
              S.divider(),
              S.documentTypeListItem("creepRoute").title("All creep routes"),
              S.documentTypeListItem("creepMap").title("Maps"),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem("post").title("Blog posts"),
      S.documentTypeListItem("guide").title("Learn guides"),
      S.divider(),
      S.documentTypeListItem("tool").title("Tools"),
      S.divider(),
      // A singleton: one rulebook, opened directly rather than through a
      // list of one. The fixed id is what `getGnlRules` reads.
      S.listItem()
        .title("League rules")
        .child(S.document().schemaType("gnlRules").documentId("gnlRules").title("League rules")),
      // The other singleton: one King of the Hill page, at a fixed id.
      S.listItem()
        .title("King of the Hill")
        .child(S.document().schemaType("kothPage").documentId("kothPage").title("King of the Hill")),
    ]);
