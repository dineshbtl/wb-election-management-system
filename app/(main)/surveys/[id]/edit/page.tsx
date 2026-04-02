// "use client";

// import React, { useState, useEffect } from "react";
// import { PageLayout } from "@/components/layout/page-layout";
// import { ModernCard } from "@/components/ui/modern-card";
// import { Button } from "@/components/ui/button";
// import { BackToLink } from "@/components/ui/back-to-link";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { motion } from "framer-motion";
// import { MapPin, ListChecks, Upload, X, Plus } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { useRouter, useParams } from "next/navigation";
// import bpi from "@/lib/bpi";
// import api from "@/lib/api";
// import Network3 from "@/components/survey/Network3";
// import { Switch } from "@/components/ui/switch";
// import { Spin } from "antd";

// const baseurl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

// interface SurveyPhotoEntry {
//   file: File | null;
//   title: string;
//   description: string;
//   existingImageUrl?: string | null;
//   imageId?: number | null;
// }

// interface SurveyFormState {
//   Power_Available: boolean;
//   Socket_Working: boolean;
//   Network_Available: boolean;
//   site_condition: string;
//   site_description: string;
//   GPS_Latitude: string;
//   GPS_Longitude: string;
//   Remarks: string;
//   sim_speeds: {
//     provider: string;
//     download_speed: number;
//     upload_speed: number;
//     latency: number;
//     carrier_info?: string;
//   }[];
//   survey_photo: SurveyPhotoEntry[];
// }

// function PhotoEntryEdit({
//   index,
//   photo,
//   onChange,
//   onFileChange,
//   onRemove,
// }: {
//   index: number;
//   photo: SurveyPhotoEntry;
//   onChange: (field: keyof SurveyPhotoEntry, value: string | number | null) => void;
//   onFileChange: (file: File | null) => void;
//   onRemove: () => void;
// }) {
//   const previewUrl = photo.file ? URL.createObjectURL(photo.file) : photo.existingImageUrl ? `${baseurl}${photo.existingImageUrl}` : null;
//   return (
//     <div className="border rounded-xl p-4 border-gray-200 space-y-3">
//       <div className="flex justify-between items-start">
//         <h4 className="font-medium text-gray-800">Photo {index + 1}</h4>
//         {index > 0 && (
//           <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
//             <X className="w-5 h-5" />
//           </button>
//         )}
//       </div>
//       <div>
//         <Label className="text-sm font-medium text-gray-700">Title *</Label>
//         <Input
//           value={photo.title}
//           onChange={(e) => onChange("title", e.target.value)}
//           placeholder="e.g., Front view of booth"
//           className="mt-1 h-10 rounded-xl"
//         />
//       </div>
//       <div>
//         <Label className="text-sm font-medium text-gray-700">Description</Label>
//         <Input
//           value={photo.description}
//           onChange={(e) => onChange("description", e.target.value)}
//           placeholder="Optional details"
//           className="mt-1 h-10 rounded-xl"
//         />
//       </div>
//       <div>
//         <Label className="text-sm font-medium text-gray-700">Image *</Label>
//         <div className="mt-1 flex items-center space-x-3">
//           <label className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white text-sm font-medium rounded-xl cursor-pointer hover:from-[#2d7ae8] hover:to-[#1976D2]">
//             <Upload className="w-4 h-4 mr-1" />
//             {photo.file ? "Change Image" : "Choose Image"}
//             <input
//               type="file"
//               accept="image/*"
//               className="hidden"
//               onChange={(e) => onFileChange(e.target.files?.[0] || null)}
//             />
//           </label>
//           {photo.file && <span className="text-sm text-gray-600 truncate max-w-xs">{photo.file.name}</span>}
//         </div>
//       </div>
//       {previewUrl && (
//         <div className="mt-2">
//           <img src={previewUrl} alt={`preview-${index}`} className="w-full h-32 object-cover rounded-lg border" />
//         </div>
//       )}
//     </div>
//   );
// }

