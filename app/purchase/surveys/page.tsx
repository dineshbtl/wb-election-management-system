// app/purchase/surveys/page.tsx
import { Suspense } from "react";
import SurveysPage from "./Surveyspage";
import Loading from "./loading";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SurveysPage />
    </Suspense>
  );
}
