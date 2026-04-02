import { Suspense } from "react";
import Loading from "./loading";
import App from "./App";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  );
}