// export default function EditSurveyPage() {
//   const router = useRouter();
//   const params = useParams();
//   const id = params?.id as string;
//   const { toast } = useToast();
//   const [survey, setSurvey] = useState<any>(null);
//   const [location, setLocation] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [activeTestProvider, setActiveTestProvider] = useState<string | null>(
//     null,
//   );

//   const [form, setForm] = useState<SurveyFormState>({
//     Power_Available: false,
//     Socket_Working: false,
//     Network_Available: false,
//     site_condition: "Good",
//     site_description: "",
//     GPS_Latitude: "",
//     GPS_Longitude: "",
//     Remarks: "",
//     sim_speeds: [
//       { provider: "sim1", download_speed: 0, upload_speed: 0, latency: 0 },
//       { provider: "sim2", download_speed: 0, upload_speed: 0, latency: 0 },
//     ],
//     survey_photo: [],
//   });

//   useEffect(() => {
//     if (!id) return;
//     let cancelled = false;
//     const load = async () => {
//       try {
//         const res = await bpi.get(
//           `/surveys/${encodeURIComponent(id)}?populate[0]=booth.assembly.district&populate[1]=survey_photo.image&populate[2]=sim_speeds`,
//         );
//         const data = res.data?.data || res.data;
//         if (!data || cancelled) return;
//         setSurvey(data);
//         setLocation(data.booth);
//         const sims = data.sim_speeds || [];
//         const sim1 =
//           sims.find((s: any) => (s.provider || "").toLowerCase() === "sim1") ||
//           sims.find((s: any) => (s.provider || "").toLowerCase() === "airtel");
//         const sim2 =
//           sims.find((s: any) => (s.provider || "").toLowerCase() === "sim2") ||
//           sims.find((s: any) => (s.provider || "").toLowerCase() === "jio");
//         const photos = (data.survey_photo || []).map((p: any) => ({
//           file: null,
//           title: p.title || "",
//           description: p.description || "",
//           existingImageUrl: p.image?.url,
//           imageId: p.image?.id,
//         }));
//         setForm({
//           Power_Available: !!data.Power_Available,
//           Socket_Working: !!data.Socket_Working,
//           Network_Available: !!data.Network_Available,
//           site_condition: data.site_condition || "Good",
//           site_description: data.site_description || "",
//           GPS_Latitude: data.GPS_Latitude?.toString() || "",
//           GPS_Longitude: data.GPS_Longitude?.toString() || "",
//           Remarks: data.Remarks || "",
//           sim_speeds: [
//             {
//               provider: "sim1",
//               download_speed: sim1?.download_speed ?? 0,
//               upload_speed: sim1?.upload_speed ?? 0,
//               latency: sim1?.latency ?? 0,
//               ...(sim1?.carrier_info && { carrier_info: sim1.carrier_info }),
//             },
//             {
//               provider: "sim2",
//               download_speed: sim2?.download_speed ?? 0,
//               upload_speed: sim2?.upload_speed ?? 0,
//               latency: sim2?.latency ?? 0,
//               ...(sim2?.carrier_info && { carrier_info: sim2.carrier_info }),
//             },
//           ],
//           survey_photo: photos.length ? photos : [{ file: null, title: "", description: "" }],
//         });
//       } catch (err) {
//         console.error(err);
//         toast({ variant: "destructive", title: "Error", description: "Failed to load survey." });
//         if (!cancelled) router.push("/surveys");
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };
//     load();
//     return () => { cancelled = true; };
//   }, [id, router, toast]);

//   const updatePhoto = (index: number, field: keyof SurveyPhotoEntry, value: string | number | null) => {
//     const updated = [...form.survey_photo];
//     updated[index] = { ...updated[index], [field]: value };
//     setForm({ ...form, survey_photo: updated });
//   };

//   const updatePhotoFile = (index: number, file: File | null) => {
//     const updated = [...form.survey_photo];
//     updated[index] = { ...updated[index], file };
//     setForm({ ...form, survey_photo: updated });
//   };

//   const addPhoto = () => {
//     setForm((prev) => ({
//       ...prev,
//       survey_photo: [...prev.survey_photo, { file: null, title: "", description: "" }],
//     }));
//   };

