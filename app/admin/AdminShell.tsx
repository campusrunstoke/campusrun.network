import AdminHeader from "./AdminHeader";

/**
 * Light shell shared by all authed admin pages — the same ink + white + scarce gold
 * system as the marketing site's data console. Pages sit on the soft fill so white
 * cards read as cards without heavy borders.
 */
export default function AdminShell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-fill text-ink">
      <AdminHeader name={name} role={role} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
