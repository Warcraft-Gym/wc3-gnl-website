import { LearnSubNav } from "@/components/layout/LearnSubNav";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  // Header + sub-nav together form the chrome that page mastheads sit under,
  // the same as the GNL section.
  return (
    <div className="[--wg-chrome-h:calc(var(--wg-header-h)+var(--wg-subnav-h))]">
      <LearnSubNav />
      {children}
    </div>
  );
}