//   const removePhoto = (index: number) => {
//     if (form.survey_photo.length <= 1) return;
//     setForm((prev) => ({
//       ...prev,
//       survey_photo: prev.survey_photo.filter((_, i) => i !== index),
//     }));
//   };

//   const handleSubmit = async () => {
//     const validPhotos = form.survey_photo.filter((p) => p.title.trim() && (p.file || p.imageId));
//     if (validPhotos.length === 0) {
//       toast({ variant: "destructive", title: "Validation", description: "At least one photo with a title is required." });
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       let newUploadedIds: number[] = [];
//       const newFiles = form.survey_photo.filter((p) => p.file);
//       if (newFiles.length > 0) {
//         const fd = new FormData();
//         newFiles.forEach((p) => fd.append("files", p.file!));
//         const uploadRes = await bpi.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
//         newUploadedIds = (uploadRes.data || []).map((img: any) => img.id);
//       }

//       let uploadIndex = 0;
//       const surveyPhotosPayload = form.survey_photo
//         .filter((p) => p.title.trim())
//         .map((p) => {
//           if (p.file) {
//             const imageId = newUploadedIds[uploadIndex++];
//             return { title: p.title, description: p.description, image: imageId };
//           }
//           return { title: p.title, description: p.description, image: p.imageId };
//         });

//       await api.put(`/surveys/${survey.documentId}`, {
//         data: {
//           Power_Available: form.Power_Available,
//           Socket_Working: form.Socket_Working,
//           Network_Available: form.Network_Available,
//           site_condition: form.site_condition,
//           site_description: form.site_description || undefined,
//           GPS_Latitude: parseFloat(form.GPS_Latitude) || null,
//           GPS_Longitude: parseFloat(form.GPS_Longitude) || null,
//           Remarks: form.Remarks,
//           sim_speeds: form.sim_speeds.map((s) => ({
//             provider:
//               s.provider === "airtel"
//                 ? "sim1"
//                 : s.provider === "jio"
//                   ? "sim2"
//                   : s.provider,
//             download_speed: s.download_speed,
//             upload_speed: s.upload_speed,
//             latency: s.latency,
//             ...(s.carrier_info && { carrier_info: s.carrier_info }),
//           })),
//           survey_photo: surveyPhotosPayload,
//         },
//       });

//       toast({ variant: "success", title: "Survey Updated", description: "Changes saved successfully." });
//       // View page expects location (booth) id, not survey id
//       const boothId = survey?.booth?.documentId ?? id;
//       router.push(`/surveys/${boothId}`);
//     } catch (err) {
//       console.error(err);
//       toast({ variant: "destructive", title: "Update Failed", description: "Please try again." });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   if (loading || !survey) {
//     return (
//       <PageLayout>
//         <div className="flex justify-center items-center min-h-[60vh]">
//           <Spin size="large" />
//         </div>
//       </PageLayout>
//     );
//   }

//   const booth = survey.booth;
//   const districtName = booth?.assembly?.district?.district_name || "—";
//   const assemblyName = booth?.assembly?.Assembly_Name || "—";

//   return (
//     <PageLayout>
//       <div className="max-w-4xl mx-auto p-6 pb-12">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//           <BackToLink href={`/surveys/${survey?.booth?.documentId ?? id}`} label="Back to Survey" />
//           <h1 className="text-2xl font-semibold text-gray-800">Edit Survey</h1>
//         </div>

//         <div className="space-y-8">
//           {/* Location (read-only) – same format as create */}
//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
//             <ModernCard>
//               <div className="flex items-center space-x-3 mb-4">
//                 <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
//                   <MapPin className="w-5 h-5 text-white" />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">Location</h3>
//                   <p className="text-sm text-gray-600">Survey is linked to this booth (read-only)</p>
//                 </div>
//               </div>
//               <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
//                 <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Selected location</p>
//                 <p className="text-gray-800 font-medium">
//                   {districtName} → {assemblyName} → {booth?.PS_Name}
//                   {booth?.PS_No != null && <span className="text-gray-600 font-normal"> (PS No: {booth.PS_No})</span>}
//                 </p>
//               </div>
//             </ModernCard>
//           </motion.div>

