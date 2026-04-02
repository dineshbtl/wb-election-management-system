import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface LogPanelProps {
  log: string[];
  uploading: boolean;
}

export default function LogPanel({ log, uploading }: LogPanelProps) {
  if (!uploading && log.length === 0) return null;

  const getLogIcon = (line: string) => {
    if (line.includes("✅"))
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (line.includes("❌"))
      return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-blue-500" />;
  };

  const getLogColor = (line: string) => {
    if (line.includes("✅"))
      return "text-green-700 bg-green-50 border-green-200";
    if (line.includes("❌")) return "text-red-700 bg-red-50 border-red-200";
    return "text-blue-700 bg-blue-50 border-blue-200";
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 mt-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
        Upload Progress
      </h3>

      <div className="max-h-64 overflow-y-auto space-y-2">
        <AnimatePresence>
          {log.map((line, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center p-3 rounded-lg border ${getLogColor(
                line
              )}`}
            >
              {getLogIcon(line)}
              <span className="ml-2 text-sm font-medium">{line}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center p-3 rounded-lg border text-blue-700 bg-blue-50 border-blue-200"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full mr-2"
            />
            <span className="text-sm font-medium">Processing...</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
