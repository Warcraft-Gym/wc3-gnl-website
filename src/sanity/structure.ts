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
              S.listItem()
                .title("Pending review")
                .child(
                  S.documentList()
                    .title("Pending review")
                    .filter('_type == "buildOrder" && _id in path("drafts.**")')
                    .defaultOrdering([{ field: "_updatedAt", direction: "desc" }]),
                ),
              S.listItem()
                .title("Published")
                .child(
                  S.documentList()
                    .title("Published")
                    .filter('_type == "buildOrder" && !(_id in path("drafts.**"))')
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
