import { ArticleForm } from "@/components/admin/ArticleForm";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold uppercase tracking-[0.08em] text-fg">New post</h1>
      <ArticleForm type="post" />
    </div>
  );
}
