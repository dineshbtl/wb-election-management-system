"use client";

import {
  FileText,
  MapPin,
  Bus,
  Calculator,
  Building,
  Eye,
  CheckCircle,
} from "lucide-react";
import api from "@/lib/api"; // Import the api utility
import { useState } from "react";

const getItemInfo = (item: any) => {
  const relationKey = Object.keys(item).find(
    (k) => k !== "id" && k !== "count"
  );
  const ref = relationKey ? item[relationKey] : null;
  return {
    name: ref?.name || "Unknown",
    price: ref?.price ?? null,
    count: item.count || 0,
  };
};

const renderGroup = (
  title: string,
  selection: any[],
  icon: React.ReactNode
) => {
  if (!selection || selection.length === 0) return null;
  let subtotal = 0;

  return (
    <div className="mb-6 overflow-hidden">
      {/* Group Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-t-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-xl">
        {selection.map((item: any, idx: number) => {
          const { name, price, count } = getItemInfo(item);
          const itemTotal = price ? price * count : 0;
          subtotal += itemTotal;

          return (
            <div
              key={idx}
              className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
            >
              <div>
                <div className="font-medium text-gray-800">{name}</div>
                <div className="text-sm text-gray-500">Quantity: {count}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {price ? `₹${itemTotal.toLocaleString()}` : "Price not set"}
                </div>
                {price && (
                  <div className="text-sm text-gray-500">
                    ₹{price.toLocaleString()} × {count}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Subtotal */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span className="font-bold text-green-700 text-lg">
              {subtotal > 0 ? `₹${subtotal.toLocaleString()}` : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const calculateBoqCost = (boq: any) => {
  const groups = [
    boq.nvr_selection,
    boq.camera_selection,
    boq.switch_selection,
    boq.rack_selection,
    boq.pole_selection,
    boq.wpf_selection,
    boq.cable_selection,
    boq.conduit_selection,
    boq.wire_selection,
    boq.ups_selection,
    boq.lcd_selection,
  ];
  return groups.reduce((sum, group) => {
    if (!group) return sum;
    return (
      sum +
      group.reduce((sub, item) => {
        const { price, count } = getItemInfo(item);
        return sub + (price ? price * count : 0);
      }, 0)
    );
  }, 0);
};

export default function BoqModal({
  boq,
  onBoqUpdated,
}: {
  boq: any;
  onBoqUpdated?: () => void;
}) {
  if (!boq) return null;
  const totalCost = boq.approved
    ? boq.locked_total // ✅ use frozen total
    : calculateBoqCost(boq);
  const [approving, setApproving] = useState(false);

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); // e.g. 08/06/2025
  };

  const handleApprove = async () => {
    if (boq.approved) return; // Prevent approving already approved BOQs
    setApproving(true);
    try {
      await api.put(`/boqs/${boq.documentId}`, {
        data: { approved: true },
      });
      // Update the local boq object to reflect the change
      boq.approved = true;
      if (onBoqUpdated) onBoqUpdated(); // Notify parent to refresh data
      load();
    } catch (err) {
      console.error("Failed to approve BOQ:", err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Location Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-xl border">
          <div className="flex items-center gap-2 mb-3 text-blue-600">
            <MapPin className="w-5 h-5" />
            <h3 className="font-semibold text-gray-800">Location</h3>
          </div>
          <p className="text-sm">
            <span className="font-semibold">Division:</span>{" "}
            {boq.division?.name || "—"}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Depot:</span>{" "}
            {boq.depot?.name || "—"}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Bus Station:</span>{" "}
            {boq.bus_station?.name || "—"}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Bus Stand:</span>{" "}
            {boq.bus_stand?.name || "—"}
          </p>
          <p className="text-sm text-gray-700 font-medium mt-2">
            Survey Date: {formatDate(boq.survey_date)}
          </p>
          <p className="text-sm text-gray-700 font-medium mt-2">
            <span className="font-semibold">Status:</span>{" "}
            {boq.approved ? (
              <span className="text-green-600">Approved</span>
            ) : (
              <span className="text-red-600">Not Approved</span>
            )}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-xl border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Calculator className="w-5 h-5" />
              <h3 className="font-semibold text-gray-800">Total Cost</h3>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {totalCost > 0
                ? `₹${totalCost.toLocaleString()}`
                : "Not available"}
            </p>
          </div>
          {!boq.approved && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className={`mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center ${
                approving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {approving ? "Approving..." : "Approve BOQ"}
            </button>
          )}
        </div>
      </div>

      {/* If approved → show locked snapshot, else show live groups */}
      {boq.approved && Array.isArray(boq.locked_items) ? (
        <>
          {boq.locked_items.map((x: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-4">
              <div>
                <div className="font-medium text-gray-800">{x.name}</div>
                <div className="text-sm text-gray-500">Quantity: {x.count}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  ₹{x.subtotal.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  ₹{x.locked_price.toLocaleString()} × {x.count}
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {renderGroup(
            "NVRs",
            boq.nvr_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Cameras",
            boq.camera_selection,
            <Eye className="w-5 h-5" />
          )}
          {renderGroup(
            "Switches",
            boq.switch_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Racks",
            boq.rack_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Poles",
            boq.pole_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Weatherproof Boxes",
            boq.wpf_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Cables",
            boq.cable_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Conduits",
            boq.conduit_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "Wires",
            boq.wire_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup(
            "UPS",
            boq.ups_selection,
            <Building className="w-5 h-5" />
          )}
          {renderGroup("LCDs", boq.lcd_selection, <Eye className="w-5 h-5" />)}
        </>
      )}

      {/* Equipment Groups */}
      {/* {renderGroup("NVRs", boq.nvr_selection, <Building className="w-5 h-5" />)}
      {renderGroup(
        "Cameras",
        boq.camera_selection,
        <Eye className="w-5 h-5" />
      )}
      {renderGroup(
        "Switches",
        boq.switch_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup(
        "Racks",
        boq.rack_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup(
        "Poles",
        boq.pole_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup(
        "Weatherproof Boxes",
        boq.wpf_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup(
        "Cables",
        boq.cable_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup(
        "Conduits",
        boq.conduit_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup(
        "Wires",
        boq.wire_selection,
        <Building className="w-5 h-5" />
      )}
      {renderGroup("UPS", boq.ups_selection, <Building className="w-5 h-5" />)}
      {renderGroup("LCDs", boq.lcd_selection, <Eye className="w-5 h-5" />)} */}
    </div>
  );
}
