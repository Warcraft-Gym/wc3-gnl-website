import { notFound } from "next/navigation";
import { ArticleForm, type InitialArticle } from "@/components/admin/ArticleForm";
import { getArticle } from "@/lib/admin/articles";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle("post", id);
  if (!article) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold uppercase tracking-[0.08em] text-fg">Edit post</h1>
      <ArticleForm type="post" articleId={id} initial={article as InitialArticle} />
    </div>
  );
}
