"use client";

import { Modal, Input } from "antd";
import { useState } from "react";
import bpi from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddDistrictModal({ open, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [district_name, setDistrictName] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!district_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "District name is required",
      });
      return;
    }

    setLoading(true);
    try {
      await bpi.post("/districts", {
        data: { district_name, state },
      });

      toast({
        variant: "success",
        title: "District Added",
      });

      onSuccess?.();
      onClose();
      setDistrictName("");
      setState("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to add district",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add District"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
    >
      <Input
        placeholder="District Name"
        value={district_name}
        onChange={(e) => setDistrictName(e.target.value)}
        className="mb-3"
      />
      <Input
        placeholder="State (optional)"
        value={state}
        onChange={(e) => setState(e.target.value)}
      />
    </Modal>
  );
}
