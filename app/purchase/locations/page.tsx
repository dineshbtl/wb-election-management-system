import { Suspense } from "react";
import Loading from "./loading";
import LocationsPage from "./Locationspage";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <LocationsPage />
    </Suspense>
  );
}
