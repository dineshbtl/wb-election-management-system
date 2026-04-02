"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Spin, Typography, message } from "antd";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { fetchWebCastingSubmissionDetail } from "@/lib/webCastingSubmissionDetail";
import { webCastingFileUrl } from "@/lib/webCastingFileUrl";
import type { StoredWebCastingDeclaration } from "@/lib/webCastingStoredDeclaration";
import { putWebCastingDeclaration } from "@/lib/webCastingSave";
import { buildWebCastingSubmissionFiles } from "@/lib/webCastingSubmissionFiles";
import { downloadWebCastingDeclarationPdf } from "@/lib/webCastingDeclarationPdfDownload";
import WebCastingDeclarationPdfDocument from "@/components/web-casting/WebCastingDeclarationPdfDocument";

const { Title, Text } = Typography;

export default function WebCastingDeclarationDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<StoredWebCastingDeclaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchWebCastingSubmissionDetail(id);
        if (!cancelled) setData(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          message.error("Could not load this declaration.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setLoadingPdf(true);
    try {
      await downloadWebCastingDeclarationPdf(data.submissionId);
      message.success("PDF downloaded.");
    } catch (e) {
      console.error(e);
      message.error("Failed to generate PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSaveToServer = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const files = await buildWebCastingSubmissionFiles(data);
      await putWebCastingDeclaration(data.submissionId, data.form, {
        passportPhoto: files.passportPhoto,
        aadharFront: files.aadharFront,
        aadharBack: files.aadharBack,
        voterFront: files.voterFront,
        voterBack: files.voterBack,
      });
      const refreshed = await fetchWebCastingSubmissionDetail(data.submissionId);
      setData(refreshed);
      message.success("Saved to server.");
    } catch (e) {
      console.error(e);
      message.error(
        e instanceof Error ? e.message : "Save failed. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-white -m-3 sm:-m-6 p-6">
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white -m-3 sm:-m-6 p-6">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Text type="danger">Declaration not found.</Text>
        <div className="mt-4">
          <Link href="/web-casting-declarations">
            <Button>Go to list</Button>
          </Link>
        </div>
      </div>
    );
  }

  const imgs = data.images;
  const includeVoterInPdf = Boolean(imgs.voter_front && imgs.voter_back);

  const imageSlots: { label: string; file: string | null }[] = [
    { label: "Aadhaar — front", file: imgs.aadhaar_front },
    { label: "Aadhaar — back", file: imgs.aadhaar_back },
    { label: "Voter ID — front", file: imgs.voter_front },
    { label: "Voter ID — back", file: imgs.voter_back },
  ];

  return (
    <div className="min-h-0 bg-white -m-3 sm:-m-6 p-3 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/web-casting-declarations">
            <Button icon={<ArrowLeftOutlined />}>Back to list</Button>
          </Link>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={loadingPdf}
            onClick={() => void handleDownloadPdf()}
            className="bg-green-600 hover:bg-green-700"
          >
            Download PDF
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            loading={saving}
            onClick={() => void handleSaveToServer()}
          >
            Save to server
          </Button>
        </div>

        <div>
          <Title level={3} className="!mb-1">
            Declaration preview
          </Title>
          <Text type="secondary" className="text-sm">
            Saved {new Date(data.savedAt).toLocaleString()} · Folder{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              {data.submissionId}
            </code>
          </Text>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 p-4 sm:p-6">
          <WebCastingDeclarationPdfDocument data={data} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <Text strong className="mb-4 block">
            PDF: page 1 — declaration; page 2 — Aadhaar (front and back).
            {includeVoterInPdf
              ? " Page 3 — Voter ID (front and back)."
              : " Upload both Voter ID images to add page 3."}
          </Text>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {imageSlots.map(({ label, file }) => (
              <div
                key={label}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium">
                  {label}
                </div>
                {file ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={webCastingFileUrl(data.submissionId, file)}
                    alt={label}
                    className="h-52 w-full object-contain"
                  />
                ) : (
                  <div className="p-4 text-sm text-gray-400">Not uploaded</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
