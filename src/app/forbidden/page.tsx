import { forbidden } from "next/navigation";

// /forbidden (TRD 6.1): anyone may open it. It answers 403 and renders
// src/app/forbidden.tsx.
export default function ForbiddenPage(): never {
  forbidden();
}
