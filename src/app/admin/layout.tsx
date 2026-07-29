export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Escape the root app shell (h-dvh + overflow-hidden + max-w-lg) so admin can
  // scroll on desktop / hosted deploys like a normal dashboard page.
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-y-auto bg-background">
      <div className="min-h-full w-full max-w-3xl mx-auto">{children}</div>
    </div>
  );
}
