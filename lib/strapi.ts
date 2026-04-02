import api from "./api";

async function fetchAllData<T>(endpoint: string): Promise<T[]> {
  let allData: T[] = [];
  let page = 1;
  const pageSize = 100; // safe chunk size

  while (true) {
    const res = await api.get<{ data: T[]; meta: { pagination: any } }>(
      `${endpoint}?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*`
    );

    allData = [...allData, ...res.data.data];

    if (page >= res.data.meta.pagination.pageCount) break;
    page++;
  }

  return allData;
}
