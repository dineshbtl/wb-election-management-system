"use client";

import { Modal, Input, Select, Steps } from "antd";
import { useState } from "react";
import bpi from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const { Step } = Steps;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddDistrictAssemblyLocationModal({
  open,
  onClose,
  onSuccess,
}: Props) {
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [createdDistrict, setCreatedDistrict] = useState<string>();
  const [createdAssembly, setCreatedAssembly] = useState<string>();

  // District
  const [districtName, setDistrictName] = useState("");
  const [stateName, setStateName] = useState("");

  // Assembly
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyNo, setAssemblyNo] = useState("");

  // Location
  const [psName, setPsName] = useState("");
  const [psNo, setPsNo] = useState("");

  const resetAll = () => {
    setCurrentStep(0);
    setDistrictName("");
    setStateName("");
    setAssemblyName("");
    setAssemblyNo("");
    setPsName("");
    setPsNo("");
    setCreatedDistrict(undefined);
    setCreatedAssembly(undefined);
  };

  const handleNext = async () => {
    setLoading(true);

    try {
      if (currentStep === 0) {
        if (!districtName.trim()) {
          toast({ variant: "destructive", title: "District name required" });
          return;
        }

        const res = await bpi.post("/districts", {
          data: {
            district_name: districtName,
            state: stateName || null,
          },
        });

        setCreatedDistrict(res.data.data.documentId);
        toast({ variant: "success", title: "District Created" });
        setCurrentStep(1);
      } else if (currentStep === 1) {
        if (!assemblyName.trim() || !assemblyNo.trim()) {
          toast({ variant: "destructive", title: "Assembly details required" });
          return;
        }

        const res = await bpi.post("/assemblies", {
          data: {
            Assembly_Name: assemblyName,
            Assembly_No: assemblyNo,
            district: createdDistrict,
          },
        });

        setCreatedAssembly(res.data.data.documentId);
        toast({ variant: "success", title: "Assembly Created" });
        setCurrentStep(2);
      } else if (currentStep === 2) {
        if (!psName.trim() || !psNo.trim()) {
          toast({ variant: "destructive", title: "Location details required" });
          return;
        }

        await bpi.post("/locations", {
          data: {
            PS_Name: psName,
            PS_No: psNo,
            assembly: createdAssembly,
          },
        });

        toast({ variant: "success", title: "Location Created" });

        onSuccess?.();
        resetAll();
        onClose();
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error?.message || "Something failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add District → Assembly → Location"
      open={open}
      onCancel={() => {
        resetAll();
        onClose();
      }}
      onOk={handleNext}
      confirmLoading={loading}
      okText={currentStep === 2 ? "Finish" : "Next"}
    >
      <Steps current={currentStep} size="small" className="mb-6">
        <Step title="District" />
        <Step title="Assembly" />
        <Step title="Location" />
      </Steps>

      {currentStep === 0 && (
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
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-4">
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
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
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
        </div>
      )}
    </Modal>
  );
}