//           {/* Survey Details – same sections as create */}
//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
//             <ModernCard>
//               <div className="flex items-center space-x-3 mb-6">
//                 <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl">
//                   <ListChecks className="w-5 h-5 text-white" />
//                 </div>
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">Survey Details</h3>
//                   <p className="text-gray-600">Power, network, site condition, and documentation</p>
//                 </div>
//               </div>

//               <div className="space-y-6">
//                 {/* Power & Socket */}
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
//                     <Label className="text-sm font-medium text-gray-700">Power Available</Label>
//                     <Switch
//                       checked={form.Power_Available}
//                       onCheckedChange={(v) =>
//                         setForm({
//                           ...form,
//                           Power_Available: v,
//                           Socket_Working: v ? form.Socket_Working : false,
//                         })
//                       }
//                     />
//                   </div>
//                   {form.Power_Available && (
//                     <div className="flex items-center justify-between rounded-xl border border-yellow-200 p-4 bg-yellow-50/50">
//                       <Label className="text-sm font-medium text-gray-700">Socket Working</Label>
//                       <Switch
//                         checked={form.Socket_Working}
//                         onCheckedChange={(v) => setForm({ ...form, Socket_Working: v })}
//                       />
//                     </div>
//                   )}
//                 </div>

//                 {/* Network & Speed test */}
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
//                     <Label className="text-sm font-medium text-gray-700">Network Available</Label>
//                     <Switch
//                       checked={form.Network_Available}
//                       onCheckedChange={(v) =>
//                         setForm({
//                           ...form,
//                           Network_Available: v,
//                           sim_speeds: v
//                             ? form.sim_speeds
//                             : [
//                                 {
//                                   provider: "sim1",
//                                   download_speed: 0,
//                                   upload_speed: 0,
//                                   latency: 0,
//                                 },
//                                 {
//                                   provider: "sim2",
//                                   download_speed: 0,
//                                   upload_speed: 0,
//                                   latency: 0,
//                                 },
//                               ],
//                         })
//                       }
//                     />
//                   </div>
//                   {form.Network_Available && (
//                     <div className="rounded-xl border border-gray-200 p-4 space-y-4">
//                       <div>
//                         <Label className="text-sm font-medium text-gray-700">
//                           SIM Speed Test
//                         </Label>
//                         <p className="text-xs text-gray-500 mt-1">
//                           Switch to the SIM you want to test in your phone
//                           settings, then run the test. Only one test can run at
//                           a time.
//                         </p>
//                       </div>
//                       {form.sim_speeds.map((sim, index) => {
//                         const slotLabel =
//                           sim.provider === "sim1" ? "SIM 1" : "SIM 2";
//                         const displayLabel = sim.carrier_info
//                           ? `${slotLabel} (${sim.carrier_info})`
//                           : slotLabel;
//                         return (
//                           <div
//                             key={sim.provider}
//                             className="rounded-lg border border-gray-200 p-3"
//                           >
//                             <h4 className="font-semibold mb-2">
//                               {displayLabel}
//                             </h4>
//                             <Network3
//                               provider={sim.provider}
//                               disabled={
//                                 activeTestProvider !== null &&
//                                 activeTestProvider !== sim.provider
//                               }
//                               onStart={() =>
//                                 setActiveTestProvider(sim.provider)
//                               }
//                               onComplete={(data) => {
//                                 setForm((prev) => {
//                                   const updated = [...prev.sim_speeds];
//                                   updated[index] = {
//                                     provider: data.provider,
//                                     download_speed:
//                                       (data as any).download_speed ?? 0,
//                                     upload_speed:
//                                       (data as any).upload_speed ?? 0,
//                                     latency: (data as any).latency ?? 0,
//                                     ...((data as any).carrier_info && {
//                                       carrier_info: (data as any).carrier_info,
//                                     }),
//                                   };
//                                   return { ...prev, sim_speeds: updated };
//                                 });
//                                 setActiveTestProvider(null);
//                               }}
//                             />
//                             {(sim.download_speed > 0 ||
//                               sim.upload_speed > 0) && (
//                               <p className="text-sm mt-2 text-gray-600">
//                                 Current: Download {sim.download_speed} Mbps,
//                                 Upload {sim.upload_speed} Mbps, Latency{" "}
//                                 {sim.latency} ms
//                               </p>
//                             )}
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>

