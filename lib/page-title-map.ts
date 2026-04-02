/**
 * Maps pathname to page title and breadcrumb segments for (main) app.
 * Used by layout to show dynamic header title and breadcrumbs.
 */
export function getPageTitle(pathname: string): string {
  const segment = pathname.replace(/^\/+/, "").split("/")[0] || "";
  const second = pathname.split("/")[1];

  const map: Record<string, string> = {
    dashboard: "Dashboard",
    surveys: "Surveys",
    survey: "Survey",
    districts: "Districts",
    assemblies: "Assemblies",
    locations: "Polling Stations",
    upload: "Upload Data",
    users: "Users",
    account: "Account",
    installation: "Installation",
    settings: "Settings",
    map: "Map",
    dispatch: "Dispatch",
    cameras: "Cameras",
    boq: "BOQ",
    reports: "Reports",
    projects: "Projects",
    sites: "Sites",
    products: "Products",
    team: "Team",
    "web-casting-declaration": "Web Casting Declarations",
    "web-casting-declarations": "Web Casting Declarations",
  };

  if (segment === "web-casting-declarations") {
    if (second === "new") return "New Web Casting Declaration";
    if (second) return "Web Casting Declaration Details";
    return "Web Casting Declarations";
  }

  if (second === "new" && segment === "surveys") return "New Survey";
  if (second === "add" && segment === "users") return "Add User";
  if (segment === "surveys" && second && second !== "new" && second !== "extra")
    return "Survey Details";
  if (segment === "districts" && second) return "District Details";
  if (segment === "assemblies" && second) return "Assembly Details";
  if (segment === "locations" && second) return "Location Details";

  return map[segment] || "Survey Dashboard";
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];

  const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/dashboard" }];

  const segmentLabels: Record<string, string> = {
    "web-casting-declarations": "Web Casting Declarations",
    surveys: "Surveys",
    survey: "Survey",
    districts: "Districts",
    assemblies: "Assemblies",
    locations: "Polling Stations",
    upload: "Upload Data",
    users: "Users",
    account: "Account",
  };

  let href = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    href += (href ? "/" : "/") + part;
    const label =
      segmentLabels[part] ??
      (part === "new" ? "New" : part === "add" ? "Add" : part.length > 10 ? "Details" : part);
    items.push(i === parts.length - 1 ? { label } : { label, href });
  }
  return items;
}
