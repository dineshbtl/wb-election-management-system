"use client";

import React from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { Input, Select, Skeleton } from "antd";
import Link from "next/link";
import AddLocationModal from "@/components/locations/AddLocationModal";
import { Box } from "@/components/ui/box";

export type LocationsPageContentState = {
  setLocationFile: (f: File | null) => void;
  isUploading: boolean;
  handleFullUpload: () => void;
  showForms: boolean;
  setShowForms: (v: boolean) => void;
  districtForm: { district_name: string; state: string };
  setDistrictForm: (v: { district_name: string; state: string }) => void;
  assemblyForm: { Assembly_Name: string; Assembly_No: string; district: string };
  setAssemblyForm: (v: { Assembly_Name: string; Assembly_No: string; district: string }) => void;
  locationForm: {
    PS_Name: string;
    PS_No: string;
    PS_Location: string;
    Latitude: string;
    Longitude: string;
    assembly: string;
    district: string;
  };
  setLocationForm: (v: unknown) => void;
  formLoading: boolean;
  handleAddDistrict: () => void;
  handleAddAssembly: () => void;
  handleAddLocation: () => void;
  districts: { id: string; district_name: string }[];
  assemblies: { id: string; Assembly_Name: string; Assembly_No?: string; district?: { id: string } }[];
  fetchAssemblies: (districtId?: string) => void;
  progress: number;
  addLocationOpen: boolean;
  setAddLocationOpen: (v: boolean) => void;
  fetchLocations: (page?: number, pSize?: number | "all", search?: string, districtId?: string, assemblyId?: string) => void;
  currentPage: number;
  pageSize: number | "all";
  totalLocations: number;
  loadingLocations: boolean;
  paginatedLocations: unknown[];
  onSearchChange: (val: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (v: string) => void;
  selectedAssembly: string;
  setSelectedAssembly: (v: string) => void;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  setPageSize: (v: number | "all") => void;
};

export function LocationsPageContent({ state }: { state: LocationsPageContentState }) {
  const s = state;
  return (
    <Box className="space-y-4 sm:space-y-6 max-w-full min-w-0">
      <PageTitle
        title="Upload & Locations"
        subtitle="Upload polling stations or add districts, assemblies, and locations manually"
      />
      <div className="w-full mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-800">
              Upload Locations (Polling Stations)
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => s.setLocationFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="gradient"
              className="rounded-xl"
              onClick={s.handleFullUpload}
              disabled={s.isUploading}
            >
              {s.isUploading
                ? "Uploading..."
                : "Upload Districts + Assemblies + Locations"}
            </Button>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <Button
            variant="primary"
            className="rounded-xl"
            onClick={() => s.setShowForms(!s.showForms)}
          >
            {s.showForms ? "Hide Manual Forms" : "Add Manually (Forms)"}
          </Button>
        </div>

        {s.showForms && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 p-6 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ Add District</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District Name *</label>
                  <Input
                    placeholder="Enter district name"
                    value={s.districtForm.district_name}
                    onChange={(e) =>
                      s.setDistrictForm({ ...s.districtForm, district_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <Input
                    placeholder="Enter state (optional)"
                    value={s.districtForm.state}
                    onChange={(e) =>
                      s.setDistrictForm({ ...s.districtForm, state: e.target.value })
                    }
                  />
                </div>
                <Button
                  variant="gradient"
                  onClick={s.handleAddDistrict}
                  disabled={s.formLoading}
                  className="w-full rounded-xl"
                >
                  {s.formLoading ? "Adding..." : "Add District"}
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ Add Assembly</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select District *</label>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select District"
                    value={s.assemblyForm.district || undefined}
                    onChange={(value) =>
                      s.setAssemblyForm({ ...s.assemblyForm, district: value })
                    }
                  >
                    {s.districts.map((d) => (
                      <Select.Option key={d.id} value={d.id}>
                        {d.district_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Name *</label>
                  <Input
                    placeholder="Enter assembly name"
                    value={s.assemblyForm.Assembly_Name}
                    onChange={(e) =>
                      s.setAssemblyForm({ ...s.assemblyForm, Assembly_Name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assembly No. *</label>
                  <Input
                    placeholder="Enter assembly number"
                    value={s.assemblyForm.Assembly_No}
                    onChange={(e) =>
                      s.setAssemblyForm({ ...s.assemblyForm, Assembly_No: e.target.value })
                    }
                  />
                </div>
                <Button
                  variant="gradient"
                  onClick={s.handleAddAssembly}
                  disabled={s.formLoading}
                  className="w-full rounded-xl"
                >
                  {s.formLoading ? "Adding..." : "Add Assembly"}
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ Add Location</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select District *</label>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select District"
                    value={s.locationForm.district || undefined}
                    onChange={(value) => {
                      s.setLocationForm({ ...s.locationForm, district: value });
                      s.fetchAssemblies(value);
                      s.setLocationForm((prev: unknown) => ({ ...(prev as object), assembly: "" }));
                    }}
                  >
                    {s.districts.map((d) => (
                      <Select.Option key={d.id} value={d.id}>
                        {d.district_name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Assembly *</label>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select Assembly"
                    value={s.locationForm.assembly || undefined}
                    onChange={(value) =>
                      s.setLocationForm({ ...s.locationForm, assembly: value })
                    }
                    disabled={!s.locationForm.district}
                  >
                    {s.assemblies
                      .filter((a) => a.district?.id === s.locationForm.district)
                      .map((a) => (
                        <Select.Option key={a.id} value={a.id}>
                          {a.Assembly_Name}
                        </Select.Option>
                      ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PS Name *</label>
                  <Input
                    placeholder="Enter PS name"
                    value={s.locationForm.PS_Name}
                    onChange={(e) =>
                      s.setLocationForm({ ...s.locationForm, PS_Name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PS No. *</label>
                  <Input
                    placeholder="Enter PS number"
                    value={s.locationForm.PS_No}
                    onChange={(e) =>
                      s.setLocationForm({ ...s.locationForm, PS_No: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (Village)</label>
                  <Input
                    placeholder="Enter village/location"
                    value={s.locationForm.PS_Location}
                    onChange={(e) =>
                      s.setLocationForm({ ...s.locationForm, PS_Location: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
                    <Input
                      placeholder="Lat"
                      value={s.locationForm.Latitude}
                      onChange={(e) =>
                        s.setLocationForm({ ...s.locationForm, Latitude: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
                    <Input
                      placeholder="Long"
                      value={s.locationForm.Longitude}
                      onChange={(e) =>
                        s.setLocationForm({ ...s.locationForm, Longitude: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="gradient"
                  onClick={s.handleAddLocation}
                  disabled={s.formLoading}
                  className="w-full rounded-xl"
                >
                  {s.formLoading ? "Adding..." : "Add Location"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {s.isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-3 mt-6">
            <div
              className="bg-gradient-to-r from-indigo-500 to-amber-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${s.progress}%` }}
            />
          </div>
        )}

        <div className="mt-5">
          <div className="lg:flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Uploaded Locations</h2>
            <Button
              onClick={() => s.setAddLocationOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Add Location
            </Button>
          </div>
          <div className="lg:flex items-center justify-between mb-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Input
                type="search"
                placeholder="Search by PS No."
                className="border rounded px-3  w-48"
                onChange={(e) => s.onSearchChange(e.target.value)}
              />
              <Select
                style={{ width: 250 }}
                value={s.selectedDistrict}
                onChange={(value) => {
                  s.setSelectedDistrict(value);
                  s.setSelectedAssembly("all");
                  s.fetchAssemblies(value);
                  s.setCurrentPage(1);
                }}
                placeholder="Select District"
              >
                <Select.Option value="all">All Districts</Select.Option>
                {s.districts.map((d) => (
                  <Select.Option key={d.id} value={d.id}>
                    {d.district_name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                style={{ width: 250 }}
                value={s.selectedAssembly}
                onChange={(value) => {
                  s.setSelectedAssembly(value);
                  s.setCurrentPage(1);
                }}
                placeholder="Select Assembly"
                disabled={!s.assemblies.length}
              >
                <Select.Option value="all">All Assemblies</Select.Option>
                {s.assemblies.map((a) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.Assembly_Name} ({a.Assembly_No})
                  </Select.Option>
                ))}
              </Select>
              <Select
                style={{ width: 150 }}
                value={s.pageSize}
                onChange={(value) => {
                  s.setPageSize(value);
                  s.setCurrentPage(1);
                }}
              >
                <Select.Option value={50}>Show 50</Select.Option>
                <Select.Option value={100}>Show 100</Select.Option>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-800 font-semibold text-left">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">PS No.</th>
                  <th className="px-4 py-2">PS Name</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Assembly</th>
                </tr>
              </thead>
              <tbody>
                {s.loadingLocations ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b">
                      <td className="px-4 py-2">
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                      <td className="px-4 py-2">
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                      <td className="px-4 py-2">
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                      <td className="px-4 py-2">
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                      <td className="px-4 py-2">
                        <Skeleton active paragraph={{ rows: 0 }} />
                      </td>
                    </tr>
                  ))
                ) : (s.paginatedLocations as { documentId: string; PS_No?: string; PS_Name?: string; PS_Location?: string; assembly?: { Assembly_Name?: string } }[]).length ? (
                  (s.paginatedLocations as { documentId: string; PS_No?: string; PS_Name?: string; PS_Location?: string; assembly?: { Assembly_Name?: string } }[]).map((loc, index) => (
                    <tr
                      key={loc.documentId}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer text-gray-700"
                    >
                      <td className="px-4 py-2">
                        {(s.currentPage - 1) *
                          (s.pageSize === "all"
                            ? s.paginatedLocations.length
                            : (s.pageSize as number)) +
                          index +
                          1}
                      </td>
                      <td className="px-4 py-2">{loc.PS_No || "—"}</td>
                      <Link href={`/locations/${loc.documentId}`}>
                        <td className="px-4 py-2 font-medium text-blue-600 hover:underline">
                          {loc.PS_Name}
                        </td>
                      </Link>
                      <td className="px-4 py-2">{loc.PS_Location || "—"}</td>
                      <td className="px-4 py-2">
                        {loc.assembly?.Assembly_Name || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-gray-500 py-4 italic"
                    >
                      No locations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {s.pageSize !== "all" && s.totalLocations > (s.pageSize as number) && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <strong>
                  {(s.currentPage - 1) * (s.pageSize as number) + 1}-
                  {Math.min(
                    s.currentPage * (s.pageSize as number),
                    s.totalLocations,
                  )}
                </strong>{" "}
                of <strong>{s.totalLocations}</strong> entries
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={s.currentPage === 1}
                  onClick={() => {
                    s.setCurrentPage((p: number) => Math.max(p - 1, 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page <strong>{s.currentPage}</strong> of{" "}
                  {Math.ceil(s.totalLocations / (s.pageSize as number))}
                </span>
                <Button
                  variant="outline"
                  disabled={
                    s.currentPage ===
                    Math.ceil(s.totalLocations / (s.pageSize as number))
                  }
                  onClick={() => {
                    s.setCurrentPage((p: number) =>
                      Math.min(
                        p + 1,
                        Math.ceil(s.totalLocations / (s.pageSize as number)),
                      ),
                    );
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <AddLocationModal
          open={s.addLocationOpen}
          onClose={() => s.setAddLocationOpen(false)}
          onSuccess={() => {
            s.fetchLocations(
              s.currentPage,
              s.pageSize === "all" ? "all" : s.pageSize,
              undefined,
              s.selectedDistrict,
              s.selectedAssembly,
            );
          }}
        />
      </div>
    </Box>
  );
}
