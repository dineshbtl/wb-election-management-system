"use client";

import React, { useState } from "react";
import { Table, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { motion, AnimatePresence } from "framer-motion";

interface BoqTableProps {
  boqs: any[];
}

const CATEGORIES = [
  { key: "nvr_selection", ref: "nvr", label: "NVRs" },
  { key: "camera_selection", ref: "camera", label: "Cameras" },
  { key: "switch_selection", ref: "switch", label: "Switches" },
  { key: "rack_selection", ref: "rack", label: "Racks" },
  { key: "pole_selection", ref: "pole", label: "Poles" },
  {
    key: "wpf_selection",
    ref: "weatherproof_box",
    label: "Weatherproof Boxes",
  },
  { key: "cable_selection", ref: "cable", label: "Cables" },
  { key: "conduit_selection", ref: "conduit", label: "Conduits" },
  { key: "wire_selection", ref: "wire", label: "Wires" },
  { key: "ups_selection", ref: "up", label: "UPS" },
  { key: "lcd_selection", ref: "lcd", label: "LCDs" },
];

// ✅ Helper to calculate BOQ cost
const calculateBoqCost = (boq: any) => {
  return CATEGORIES.reduce((sum, { key, ref }) => {
    if (!boq[key]) return sum;
    return (
      sum +
      boq[key].reduce((subtotal: number, item: any) => {
        const refData = item[ref];
        const price = refData?.price ?? 0;
        const count = item.count || 0;
        return subtotal + price * count;
      }, 0)
    );
  }, 0);
};

// ✅ Smooth expandable content
const ExpandedContent = (boq: any) => (
  <AnimatePresence>
    <motion.div
      key={boq.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
        {CATEGORIES.map((cat) => {
          const items = boq[cat.key];
          if (!items || items.length === 0) return null;

          return (
            <div
              key={cat.key}
              className="bg-white p-3 rounded-lg border shadow-sm w-full"
            >
              <div className="font-semibold text-gray-800 mb-2 text-sm">
                {cat.label}
              </div>
              <div className="space-y-1">
                {items.map((item: any, idx: number) => {
                  const ref = item[cat.ref];
                  if (!ref) return null;

                  const name = ref.name || "Unknown";
                  const count = item.count || 0;
                  const price = ref.price ?? null;

                  return (
                    <div
                      key={idx}
                      className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1"
                    >
                      <span>{name}</span>
                      <span className="text-gray-500">
                        {price
                          ? `₹${price.toLocaleString()} × ${count}`
                          : `× ${count}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  </AnimatePresence>
);

export default function BoqTable({ boqs }: BoqTableProps) {
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const toggleExpand = (record: any) => {
    setExpandedRowKeys(
      (prev) => (prev.includes(record.id) ? [] : [record.id]) // only one open at a time
    );
  };

  const columns: ColumnsType<any> = [
    {
      title: "ID",
      dataIndex: "id",
      render: (id: number) => <span className="font-semibold">#{id}</span>,
    },
    {
      title: "Division",
      dataIndex: ["division", "name"],
      render: (name: string) => name || "—",
    },
    {
      title: "Location",
      render: (_, boq) => (
        <div className="whitespace-pre-line text-sm text-gray-600">
          {boq.depot?.name || "—"},{"\n"}
          {boq.bus_station?.name || "—"},{"\n"}
          {boq.bus_stand?.name?.split("(")[0].trim() || "—"}
        </div>
      ),
    },
    {
      title: "Survey Date",
      dataIndex: "survey_date",
      render: (date: string) =>
        date
          ? new Date(date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "—",
    },
    {
      title: "Total Cost",
      render: (_, boq) => {
        const totalCost = calculateBoqCost(boq);
        return totalCost > 0 ? (
          <span className="font-bold text-gray-900">
            ₹{boq.cost.toLocaleString()}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      title: "CreatedBy",
      dataIndex: "createdByName",
      render: (name: string) => name || "—",
    },
    {
      title: "Approved",
      dataIndex: "approved",
      render: (approved: boolean) =>
        approved ? (
          <span className="text-green-600 font-semibold">✅ Yes</span>
        ) : (
          <span className="text-red-600 font-semibold">❌ No</span>
        ),
    },

    {
      title: "Actions",
      align: "right",
      render: (_, record) => {
        const isExpanded = expandedRowKeys.includes(record.id);
        return (
          <Button
            type="link"
            onClick={() => toggleExpand(record)}
            className="p-0 text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? "Less" : "More"}
          </Button>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={boqs}
      columns={columns}
      rowKey="id"
      expandable={{
        expandedRowRender: (record) => ExpandedContent(record),
        expandedRowKeys,
        showExpandColumn: false, // hide default expand column
      }}
      pagination={false}
      bordered
      className="rounded-2xl shadow-md"
    />
  );
}