//                 {/* Site condition & description */}
//                 <div className="grid grid-cols-1 gap-4">
//                   <div className="space-y-2">
//                     <Label className="text-sm font-medium text-gray-700">Site Condition</Label>
//                     <Select
//                       value={form.site_condition}
//                       onValueChange={(v) => setForm({ ...form, site_condition: v })}
//                     >
//                       <SelectTrigger className="h-11 rounded-xl border-gray-200">
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="Good">Good</SelectItem>
//                         <SelectItem value="Average">Average</SelectItem>
//                         <SelectItem value="Poor">Poor</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div className="space-y-2">
//                     <Label className="text-sm font-medium text-gray-700">Site Description</Label>
//                     <Input
//                       value={form.site_description}
//                       onChange={(e) => setForm({ ...form, site_description: e.target.value })}
//                       placeholder="Describe the site condition..."
//                       className="rounded-xl min-h-[80px]"
//                     />
//                   </div>
//                 </div>

//                 {/* GPS */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div className="space-y-2">
//                     <Label className="text-sm font-medium text-gray-700">GPS Latitude</Label>
//                     <Input
//                       value={form.GPS_Latitude}
//                       onChange={(e) => setForm({ ...form, GPS_Latitude: e.target.value })}
//                       placeholder="e.g., 26.9124"
//                       className="rounded-xl"
//                     />
//                   </div>
//                   <div className="space-y-2">
//                     <Label className="text-sm font-medium text-gray-700">GPS Longitude</Label>
//                     <Input
//                       value={form.GPS_Longitude}
//                       onChange={(e) => setForm({ ...form, GPS_Longitude: e.target.value })}
//                       placeholder="e.g., 75.7873"
//                       className="rounded-xl"
//                     />
//                   </div>
//                 </div>

//                 {/* Photo documentation */}
//                 <div className="space-y-3">
//                   <Label className="text-sm font-medium text-gray-700">Photo Documentation</Label>
//                   {form.survey_photo.map((photo, index) => (
//                     <PhotoEntryEdit
//                       key={index}
//                       index={index}
//                       photo={photo}
//                       onChange={(field, value) => updatePhoto(index, field, value)}
//                       onFileChange={(file) => updatePhotoFile(index, file)}
//                       onRemove={() => removePhoto(index)}
//                     />
//                   ))}
//                   <Button type="button" variant="outline" className="rounded-xl w-full" onClick={addPhoto}>
//                     <Plus className="w-4 h-4 mr-2" />
//                     Add Photo
//                   </Button>
//                 </div>

//                 {/* Remarks */}
//                 <div className="space-y-2">
//                   <Label className="text-sm font-medium text-gray-700">Remarks</Label>
//                   <Input
//                     value={form.Remarks}
//                     onChange={(e) => setForm({ ...form, Remarks: e.target.value })}
//                     placeholder="Optional remarks..."
//                     className="rounded-xl min-h-[60px]"
//                   />
//                 </div>

//                 {/* Actions */}
//                 <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
//                   <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push(`/surveys/${survey?.booth?.documentId ?? id}`)}>
//                     Cancel
//                   </Button>
//                   <Button type="button" variant="primary" className="rounded-xl" disabled={isSubmitting} onClick={handleSubmit}>
//                     {isSubmitting ? "Updating..." : "Update Survey"}
//                   </Button>
//                 </div>
//               </div>
//             </ModernCard>
//           </motion.div>
//         </div>
//       </div>
//     </PageLayout>
//   );
// }


import EditSurveyPage from "@/components/survey/Editsurvey";
import React from "react";

const page = () => {
  return (
    <div>
      <EditSurveyPage />
    </div>
  );
};

export default page;
