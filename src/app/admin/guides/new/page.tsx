import { ArticleForm } from "@/components/admin/ArticleForm";

export default function NewGuidePage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold uppercase tracking-[0.08em] text-fg">New guide</h1>
      <ArticleForm type="guide" />
    </div>
  );
}
