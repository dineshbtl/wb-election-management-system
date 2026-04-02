import { redirect } from "next/navigation";

/** Old URL → list page. */
export default function LegacyWebCastingDeclarationRedirect() {
  redirect("/web-casting-declarations/new");
}
