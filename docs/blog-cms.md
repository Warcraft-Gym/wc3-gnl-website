# Blog CMS (Sanity)

The blog is the admin-friendly content surface that replaces WordPress posting.
Content is decoupled from league data behind `src/lib/content/`, so admins get a
WordPress-grade editor without touching the Flask backend.

Until Sanity is configured, the blog renders the fixture posts in
`src/lib/content/fixtures.ts`. Wiring Sanity is a one-time setup.

## 1. Create the project

```bash
pnpm dlx sanity@latest login
pnpm dlx sanity@latest init --project-plan free
# note the projectId it prints
```

Set in `.env.local` (and in Vercel project settings):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
```

That alone switches `getPosts()` to live data.

## 2. Content model

Create a `post` document type with these fields (matches the projection in
`src/lib/content/index.ts`):

```ts
// schemaTypes/post.ts
import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Blog post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: "excerpt", type: "text", rows: 3, validation: (r) => r.required() }),
    defineField({
      name: "category",
      type: "string",
      options: {
        list: [
          { title: "News", value: "news" },
          { title: "Recap", value: "recap" },
          { title: "Guide", value: "guide" },
          { title: "Announcement", value: "announcement" },
        ],
        layout: "radio",
      },
      initialValue: "news",
    }),
    defineField({ name: "author", type: "string", initialValue: "Gym Staff" }),
    defineField({ name: "publishedAt", type: "datetime", validation: (r) => r.required() }),
    defineField({ name: "readingMinutes", type: "number", initialValue: 4 }),
    defineField({ name: "coverImage", type: "image", options: { hotspot: true } }),
    defineField({ name: "body", type: "array", of: [{ type: "block" }, { type: "image" }] }),
  ],
});
```

The projection already maps `slug.current`, `coverImage.asset->url`, and
`body → portableText`. `PostBody` renders Portable Text via
`@portabletext/react` (already installed) and falls back to plain paragraphs for
fixtures.

## 3. Studio (optional, recommended)

Host the editor at `/studio` in this same app so admins log in at
`warcraft3.gym/studio`:

```bash
pnpm add sanity @sanity/vision styled-components
```

Add `sanity.config.ts` at the repo root and a route at
`src/app/studio/[[...tool]]/page.tsx` per the
[next-sanity embed guide](https://github.com/sanity-io/next-sanity#studio). The
`cdn.sanity.io` image host is already allow-listed in `next.config.ts`.

## Swapping CMS later

Nothing in the UI imports Sanity directly — only `src/lib/content/index.ts`
does. To move to Payload or a Flask blog table, implement a new source there
behind the same `getPosts` / `getPostBySlug` contract.
