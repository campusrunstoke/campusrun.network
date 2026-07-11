import AdminHeader from "./AdminHeader";

/** Dark shell + backdrop + nav header, shared by all authed admin pages. */
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
    <div className="relative min-h-dvh overflow-hidden bg-[#070B14] text-[#E5E9F0]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(#1C2636 1px, transparent 1px), linear-gradient(90deg, #1C2636 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#FFCC00]/10 blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-[#22D3EE]/8 blur-[140px]" />

      <AdminHeader name={name} role={role} />

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
