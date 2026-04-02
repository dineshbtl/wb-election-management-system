import { motion } from "framer-motion";
import { Grid3X3, Table } from "lucide-react";

interface ViewToggleProps {
  view: "grid" | "table";
  onViewChange: (view: "grid" | "table") => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onViewChange("grid")}
        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
          view === "grid"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <Grid3X3 className="w-4 h-4 mr-2" />
        Grid
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onViewChange("table")}
        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
          view === "table"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        <Table className="w-4 h-4 mr-2" />
        Table
      </motion.button>
    </div>
  );
}
