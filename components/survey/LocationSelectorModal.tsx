"use client";

import { Modal } from "antd";
import { useState, useEffect } from "react";
import { Select } from "antd";
import api from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (boothDocumentId: string) => void;
}

export default function LocationSelectorModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [booths, setBooths] = useState<any[]>([]);

  const [district, setDistrict] = useState<string>();
  const [assembly, setAssembly] = useState<string>();
  const [booth, setBooth] = useState<string>();

  useEffect(() => {
    api.get("/districts").then((res) => {
      setDistricts(res.data.data);
    });
  }, []);

  useEffect(() => {
    if (!district) return;
    api
      .get("/assemblies", {
        params: {
          "filters[district][documentId][$eq]": district,
        },
      })
      .then((res) => setAssemblies(res.data.data));
  }, [district]);

  useEffect(() => {
    if (!assembly) return;
    api
      .get("/locations", {
        params: {
          "filters[assembly][documentId][$eq]": assembly,
        },
      })
      .then((res) => setBooths(res.data.data));
  }, [assembly]);

  const handleContinue = () => {
    if (!booth) return;
    onSelect(booth);
  };

  return (
    <Modal
      title="Select Location"
      open={open}
      onCancel={onClose}
      onOk={handleContinue}
      okText="Continue"
    >
      <div className="space-y-4">
        <Select
          placeholder="Select District"
          className="w-full"
          onChange={(val) => {
            setDistrict(val);
            setAssembly(undefined);
            setBooth(undefined);
          }}
        >
          {districts.map((d) => (
            <Select.Option key={d.documentId} value={d.documentId}>
              {d.district_name}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder="Select Assembly"
          className="w-full"
          disabled={!district}
          onChange={(val) => {
            setAssembly(val);
            setBooth(undefined);
          }}
        >
          {assemblies.map((a) => (
            <Select.Option key={a.documentId} value={a.documentId}>
              {a.Assembly_Name}
            </Select.Option>
          ))}
        </Select>

        <Select
          placeholder="Select Booth"
          className="w-full"
          disabled={!assembly}
          onChange={setBooth}
        >
          {booths.map((b) => (
            <Select.Option key={b.documentId} value={b.documentId}>
              {b.PS_Name}
            </Select.Option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
