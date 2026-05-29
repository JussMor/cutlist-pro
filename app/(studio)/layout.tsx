export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `dark` enables shadcn/ui dark-variant utilities across the Studio surface.
  return <div className="dark">{children}</div>;
}
