import bpi from "@/lib/bpi";

export const fetchLocation = (id: string) =>
  bpi.get(
    `/locations/${encodeURIComponent(
      id
    )}?populate[assembly][populate][district]=true&populate=boqs&populate=cameras`
  );

export const fetchSurveys = (id: string) =>
  bpi.get(
    `/surveys?filters[booth][documentId][$eq]=${encodeURIComponent(
      id
    )}&populate=raised_by`
  );

export const fetchBoqs = (id: string) =>
  bpi.get(
    `/boqs?filters[location][documentId][$eq]=${encodeURIComponent(
      id
    )}&populate=location`
  );

export const fetchCameras = (docId: string) =>
  bpi.get(
    `/cameras?filters[assigned_booth][documentId][$eq]=${encodeURIComponent(
      docId
    )}&populate=*`
  );
