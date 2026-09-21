import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { listArticles } from "@/lib/admin/articles";

// Requires the write-token Sanity client and a live session; never prerender.
export const dynamic = "force-dynamic";


type Row = { _id: string; title?: string; slug?: string; hasDraft?: boolean };

function Section({ title, type, items }: { title: string; type: "post" | "guide"; items: Row[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.08em] text-fg">{title}</h2>
        <ButtonLink href={`/admin/${type}s/new`} size="sm">
          New {type}
        </ButtonLink>
      </div>
      <ul className="divide-y divide-line rounded border border-line">
        {items.map((item) => (
          <li key={item._id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-bold text-fg">{item.title}</p>
              <p className="text-xs text-faint">
                {item.slug}
                {item.hasDraft ? " · draft" : ""}
              </p>
            </div>
            <Link href={`/admin/${type}s/${item._id.replace(/^drafts\./, "")}`} className="text-xs text-arcane underline">
              Edit
            </Link>
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-6 text-sm text-faint">Nothing yet.</li> : null}
      </ul>
    </section>
  );
}

export default async function AdminHomePage() {
  const [posts, guides] = await Promise.all([listArticles("post"), listArticles("guide")]);
  return (
    <div className="space-y-10">
      <Section title="Posts" type="post" items={posts} />
      <Section title="Guides" type="guide" items={guides} />
    </div>
  );
}
