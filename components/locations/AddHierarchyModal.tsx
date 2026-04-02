"use client";

import { Modal, Input, Button, Select } from "antd";
import { useEffect, useState } from "react";
import bpi from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddHierarchyModal({ open, onClose, onSuccess }: Props) {
  const { toast } = useToast();

  const [mode, setMode] = useState<"district" | "assembly" | "location">(
    "district",
  );

  const [loading, setLoading] = useState(false);

  const [districtId, setDistrictId] = useState<string>();
  const [createdAssemblies, setCreatedAssemblies] = useState<
    { id: string; name: string }[]
  >([]);

  const [selectedAssemblyForLocation, setSelectedAssemblyForLocation] =
    useState<string>();

  // District
  const [districtName, setDistrictName] = useState("");
  const [stateName, setStateName] = useState("");

  // Assembly
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyNo, setAssemblyNo] = useState("");

  // Location
  const [psName, setPsName] = useState("");
  const [psNo, setPsNo] = useState("");
  const [psLocation, setPsLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const resetAll = () => {
    setMode("district");
    setDistrictId(undefined);
    setSelectedAssemblyForLocation(undefined);
    setDistrictName("");
    setStateName("");
    setAssemblyName("");
    setAssemblyNo("");
    setPsName("");
    setPsNo("");
  };

  useEffect(() => {
    if (mode === "location" && createdAssemblies.length === 1) {
      setSelectedAssemblyForLocation(createdAssemblies[0].id);
    }
  }, [mode, createdAssemblies]);

  // 🔹 Save District
  const saveDistrict = async () => {
    if (!districtName.trim()) {
      toast({ variant: "destructive", title: "District name required" });
      return;
    }

    setLoading(true);
    try {
      const res = await bpi.post("/districts", {
        data: {
          district_name: districtName,
          state: stateName || null,
        },
      });

      setDistrictId(res.data.data.documentId);

      toast({
        variant: "success",
        title: "District Created",
      });

      setMode("assembly");
      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Save Assembly
  const saveAssembly = async (goToLocation = false) => {
    if (!assemblyName.trim() || !assemblyNo.trim()) {
      toast({ variant: "destructive", title: "Assembly details required" });
      return;
    }

    setLoading(true);
    try {
      const res = await bpi.post("/assemblies", {
        data: {
          Assembly_Name: assemblyName,
          Assembly_No: assemblyNo,
          district: districtId,
        },
      });

      const newAssembly = {
        id: res.data.data.documentId,
        name: assemblyName,
      };

      setCreatedAssemblies((prev) => [...prev, newAssembly]);

      toast({
        variant: "success",
        title: "Assembly Created",
      });

      // Reset assembly fields for next entry
      setAssemblyName("");
      setAssemblyNo("");

      if (goToLocation) {
        setSelectedAssemblyForLocation(newAssembly.id);
        setMode("location");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async (finish = false) => {
    if (!psName.trim() || !psNo.trim()) {
      toast({
        variant: "destructive",
        title: "PS Name and PS No are required",
      });
      return;
    }

    if (!selectedAssemblyForLocation) {
      toast({
        variant: "destructive",
        title: "Please select an assembly",
      });
      return;
    }

    setLoading(true);
    try {
      await bpi.post("/locations", {
        data: {
          PS_Name: psName,
          PS_No: psNo,
          PS_Location: psLocation || null,
          Latitude: latitude || null,
          Longitude: longitude || null,
          assembly: selectedAssemblyForLocation,
        },
      });

      toast({
        variant: "success",
        title: "Location Created",
      });

      onSuccess?.();

      if (finish) {
        resetAll();
        onClose();
      } else {
        // Only clear location fields
        setPsName("");
        setPsNo("");
        setPsLocation("");
        setLatitude("");
        setLongitude("");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        resetAll();
        onClose();
      }}
      footer={null}
      title="Add District / Assembly / Location"
    >
      {mode === "district" && (
        <div className="space-y-4">
          <Input
            placeholder="District Name"
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
          />
          <Input
            placeholder="State (optional)"
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
          />

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                resetAll();
                onClose();
              }}
            >
              Close
            </Button>
            <Button type="primary" loading={loading} onClick={saveDistrict}>
              Save District
            </Button>
          </div>
        </div>
      )}

      {mode === "assembly" && (
        <div className="space-y-4">
          <p className="text-green-600 text-sm">
            District created successfully ✔
          </p>

          <Input
            placeholder="Assembly Name"
            value={assemblyName}
            onChange={(e) => setAssemblyName(e.target.value)}
          />
          <Input
            placeholder="Assembly No."
            value={assemblyNo}
            onChange={(e) => setAssemblyNo(e.target.value)}
          />

          <div className="flex justify-between">
            <Button
              onClick={() => {
                resetAll();
                onClose();
              }}
            >
              Close
            </Button>

            <div className="flex gap-2">
              <Button loading={loading} onClick={() => saveAssembly(false)}>
                Save & Add Another
              </Button>

              <Button
                type="primary"
                loading={loading}
                onClick={() => saveAssembly(true)}
              >
                Save & Add Location
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === "location" && (
        <div className="space-y-4">
          <p className="text-green-600 text-sm">
            Assembly created successfully ✔
          </p>

          {/* 👇 SHOW DROPDOWN ONLY IF MULTIPLE */}
          {createdAssemblies.length > 1 && (
            <Select
              placeholder="Select Assembly"
              className="w-full"
              value={selectedAssemblyForLocation}
              onChange={setSelectedAssemblyForLocation}
            >
              {createdAssemblies.map((a) => (
                <Select.Option key={a.id} value={a.id}>
                  {a.name}
                </Select.Option>
              ))}
            </Select>
          )}

          {/* 👇 Auto selected if only one */}
          {createdAssemblies.length === 1 && (
            <div className="bg-blue-50 p-2 rounded text-sm text-blue-700">
              Adding location under:{" "}
              <strong>{createdAssemblies[0].name}</strong>
            </div>
          )}

          <Input
            placeholder="PS Name"
            value={psName}
            onChange={(e) => setPsName(e.target.value)}
          />

          <Input
            placeholder="PS No."
            value={psNo}
            onChange={(e) => setPsNo(e.target.value)}
          />

          <Input
            placeholder="Village / Location"
            value={psLocation}
            onChange={(e) => setPsLocation(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <Input
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>

          <div className="flex justify-between">
            <Button
              onClick={() => {
                resetAll();
                onClose();
              }}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button loading={loading} onClick={() => saveLocation(false)}>
                Save & Add Another
              </Button>

              <Button
                type="primary"
                loading={loading}
                onClick={() => saveLocation(true)}
              >
                Save & Finish
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
