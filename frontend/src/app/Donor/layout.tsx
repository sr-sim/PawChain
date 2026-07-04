import { DonorShell } from "@/app/components/DonorShell";

export default function DonorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DonorShell>{children}</DonorShell>;
}
