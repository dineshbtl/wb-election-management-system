// app/purchase/surveys/page.tsx
import { Suspense } from "react";
import Loading from "./loading";
import ProductsPage from "./ProductsPage";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsPage />
    </Suspense>
  );
}
