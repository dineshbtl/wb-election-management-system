import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Modal } from "antd"; // ✅ import antd confirm

interface BoqCardProps {
  boq: any;
  index: number;
  onClick: () => void;
  onDelete: (id: string) => void; // using documentId here
}

const formatBusStand = (name?: string) => {
  if (!name) return "—";
  return name.split("(")[0].trim();
};

const formatDate = (date?: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function PurchaseBoqCard({
  boq,
  index,
  onClick,
  onDelete,
}: BoqCardProps) {
  const showConfirm = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering card click

    Modal.confirm({
      title: "Are you sure you want to delete this BOQ?",
      content: `BOQ #${boq.id} will be permanently deleted.`,
      okText: "Yes, Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => onDelete(boq.documentId), // ✅ pass documentId
    });
  };

  return (
    <div className="min-h-52">
      <motion.div
        className="relative cursor-pointer bg-white/50 rounded-xl shadow-lg p-6 border hover:border-blue-300 transition"
        onClick={onClick}
      >
        {/* ✅ Delete button with antd confirm */}

        <h3 className="font-semibold text-gray-900">BOQ #{boq.id}</h3>
        <p className="text-sm text-gray-500">{boq.division?.name}</p>
        <p className="text-sm text-gray-500">{boq.depot?.name}</p>
        <p className="text-sm text-gray-500">{boq.bus_station?.name}</p>
        <p className="text-sm text-gray-500">
          {formatBusStand(boq.bus_stand?.name)}
        </p>
        <p className="text-sm text-gray-700 font-medium mt-2">
          Survey Date: {formatDate(boq.survey_date)}
        </p>
        <p className="text-sm text-gray-700 font-medium mt-2">
          CreatedBy:{boq.createdByName}
        </p>
        <p className="text-sm text-gray-700 font-medium mt-2">
          Status:
          {boq.approved ? (
            <span className=" text-green-500">Approved</span>
          ) : (
            <span className=" text-red-400">Not Approved</span>
          )}
        </p>

        <div className="mt-2 font-semibold text-blue-600">
          Cost:{" "}
          {boq.cost > 0 ? `₹${boq.cost.toLocaleString()}` : "Not available"}
        </div>
      </motion.div>
    </div>
  );
}
