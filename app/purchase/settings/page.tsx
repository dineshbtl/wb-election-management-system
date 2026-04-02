import { Suspense } from "react";
import Loading from "./loading";
import SettingsPage from "./SettingsPage";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsPage />
    </Suspense>
  );
}
