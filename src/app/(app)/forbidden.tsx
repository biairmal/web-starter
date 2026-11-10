import { ForbiddenState } from "@/components/feedback/forbidden-state";

// Rendered with status 403 when a page calls `forbidden()` (requirePermission).
// It sits inside the shell, so the navigation stays usable (DESIGN_BRIEF 6.6).
export default function Forbidden() {
  return <ForbiddenState />;
}
