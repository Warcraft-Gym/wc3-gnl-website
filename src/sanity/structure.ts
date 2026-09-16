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
      S.documentTypeListItem("post").title("Blog posts"),
      S.documentTypeListItem("guide").title("Learn guides"),
      S.documentTypeListItem("aboutPage").title("About page"),
    ]);
