"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Modal, Select, message } from "antd";
import {
  Download,
  Eye,
  List,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/ui/page-title";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  fetchWebCastingSubmissionList,
  type WebCastingListItem,
} from "@/lib/webCastingSubmissionList";
import { downloadWebCastingDeclarationPdf } from "@/lib/webCastingDeclarationPdfDownload";
import { deleteWebCastingDeclaration } from "@/lib/webCastingDelete";

/** Same display helper as surveys list — "S0302 (DHUBRI)" → "Dhubri (S0302)". */
function formatDistrictDisplay(
  district: { district_name?: string } | null | undefined,
): string {
  if (!district?.district_name) return "—";
  const raw = district.district_name.trim();
  const match = raw.match(/^([A-Z0-9]+)\s*\(([^)]+)\)\s*$/i);
  if (match) {
    const [, code, namePart] = match;
    const name =
      namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    return `${name} (${code})`;
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const PAGE_SIZE = 10;

export default function WebCastingDeclarationsListPage() {
  const [savedList, setSavedList] = useState<WebCastingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [districts, setDistricts] = useState<
    { documentId: string; district_name: string }[]
  >([]);
  const [assemblies, setAssemblies] = useState<
    { documentId: string; Assembly_Name: string }[]
  >([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>();
  const [selectedAssembly, setSelectedAssembly] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useIsMobile();
  const initialViewSet = useRef(false);

  useEffect(() => {
    if (isMobile && !initialViewSet.current) {
      setViewMode("card");
      initialViewSet.current = true;
    }
  }, [isMobile]);

  useEffect(() => {
    api
      .get(
        "/districts?fields[0]=district_name&fields[1]=documentId&pagination[pageSize]=100",
      )
      .then((res) => setDistricts(res.data.data ?? []))
      .catch(() => {
        message.warning("Could not load districts for filters.");
        setDistricts([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedDistrict) {
      setAssemblies([]);
      setSelectedAssembly(undefined);
      return;
    }
    api
      .get("/assemblies", {
        params: {
          "filters[district][documentId][$eq]": selectedDistrict,
          "fields[0]": "Assembly_Name",
          "fields[1]": "documentId",
          "pagination[pageSize]": 100,
        },
      })
      .then((res) => setAssemblies(res.data.data ?? []))
      .catch(() => {
        message.warning("Could not load assemblies for filters.");
        setAssemblies([]);
      });
  }, [selectedDistrict]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedDistrict, selectedAssembly]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchWebCastingSubmissionList();
      setSavedList(items);
    } catch (e) {
      console.error(e);
      message.warning("Could not load saved declarations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = useCallback(
    (row: WebCastingListItem) => {
      Modal.confirm({
        title: "Delete this declaration?",
        content:
          "Are you sure you want to delete this? This cannot be undone.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            await deleteWebCastingDeclaration(row.submissionId);
            message.success("Deleted.");
            await load();
          } catch (e) {
            message.error(
              e instanceof Error ? e.message : "Delete failed.",
            );
          }
        },
      });
    },
    [load],
  );

  const onDownloadPdf = useCallback(async (row: WebCastingListItem) => {
    try {
      await downloadWebCastingDeclarationPdf(row.submissionId);
      message.success("PDF downloaded.");
    } catch (e) {
      console.error(e);
      message.error("Failed to download PDF.");
    }
  }, []);

  const filteredList = useMemo(() => {
    let list = savedList;

    if (selectedDistrict) {
      const dRow = districts.find((d) => d.documentId === selectedDistrict);
      const dNameNorm = dRow ? norm(dRow.district_name) : "";
      list = list.filter((row) => {
        if (row.districtDocumentId) {
          return row.districtDocumentId === selectedDistrict;
        }
        if (!dNameNorm) return false;
        return norm(row.district || "") === dNameNorm;
      });
    }

    if (selectedAssembly) {
      const aRow = assemblies.find((a) => a.documentId === selectedAssembly);
      const aNameNorm = aRow ? norm(aRow.Assembly_Name) : "";
      list = list.filter((row) => {
        if (row.assemblyDocumentId) {
          return row.assemblyDocumentId === selectedAssembly;
        }
        if (!aNameNorm) return false;
        return norm(row.assembly || "") === aNameNorm;
      });
    }

    const q = searchText.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const name = (row.fullName || "").toLowerCase();
      const mobile = (row.phone || "").toLowerCase();
      const aadhaarLast4 = (row.aadhaarLast4 || "").toLowerCase();
      const district = (row.district || "").toLowerCase();
      const assembly = (row.assembly || "").toLowerCase();
      const pollingStation = (row.pollingStation || "").toLowerCase();
      const village = (row.village || "").toLowerCase();
      return (
        name.includes(q) ||
        mobile.includes(q) ||
        aadhaarLast4.includes(q) ||
        district.includes(q) ||
        assembly.includes(q) ||
        pollingStation.includes(q) ||
        village.includes(q)
      );
    });
  }, [
    savedList,
    searchText,
    selectedDistrict,
    selectedAssembly,
    districts,
    assemblies,
  ]);

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE) || 1);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  const formatSavedAt = (s: string) =>
    s
      ? new Date(s).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

  const renderRowActions = (row: WebCastingListItem) => {
    const sid = encodeURIComponent(row.submissionId);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem] text-sm">
          <DropdownMenuItem asChild>
            <Link
              href={`/web-casting-declarations/${sid}`}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/web-casting-declarations/${sid}/edit`}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault();
              void onDownloadPdf(row);
            }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
            onClick={(e) => {
              e.preventDefault();
              confirmDelete(row);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderTable = () => (
    <div className="w-full overflow-x-auto overscroll-x-contain custom-scrollbar">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            <th
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider"
              style={{ width: "22%" }}
            >
              Name
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider w-[100px]">
              Aadhaar
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider w-[120px]">
              Mobile
            </th>
            <th
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider"
              style={{ width: "24%" }}
            >
              District &amp; assembly
            </th>
            <th
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider min-w-[140px]"
            >
              Polling station
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 tracking-wider whitespace-nowrap w-[150px]">
              Created at
            </th>
            <th className="px-3 py-3.5 text-left min-w-[72px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedList.map((row) => (
            <tr
              key={row.submissionId}
              className="hover:bg-gray-50/50 transition-colors"
            >
              <td className="px-3 py-3 text-sm align-top">
                <Link
                  href={`/web-casting-declarations/${encodeURIComponent(row.submissionId)}`}
                  className="font-medium text-gray-900 hover:underline break-words"
                >
                  {row.fullName || "—"}
                </Link>
              </td>
              <td className="px-3 py-3 text-sm text-gray-700 align-top whitespace-nowrap">
                {row.aadhaarLast4 ? `****${row.aadhaarLast4}` : "—"}
              </td>
              <td className="px-3 py-3 text-sm text-gray-700 align-top whitespace-nowrap">
                {row.phone || "—"}
              </td>
              <td className="px-3 py-3 text-sm align-top">
                <div className="space-y-0.5 break-words">
                  <div className="text-gray-900">{row.district || "—"}</div>
                  <div className="text-gray-500 text-xs">{row.assembly || "—"}</div>
                </div>
              </td>
              <td className="px-3 py-3 text-sm text-gray-700 align-top break-words">
                {row.pollingStation || "—"}
              </td>
              <td className="px-3 py-3 text-sm text-gray-600 align-top whitespace-nowrap">
                {formatSavedAt(row.savedAt)}
              </td>
              <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                {renderRowActions(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
      {paginatedList.map((row) => {
        const sid = encodeURIComponent(row.submissionId);
        return (
          <div
            key={row.submissionId}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all h-full flex flex-col overflow-hidden"
          >
            <div className="p-4 flex-1 flex flex-col min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/web-casting-declarations/${sid}`}
                  className="font-semibold text-gray-900 text-sm hover:underline line-clamp-2 min-w-0"
                >
                  {row.fullName || "—"}
                </Link>
                {renderRowActions(row)}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    Aadhaar:{" "}
                    <span className="text-gray-800">
                      {row.aadhaarLast4 ? `****${row.aadhaarLast4}` : "—"}
                    </span>
                  </span>
                  <span>
                    Mobile:{" "}
                    <span className="text-gray-800">{row.phone || "—"}</span>
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className="font-medium text-gray-900 text-sm break-words">
                    {row.district || "—"}
                  </div>
                  <div className="text-gray-500 text-xs break-words">
                    {row.assembly || "—"}
                  </div>
                </div>
                {row.pollingStation ? (
                  <div className="text-xs text-gray-600">
                    PS: {row.pollingStation}
                  </div>
                ) : null}
              </div>
              <div className="mt-auto pt-3 text-xs text-gray-500">
                {formatSavedAt(row.savedAt)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 sm:px-6">
      <div className="text-sm text-gray-600 text-center sm:text-left order-2 sm:order-1 min-w-0">
        {totalItems === 0 ? (
          <span className="text-gray-500">No results</span>
        ) : (
          <>
            Results{" "}
            <span className="font-medium text-gray-900">
              {(currentPage - 1) * PAGE_SIZE + 1}
            </span>
            {" – "}
            <span className="font-medium text-gray-900">
              {Math.min(currentPage * PAGE_SIZE, totalItems)}
            </span>
            {" of "}
            <span className="font-medium text-gray-900">{totalItems}</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-center sm:justify-end gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-200 hover:bg-gray-50 min-w-[80px]"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1 || totalItems === 0}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600 min-w-[52px] text-center">
          {totalItems === 0 ? "0 / 0" : `${currentPage} / ${totalPages}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-200 hover:bg-gray-50 min-w-[80px]"
          onClick={() =>
            setCurrentPage((p) => Math.min(totalPages, p + 1))
          }
          disabled={currentPage >= totalPages || totalItems === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full min-w-0 min-h-0 bg-white -m-3 sm:-m-6 p-3 sm:p-6">
      <PageTitle
        title="Web casting declarations"
        subtitle="Saved submissions on this server"
      >
        <Link href="/web-casting-declarations/new">
          <Button variant="gradient" className="rounded-xl px-5 py-2.5 font-medium">
            <Plus className="w-4 h-4" />
            New declaration
          </Button>
        </Link>
      </PageTitle>

      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <Input
            placeholder="Search name, mobile, district, assembly, polling station…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10 rounded-xl border-gray-200 h-11 text-base sm:text-sm"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 sm:hidden">
            <span className="text-xs font-medium text-gray-600">
              Filters &amp; actions
            </span>
            <span className="text-[11px] text-gray-400">Swipe →</span>
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible pb-2 sm:flex-wrap sm:overflow-x-visible sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:gap-3 touch-pan-x scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&_.ant-select]:inline-flex [&_.ant-select]:items-center">
            <Select
              placeholder="District"
              value={selectedDistrict}
              onChange={(v) => {
                setSelectedDistrict(v);
                setSelectedAssembly(undefined);
              }}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children?.toString() ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              className="min-w-[155px] max-w-[min(85vw,280px)] sm:max-w-[280px] flex-shrink-0 rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-10 [&_.ant-select-selector]:min-h-[40px] [&_.ant-select-selection-item]:block [&_.ant-select-selection-item]:truncate [&_.ant-select-selection-item]:text-left"
              style={{ minWidth: 155 }}
              listHeight={256}
              popupMatchSelectWidth={false}
              styles={{
                popup: { root: { minWidth: 260 } },
              }}
            >
              {districts.map((d) => (
                <Select.Option key={d.documentId} value={d.documentId}>
                  {formatDistrictDisplay(d)}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Assembly"
              value={selectedAssembly}
              disabled={!selectedDistrict}
              onChange={(v) => setSelectedAssembly(v)}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children?.toString() ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              className="min-w-[160px] max-w-[min(85vw,280px)] sm:max-w-[280px] flex-shrink-0 rounded-xl [&_.ant-select-selector]:rounded-xl [&_.ant-select-selector]:h-10 [&_.ant-select-selector]:min-h-[40px] [&_.ant-select-selection-item]:block [&_.ant-select-selection-item]:truncate [&_.ant-select-selection-item]:text-left"
              style={{ minWidth: 160 }}
              listHeight={256}
              popupMatchSelectWidth={false}
              styles={{
                popup: { root: { minWidth: 280 } },
              }}
            >
              {assemblies.map((a) => (
                <Select.Option key={a.documentId} value={a.documentId}>
                  {a.Assembly_Name}
                </Select.Option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-gray-200 h-10 min-h-10 px-3 flex-shrink-0 whitespace-nowrap"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 shrink-0 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <div
              className="inline-flex h-10 min-h-10 shrink-0 items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5"
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-[#2196F3] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                aria-label="List view"
                aria-pressed={viewMode === "table"}
              >
                <List className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  viewMode === "card"
                    ? "bg-white text-[#2196F3] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                aria-label="Card view"
                aria-pressed={viewMode === "card"}
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[420px]"
      >
        {loading ? (
          viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 w-24">
                      Aadhaar
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600 w-28">
                      Mobile
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600">
                      District &amp; assembly
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-600">
                      Polling station
                    </th>
                    <th className="px-3 py-3.5 w-14">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-40" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-36" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="px-3 py-3">
                        <Skeleton className="h-8 w-10 rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/3 mt-2 rounded" />
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : savedList.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No saved declarations yet"
            description="When declarations are submitted, they will appear here. Use New declaration to add one."
            className="min-h-[280px]"
          />
        ) : totalItems === 0 ? (
          <EmptyState
            icon={Video}
            title="No declarations match your filters"
            description="Try clearing district, assembly, or search to see all submissions."
            className="min-h-[280px]"
          />
        ) : viewMode === "table" ? (
          renderTable()
        ) : (
          renderCards()
        )}

        {!loading && totalItems > 0 && renderPagination()}
      </motion.div>
    </div>
  );
}
