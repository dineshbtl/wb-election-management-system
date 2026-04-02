"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { Pagination, Input } from "antd";

const { Search } = Input;

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSites();
  }, [page, pageSize, searchQuery]);

  const fetchSites = async () => {
    try {
      const res = await api.get(
        `/bus-stations?pagination[page]=${page}&pagination[pageSize]=${pageSize}&filters[$or][0][name][$containsi]=${searchQuery}&filters[$or][1][address][$containsi]=${searchQuery}`
      );

      setSites(res.data.data);
      setTotal(res.data.meta.pagination.total);
    } catch (err) {
      console.error("❌ Failed to fetch sites", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sites</h1>

      {/* 🔍 Search Bar */}
      <div className="mb-4 max-w-md">
        <Search
          placeholder="Search by name or address"
          allowClear
          enterButton
          onSearch={(value) => {
            setPage(1); // reset to first page when searching
            setSearchQuery(value.trim());
          }}
        />
      </div>

      {/* Sites grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => (
          <Link
            key={site.documentId}
            href={`/sites/${site.documentId}`}
            className="block border rounded-xl p-4 shadow hover:shadow-lg transition"
          >
            <h2 className="text-lg font-semibold">{site.name}</h2>
            <p className="text-gray-600 text-sm">{site.address}</p>
          </Link>
        ))}
      </div>

      {/* Pagination controls */}
      <div className="flex justify-center mt-6">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          pageSizeOptions={[25, 50, 100]}
          onChange={(newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          }}
        />
      </div>
    </div>
  );
}
