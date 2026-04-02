import { Button, Input, Select } from "antd";
import React from "react";

const Adddistrict = () => {
  const handleAddDistrict = async () => {
    if (!districtForm.district_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "District name is required.",
      });
      return;
    }

    setFormLoading(true);
    try {
      await bpi.post("/districts", {
        data: {
          district_name: districtForm.district_name,
          state: districtForm.state || null,
        },
      });

      toast({
        variant: "success",
        title: "District Added",
        description: `${districtForm.district_name} added successfully.`,
      });

      setDistrictForm({ district_name: "", state: "" });
      fetchDistricts();
    } catch (err: any) {
      console.error("Error adding district:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to add district.",
      });
    } finally {
      setFormLoading(false);
    }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 p-6 bg-blue-50 rounded-lg">
      {/* District Form */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ➕ Add District
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District Name *
            </label>
            <Input
              placeholder="Enter district name"
              value={districtForm.district_name}
              onChange={(e) =>
                setDistrictForm({
                  ...districtForm,
                  district_name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <Input
              placeholder="Enter state (optional)"
              value={districtForm.state}
              onChange={(e) =>
                setDistrictForm({
                  ...districtForm,
                  state: e.target.value,
                })
              }
            />
          </div>
          <Button
            onClick={handleAddDistrict}
            disabled={formLoading}
            className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
          >
            {formLoading ? "Adding..." : "Add District"}
          </Button>
        </div>
      </div>

      {/* Assembly Form */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ➕ Add Assembly
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select District *
            </label>
            <Select
              style={{ width: "100%" }}
              placeholder="Select District"
              value={assemblyForm.district || undefined}
              onChange={(value) =>
                setAssemblyForm({ ...assemblyForm, district: value })
              }
            >
              {districts.map((d: any) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.district_name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assembly Name *
            </label>
            <Input
              placeholder="Enter assembly name"
              value={assemblyForm.Assembly_Name}
              onChange={(e) =>
                setAssemblyForm({
                  ...assemblyForm,
                  Assembly_Name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assembly No. *
            </label>
            <Input
              placeholder="Enter assembly number"
              value={assemblyForm.Assembly_No}
              onChange={(e) =>
                setAssemblyForm({
                  ...assemblyForm,
                  Assembly_No: e.target.value,
                })
              }
            />
          </div>
          <Button
            onClick={handleAddAssembly}
            disabled={formLoading}
            className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
          >
            {formLoading ? "Adding..." : "Add Assembly"}
          </Button>
        </div>
      </div>

      {/* Location Form */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ➕ Add Location
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select District *
            </label>
            <Select
              style={{ width: "100%" }}
              placeholder="Select District"
              value={locationForm.district || undefined}
              onChange={(value) => {
                setLocationForm({ ...locationForm, district: value });
                // Fetch assemblies for the selected district
                fetchAssemblies(value);
                // Reset assembly when district changes
                setLocationForm((prev) => ({
                  ...prev,
                  assembly: "",
                }));
              }}
            >
              {districts.map((d: any) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.district_name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Assembly *
            </label>
            <Select
              style={{ width: "100%" }}
              placeholder="Select Assembly"
              value={locationForm.assembly || undefined}
              onChange={(value) =>
                setLocationForm({ ...locationForm, assembly: value })
              }
              disabled={!locationForm.district}
            >
              {assemblies
                .filter((a: any) => a.district?.id === locationForm.district)
                .map((a: any) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.Assembly_Name}
                  </Select.Option>
                ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PS Name *
            </label>
            <Input
              placeholder="Enter PS name"
              value={locationForm.PS_Name}
              onChange={(e) =>
                setLocationForm({
                  ...locationForm,
                  PS_Name: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PS No. *
            </label>
            <Input
              placeholder="Enter PS number"
              value={locationForm.PS_No}
              onChange={(e) =>
                setLocationForm({
                  ...locationForm,
                  PS_No: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (Village)
            </label>
            <Input
              placeholder="Enter village/location"
              value={locationForm.PS_Location}
              onChange={(e) =>
                setLocationForm({
                  ...locationForm,
                  PS_Location: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <Input
                placeholder="Lat"
                value={locationForm.Latitude}
                onChange={(e) =>
                  setLocationForm({
                    ...locationForm,
                    Latitude: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <Input
                placeholder="Long"
                value={locationForm.Longitude}
                onChange={(e) =>
                  setLocationForm({
                    ...locationForm,
                    Longitude: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <Button
            onClick={handleAddLocation}
            disabled={formLoading}
            className="w-full bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
          >
            {formLoading ? "Adding..." : "Add Location"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Adddistrict;
