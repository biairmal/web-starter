import { PublicFrame } from "@/components/layout/public-frame";

// Every public screen (sign-in, sign-up, verify, reset, invite) shares one
// composition (DESIGN_BRIEF 5.1).
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicFrame>{children}</PublicFrame>;
}
