import { motion } from "framer-motion";
import { Upload, FileSpreadsheet } from "lucide-react";

interface UploadZoneProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

export default function UploadZone({
  onFileUpload,
  uploading,
}: UploadZoneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/50 rounded-xl shadow-lg p-8  border-gray-200 hover:border-blue-400 transition-colors duration-300"
    >
      <div className="text-center">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4"
        >
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
        </motion.div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload BOQ Excel File
        </h3>
        <p className="text-gray-600 mb-6">
          Select an Excel file (.xlsx, .xls) to upload BOQ data
        </p>

        <div className="relative">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={uploading}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Upload className="w-5 h-5 mr-2" />
            {uploading ? "Uploading..." : "Choose File"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
