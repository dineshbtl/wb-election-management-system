"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Modal, Button, Progress, message, Upload } from "antd";
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import bpi from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadInstallationsModal({ open, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ type: "success" | "error"; msg: string }[]>([]);

  const handleUpload = async () => {
    if (!file) {
      message.warning("Please select an Excel file first.");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setLogs([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        throw new Error("Excel file is empty.");
      }

      const chunkSize = 2000;
      const totalRows = rows.length;
      let totalProcessed = 0;
      let totalErrors = 0;

      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        
        // Map Excel rows to the keys expected by the custom Strapi API
        const formattedData = chunk.map((row, idx) => ({
          acNo: row["AC NO"]?.toString().trim(),
          psNo: row["PS NO"]?.toString().trim(),
          category: row["CATEGORY"]?.toString().trim().toUpperCase(),
          streamId: row["STREAM ID"]?.toString().trim(),
          status: row["STATUS"]?.toString().trim() || "Active"
        })).filter(item => item.acNo && item.psNo && item.category && item.streamId);

        if (formattedData.length === 0) {
          setLogs((prev) => [...prev, { type: "error", msg: `Chunk ${Math.floor(i / chunkSize) + 1}: No valid records found in this block.` }]);
          continue;
        }

        try {
          const response = await bpi.post("/locations/bulk-install", { data: formattedData });
          const { processed, errors } = response.data;
          
          totalProcessed += processed || 0;
          totalErrors += (errors?.length || 0);

          if (processed > 0) {
            setLogs((prev) => [...prev, { type: "success", msg: `Batch ${Math.floor(i / chunkSize) + 1}: Successfully processed ${processed} records.` }]);
          }

          if (errors && errors.length > 0) {
            errors.slice(0, 10).forEach((err: any) => {
              setLogs((prev) => [...prev, { type: "error", msg: `Row ${err.row?.psNo || "unknown"}: ${err.error}` }]);
            });
            if (errors.length > 10) {
              setLogs((prev) => [...prev, { type: "error", msg: `... and ${errors.length - 10} more errors in this batch.` }]);
            }
          }
        } catch (err: any) {
          console.error("Batch error:", err);
          setLogs((prev) => [...prev, { type: "error", msg: `Batch ${Math.floor(i / chunkSize) + 1}: Server error occurred.` }]);
        }

        const currentProg = Math.min(100, Math.round(((i + chunkSize) / totalRows) * 100));
        setProgress(currentProg);
      }

      toast({
        variant: "success",
        title: "Bulk Upload Complete",
        description: `Processed ${totalProcessed} installations. Total errors: ${totalErrors}.`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Upload error:", err);
      message.error(err.message || "Failed to process bulk upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          <span>Upload Bulk Installations</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<UploadIcon className="w-4 h-4" />}
          onClick={handleUpload}
          loading={isUploading}
          disabled={!file}
        >
          Start Upload
        </Button>,
      ]}
      width={600}
    >
      <div className="space-y-4 py-4">
        <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer space-y-2 block">
            <UploadIcon className="w-8 h-8 mx-auto text-gray-400" />
            <div className="text-sm font-medium text-gray-600">
              {file ? file.name : "Click to select or drag and drop Excel file"}
            </div>
            <div className="text-xs text-gray-400">Supported formats: .xlsx, .xls</div>
          </label>
        </div>

        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress percent={progress} showInfo={false} strokeColor="#3b82f6" />
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg bg-gray-50 p-3 space-y-1">
            <h4 className="text-sm font-semibold mb-2">Process Logs:</h4>
            {logs.map((log, idx) => (
              <div key={idx} className={`text-xs flex items-start gap-2 ${log.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {log.type === "success" ? (
                  <CheckCircle2 className="w-3 h-3 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3 h-3 mt-0.5" />
                )}
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
          <div className="text-xs text-blue-700">
            <strong>Expected Columns:</strong> AC NO, PS NO, CATEGORY (IN/OUT), STREAM ID
          </div>
        </div>
      </div>
    </Modal>
  );
}
