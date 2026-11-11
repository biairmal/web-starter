import { PublicFrame } from "@/components/layout/public-frame";

// The forced password change (TRD 5.7): the public composition, with no
// navigation and no way out except signing out (DESIGN_BRIEF 7.3).
export default function RestrictedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicFrame>{children}</PublicFrame>;
}
