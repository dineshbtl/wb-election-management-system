"use client";

import { Modal, Input, Select, Button } from "antd";
import { useState, useEffect } from "react";
import bpi from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  districtId?: string; // 👈 optional
}

export default function AddAssemblyModal({
  open,
  onClose,
  onSuccess,
  districtId,
}: Props) {
  const { toast } = useToast();

  const [districts, setDistricts] = useState<any[]>([]);
  const [district, setDistrict] = useState<string | undefined>(districtId);
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyNo, setAssemblyNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAssemblyId, setCreatedAssemblyId] = useState<string>();
  const [step, setStep] = useState<"assembly" | "location">("assembly");
  const [psName, setPsName] = useState("");
  const [psNo, setPsNo] = useState("");
  const [psLocation, setPsLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    if (districtId) {
      setDistrict(districtId);
    }
  }, [districtId]);

  // Fetch districts
  useEffect(() => {
    if (!open) return;

    const fetchDistricts = async () => {
      try {
        const res = await bpi.get(
          "/districts?fields[0]=district_name&fields[1]=documentId&pagination[pageSize]=1000",
        );
        setDistricts(res.data.data);
      } catch (err) {
        console.error("Failed to fetch districts", err);
      }
    };

    fetchDistricts();
  }, [open]);

  const resetForm = () => {
    setDistrict(undefined);
    setAssemblyName("");
    setAssemblyNo("");
  };

  const handleSubmit = async (goToLocation = true) => {
    if (!district || !assemblyName.trim() || !assemblyNo.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "All fields are required",
      });
      return null;
    }

    setLoading(true);
    try {
      const res = await bpi.post("/assemblies", {
        data: {
          Assembly_Name: assemblyName,
          Assembly_No: assemblyNo,
          district,
        },
      });

      const assemblyId = res.data.data.documentId;
      setCreatedAssemblyId(assemblyId);

      toast({
        variant: "success",
        title: "Assembly Created",
      });

      if (goToLocation) {
        setStep("location");
      }

      onSuccess?.();

      return assemblyId; // 👈 important
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to create assembly",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async (finish = false) => {
    if (!psName.trim() || !psNo.trim()) {
      toast({
        variant: "destructive",
        title: "PS Name and PS No required",
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
          assembly: createdAssemblyId,
        },
      });

      toast({
        variant: "success",
        title: "Location Added",
      });

      onSuccess?.();

      if (finish) {
        // Close modal
        resetAll();
        onClose();
      } else {
        // Clear only location fields
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
        description:
          err.response?.data?.error?.message || "Failed to add location",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep("assembly");
    setDistrict(undefined);
    setAssemblyName("");
    setAssemblyNo("");
    setCreatedAssemblyId(undefined);
    setPsName("");
    setPsNo("");
    setPsLocation("");
    setLatitude("");
    setLongitude("");
  };

  return (
    <Modal
      title="Add Assembly"
      open={open}
      onCancel={() => {
        resetForm();
        onClose();
      }}
      footer={null}
    >
      {step === "assembly" && (
        <div className="space-y-4">
          {!districtId && (
            <Select
              placeholder="Select District"
              className="w-full"
              value={district}
              onChange={setDistrict}
            >
              {districts.map((d: any) => (
                <Select.Option key={d.documentId} value={d.documentId}>
                  {d.district_name}
                </Select.Option>
              ))}
            </Select>
          )}

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
            <Button onClick={onClose}>Close</Button>

            <div className="flex gap-2">
              <Button loading={loading} onClick={() => handleSubmit(true)}>
                Save & Add Location
              </Button>

              <Button
                type="primary"
                loading={loading}
                onClick={async () => {
                  const id = await handleSubmit(false);
                  if (id) {
                    resetAll();
                    onClose();
                  }
                }}
              >
                Save & Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "location" && (
        <div className="space-y-4">
          <p className="text-green-600 text-sm">
            Assembly created successfully ✔
          </p>

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

          <div className="grid grid-cols-2 gap-2">
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
            <Button onClick={onClose}>Finish</Button>

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
