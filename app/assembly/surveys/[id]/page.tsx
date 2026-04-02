// "use client";

// import React, { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import {
//   Button,
//   Spin,
//   Modal,
//   Input,
//   Switch,
//   Select,
//   message,
//   Image,
// } from "antd";
// import {
//   ArrowLeft,
//   Edit3,
//   X,
//   Upload,
//   Plus,
//   MapPin,
//   Calendar,
//   SignalMedium,
//   SignalHigh,
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import dayjs from "dayjs";
// import bpi from "@/lib/bpi";
// import api from "@/lib/api";

// // ... (Interfaces remain the same as your original code)

// export default function SurveyDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const { toast } = useToast();
//   const [survey, setSurvey] = useState<any | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [districtCoordinator, setDistrictCoordinator] = useState<any | null>(
//     null,
//   );

//   const baseurl = process.env.NEXT_PUBLIC_BACKEND_URL;

//   // Edit form state
//   const [editForm, setEditForm] = useState<any>({
//     Power_Available: false,
//     Network_Available: false,
//     site_condition: "Good",
//     GPS_Latitude: "",
//     GPS_Longitude: "",
//     Remarks: "",
//     survey_date: dayjs(),
//     airtel_signal: 0,
//     jio_signal: 0,
//     survey_photo: [],
//   });

//   const addPhotoEntry = () => {
//     setEditForm((prev) => ({
//       ...prev,
//       survey_photo: [
//         ...prev.survey_photo,
//         { file: null, title: "", description: "", originalImage: null },
//       ],
//     }));
//   };

//   const updatePhotoField = (
//     index: number,
//     field: keyof (typeof editForm.survey_photo)[0],
//     value: string | File | null,
//   ) => {
//     setEditForm((prev) => {
//       const updated = [...prev.survey_photo];
//       updated[index] = { ...updated[index], [field]: value };
//       return { ...prev, survey_photo: updated };
//     });
//   };

//   const removePhotoEntry = (index: number) => {
//     setEditForm((prev) => ({
//       ...prev,
//       survey_photo: prev.survey_photo.filter((_, i) => i !== index),
//     }));
//   };

//   const handleEditSubmit = async () => {
//     setIsSubmitting(true);
//     try {
//       // 1️⃣ Upload new photos (if any file selected)
//       const newPhotos = editForm.survey_photo.filter((p) => p.file);
//       let uploadedIds: number[] = [];

//       if (newPhotos.length > 0) {
//         const formData = new FormData();
//         newPhotos.forEach((p) => formData.append("files", p.file!));
//         const uploadRes = await bpi.post("/upload", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//         uploadedIds = uploadRes.data.map((img: any) => img.id);
//       }

//       // 2️⃣ Build updated survey_photo payload
//       const updatedPhotos = editForm.survey_photo.map((p) => {
//         if (p.file) {
//           // New photo → use newly uploaded media ID
//           return {
//             title: p.title,
//             description: p.description,
//             image: uploadedIds.length > 0 ? uploadedIds.shift() : null,
//           };
//         } else {
//           // Existing photo → find original image ID from fetched survey
//           const originalPhoto = survey?.survey_photo?.find(
//             (sp) => sp.id === p.id,
//           );
//           return {
//             title: p.title,
//             description: p.description,
//             // prefer any originalImage present on the entry, otherwise fall back to fetched data
//             image:
//               (p as any).originalImage?.id || originalPhoto?.image?.id || null,
//           };
//         }
//       });

//       // 3️⃣ Update survey
//       await api.put(`/surveys/${survey!.documentId}`, {
//         data: {
//           Power_Available: editForm.Power_Available,
//           Network_Available: editForm.Network_Available,
//           site_condition: editForm.site_condition,
//           GPS_Latitude: parseFloat(editForm.GPS_Latitude) || null,
//           GPS_Longitude: parseFloat(editForm.GPS_Longitude) || null,
//           Remarks: editForm.Remarks,
//           survey_date: editForm.survey_date.toISOString(),
//           airtel_signal: editForm.airtel_signal,
//           jio_signal: editForm.jio_signal,
//           survey_photo: updatedPhotos,
//         },
//       });

//       toast({
//         variant: "success",
//         title: "Updated",
//         description: "Survey updated successfully.",
//       });
//       setIsEditModalOpen(false);
//       fetchSurvey(); // refresh
//     } catch (err) {
//       console.error("Update error:", err);
//       toast({
//         variant: "destructive",
//         title: "Failed",
//         description: "Could not update survey.",
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const fetchSurvey = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get("/surveys", {
//         params: {
//           "filters[documentId][$eq]": id,
//           "populate[booth]": true,
//           "populate[booth][populate][assembly]": true,
//           "populate[booth][populate][assembly][populate][district]": true,
//           "populate[booth][populate][assembly][populate][assembly_coordinator]": true,
//           "populate[raised_by]": true,
//           "populate[survey_photo][populate][image]": true,
//         },
//       });

//       if (res.data.data.length === 0) {
//         message.error("Survey not found.");
//         router.push("/assembly/surveys");
//         return;
//       }

//       const data = res.data.data[0];
//       setSurvey(data);

//       const districtDocId = data.booth?.assembly?.district?.documentId;
//       if (districtDocId) fetchDistrictCoordinator(districtDocId);

//       setEditForm({
//         Power_Available: data.Power_Available,
//         Network_Available: data.Network_Available,
//         site_condition: data.site_condition,
//         GPS_Latitude: data.GPS_Latitude?.toString() || "",
//         GPS_Longitude: data.GPS_Longitude?.toString() || "",
//         Remarks: data.Remarks,
//         survey_date: dayjs(data.survey_date),
//         airtel_signal: data.airtel_signal,
//         jio_signal: data.jio_signal,
//         survey_photo: (data.survey_photo || []).map((p: any) => ({
//           id: p.id,
//           file: null,
//           title: p.title || "",
//           description: p.description || "",
//           originalImage: p.image ? { id: p.image.id, url: p.image.url } : null,
//         })),
//       });
//     } catch (err) {
//       console.error(err);
//       router.push("/surveys");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDistrictCoordinator = async (districtDocumentId: string) => {
//     try {
//       const res = await api.get(`/districts/${districtDocumentId}`, {
//         params: { "populate[district_coordinator]": true },
//       });
//       setDistrictCoordinator(res.data.data?.district_coordinator || null);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   useEffect(() => {
//     if (id) fetchSurvey();
//   }, [id]);

//   // Helper for Signal Icons
//   const SignalIcon = ({ strength }: { strength: number }) => (
//     <div className="flex items-end gap-0.5 h-4">
//       {[1, 2, 3, 4, 5].map((bar) => (
//         <div
//           key={bar}
//           className={`w-1 rounded-t-sm ${bar <= strength ? "bg-black" : "bg-gray-200"}`}
//           style={{ height: `${bar * 20}%` }}
//         />
//       ))}
//     </div>
//   );

//   const handleMarkCompleted = () => {
//     Modal.confirm({
//       title: "Mark Survey as Completed?",
//       content:
//         "Once marked as completed, this survey will be locked and treated as final. Do you want to continue?",
//       okText: "Yes, Mark Completed",
//       cancelText: "Cancel",
//       okType: "danger",
//       onOk: async () => {
//         try {
//           await api.put(`/surveys/${survey!.documentId}`, {
//             data: {
//               state: "Completed",
//             },
//           });

//           message.success("Survey marked as completed");

//           fetchSurvey(); // 🔄 refresh UI
//         } catch (err) {
//           console.error(err);
//           message.error("Failed to mark survey as completed");
//         }
//       },
//     });
//   };

//   if (loading)
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <Spin size="large" />
//       </div>
//     );
//   if (!survey) return null;

//   return (
//     <div className="min-h-screen bg-white font-sans text-slate-900">
//       <div className="max-w-6xl mx-auto px-6 py-8">
//         {survey.state === "Completed" && (
//           <span className="ml-3 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
//             Completed
//           </span>
//         )}

//         {/* --- Top Navigation --- */}
//         <button
//           onClick={() => router.back()}
//           className="flex items-center text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4 mr-1" /> Back to surveys
//         </button>

//         {/* --- Header Section --- */}
//         <div className="flex justify-between items-start mb-8">
//           <div>
//             <h1 className="text-3xl font-semibold text-slate-800 mb-1">
//               {survey.booth.PS_Name}
//             </h1>
//             <div className="flex items-center text-slate-500 text-sm">
//               <MapPin className="w-3.5 h-3.5 mr-1" />
//               {survey.booth.PS_No}
//             </div>
//           </div>
//           <div className="flex gap-3">
//             <Button
//               onClick={() => setIsEditModalOpen(true)}
//               className="flex items-center bg-[#1a1a1a] hover:bg-black text-white border-none h-10 px-6 rounded-md"
//             >
//               <Edit3 className="w-4 h-4 mr-2" /> Edit
//             </Button>

//             {survey.state !== "Completed" && (
//               <Button
//                 type="primary"
//                 danger
//                 onClick={() => handleMarkCompleted()}
//                 className="h-10 px-6"
//               >
//                 Mark as Completed
//               </Button>
//             )}
//           </div>
//         </div>

//         <hr className="border-slate-100 mb-8" />

//         {/* --- Stats Row --- */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
//           <div>
//             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
//               Assembly
//             </p>
//             <p className="text-sm font-medium">
//               {survey.booth?.assembly
//                 ? `${survey.booth.assembly.Assembly_No} - ${survey.booth.assembly.Assembly_Name}`
//                 : "—"}
//             </p>
//           </div>
//           <div>
//             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
//               District
//             </p>
//             <p className="text-sm font-medium">
//               {survey.booth?.assembly?.district?.district_name || "—"}
//             </p>
//           </div>
//           <div>
//             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
//               Survey Date
//             </p>
//             <div className="flex items-center text-sm font-medium">
//               <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
//               {dayjs(survey.survey_date).format("MMM DD, YYYY")}
//             </div>
//           </div>
//           <div>
//             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
//               Site Condition
//             </p>
//             <p className="text-sm font-medium">{survey.site_condition}</p>
//           </div>
//         </div>

//         <hr className="border-slate-100 mb-8" />

//         {/* --- Coordinator Section --- */}
//         <div className="mb-10">
//           <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3">
//             Coordinator
//           </p>
//           <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 max-w-md">
//             <p className="font-semibold text-slate-800">
//               {districtCoordinator?.username || "Not Assigned"}
//             </p>
//             <p className="text-sm text-slate-500">
//               {districtCoordinator?.email || ""}
//             </p>
//           </div>
//         </div>

//         {/* --- Infrastructure & Signal --- */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-10">
//           <div>
//             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-4">
//               Infrastructure
//             </p>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center max-w-xs">
//                 <span className="text-sm text-slate-600">Power Available</span>
//                 <span className="text-sm font-bold text-slate-900">
//                   {survey.Power_Available ? "Yes" : "No"}
//                 </span>
//               </div>
//               <div className="flex justify-between items-center max-w-xs">
//                 <span className="text-sm text-slate-600">
//                   Network Available
//                 </span>
//                 <span className="text-sm font-bold text-slate-900">
//                   {survey.Network_Available ? "Yes" : "No"}
//                 </span>
//               </div>
//             </div>
//           </div>

//           <div>
//             <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-4">
//               Signal Strength
//             </p>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center max-w-xs">
//                 <span className="text-sm text-slate-600">Airtel</span>
//                 <SignalIcon strength={survey.airtel_signal} />
//               </div>
//               <div className="flex justify-between items-center max-w-xs">
//                 <span className="text-sm text-slate-600">Jio</span>
//                 <SignalIcon strength={survey.jio_signal} />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* --- Location --- */}
//         <div className="mb-10">
//           <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3">
//             Location
//           </p>
//           <div className="flex items-center text-sm text-slate-700">
//             <MapPin className="w-4 h-4 mr-2 text-slate-400" />
//             {survey.GPS_Latitude}, {survey.GPS_Longitude}
//           </div>
//         </div>

//         {/* --- Remarks --- */}
//         <div className="mb-12">
//           <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-3">
//             Remarks
//           </p>
//           <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
//             {survey.Remarks || "No remarks provided."}
//           </p>
//         </div>

//         {/* --- Photos --- */}
//         <div>
//           <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-4">
//             Photos
//           </p>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//             {survey.survey_photo?.map((p: any) => (
//               <div key={p.id} className="group cursor-pointer">
//                 <div className="rounded-xl overflow-hidden mb-3 border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
//                   <Image
//                     src={`${baseurl}${p.image?.url}`}
//                     alt={p.title}
//                     className="w-1/2 object-cover"
//                     preview
//                   />
//                 </div>
//                 <p className="text-sm font-bold text-slate-900 mb-0.5">
//                   {p.title}
//                 </p>
//                 <p className="text-xs text-slate-500 line-clamp-2">
//                   {p.description}
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* --- Keep your existing Edit Modal Logic here --- */}
//       <Modal
//         title="Edit Survey"
//         open={isEditModalOpen}
//         onCancel={() => setIsEditModalOpen(false)}
//         footer={null}
//         width={700}
//         centered
//       >
//         <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
//           <div className="flex justify-between">
//             <span>Power Available</span>
//             <Switch
//               checked={editForm.Power_Available}
//               onChange={(val) =>
//                 setEditForm({ ...editForm, Power_Available: val })
//               }
//             />
//           </div>
//           <div className="flex justify-between">
//             <span>Network Available</span>
//             <Switch
//               checked={editForm.Network_Available}
//               onChange={(val) =>
//                 setEditForm({ ...editForm, Network_Available: val })
//               }
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">
//               Site Condition
//             </label>
//             <Select
//               style={{ width: "100%" }}
//               value={editForm.site_condition}
//               onChange={(val) =>
//                 setEditForm({ ...editForm, site_condition: val })
//               }
//             >
//               <Select.Option value="Good">Good</Select.Option>
//               <Select.Option value="Average">Average</Select.Option>
//               <Select.Option value="Poor">Poor</Select.Option>
//             </Select>
//           </div>

//           {/* Signal Strength */}
//           <div>
//             <label className="block text-sm font-medium mb-2">
//               📶 Mobile Network Signal Strength
//             </label>
//             <div className="space-y-3">
//               {(["Airtel", "Jio"] as const).map((provider) => {
//                 const current =
//                   provider === "Airtel"
//                     ? editForm.airtel_signal
//                     : editForm.jio_signal;
//                 return (
//                   <div
//                     key={provider}
//                     className="flex items-center justify-between border rounded-md px-3 py-2"
//                   >
//                     <span className="font-medium text-gray-700">
//                       {provider}
//                     </span>
//                     <div className="flex space-x-1">
//                       {[1, 2, 3, 4, 5].map((level) => (
//                         <div
//                           key={level}
//                           onClick={() =>
//                             setEditForm({
//                               ...editForm,
//                               ...(provider === "Airtel"
//                                 ? { airtel_signal: level }
//                                 : { jio_signal: level }),
//                             })
//                           }
//                           className={`w-4 h-4 cursor-pointer rounded-sm ${level <= current ? "bg-green-500" : "bg-gray-300"}`}
//                         />
//                       ))}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="block text-sm font-medium mb-1">
//                 GPS Latitude
//               </label>
//               <Input
//                 value={editForm.GPS_Latitude}
//                 onChange={(e) =>
//                   setEditForm({ ...editForm, GPS_Latitude: e.target.value })
//                 }
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1">
//                 GPS Longitude
//               </label>
//               <Input
//                 value={editForm.GPS_Longitude}
//                 onChange={(e) =>
//                   setEditForm({ ...editForm, GPS_Longitude: e.target.value })
//                 }
//               />
//             </div>
//           </div>

//           {/* Photo Entries */}
//           <div>
//             <label className="block text-sm font-medium mb-2">Photos</label>
//             <div className="space-y-3">
//               {editForm.survey_photo.map((photo, index) => (
//                 <div
//                   key={photo.id ?? `new-${index}`}
//                   className="border rounded p-3 bg-gray-50"
//                 >
//                   <div className="flex justify-between items-start mb-2">
//                     <span className="text-sm font-medium">
//                       Photo {index + 1}
//                     </span>
//                     {index > 0 && (
//                       <button
//                         type="button"
//                         onClick={() => removePhotoEntry(index)}
//                         className="text-red-500 hover:text-red-700"
//                       >
//                         <X className="w-4 h-4" />
//                       </button>
//                     )}
//                   </div>
//                   <Input
//                     placeholder="Title"
//                     value={photo.title}
//                     onChange={(e) =>
//                       updatePhotoField(index, "title", e.target.value)
//                     }
//                     className="mb-2"
//                   />
//                   <Input
//                     placeholder="Description"
//                     value={photo.description}
//                     onChange={(e) =>
//                       updatePhotoField(index, "description", e.target.value)
//                     }
//                     className="mb-2"
//                   />
//                   <div className="flex items-center gap-2">
//                     <label className="cursor-pointer flex items-center text-blue-600 text-sm">
//                       <Upload className="w-3 h-3 mr-1" />
//                       {photo.file
//                         ? "Change Image"
//                         : photo.originalImage
//                           ? "Replace Image"
//                           : "Choose Image"}
//                       <input
//                         type="file"
//                         accept="image/*"
//                         className="hidden"
//                         onChange={(e) => {
//                           const file = e.target.files?.[0] || null;
//                           updatePhotoField(index, "file", file);
//                         }}
//                       />
//                     </label>
//                     {photo.file && (
//                       <span className="text-xs text-gray-600 truncate max-w-[100px]">
//                         {photo.file.name}
//                       </span>
//                     )}
//                   </div>
//                   {photo.file ? (
//                     <div className="mt-2 w-24 h-24">
//                       <img
//                         src={URL.createObjectURL(photo.file)}
//                         alt="preview"
//                         className="w-full h-full object-cover rounded border"
//                       />
//                     </div>
//                   ) : photo.originalImage?.url ? (
//                     <div className="mt-2 w-24 h-24">
//                       <img
//                         src={`${baseurl}${photo.originalImage.url}`}
//                         alt="existing preview"
//                         className="w-full h-full object-cover rounded border"
//                       />
//                     </div>
//                   ) : (
//                     <div className="mt-2 text-xs text-gray-500">
//                       No image selected.
//                     </div>
//                   )}
//                 </div>
//               ))}
//               <Button
//                 htmlType="button"
//                 icon={<Plus className="w-4 h-4" />}
//                 onClick={addPhotoEntry}
//                 className="w-full mt-2"
//               >
//                 Add Photo
//               </Button>
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">Remarks</label>
//             <Input.TextArea
//               rows={3}
//               value={editForm.Remarks}
//               onChange={(e) =>
//                 setEditForm({ ...editForm, Remarks: e.target.value })
//               }
//             />
//           </div>

//           <div className="flex justify-end gap-3 pt-4">
//             <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
//             <Button
//               type="primary"
//               onClick={handleEditSubmit}
//               loading={isSubmitting}
//               className="bg-blue-500"
//             >
//               Save Changes
//             </Button>
//           </div>
//         </div>
//       </Modal>
//     </div>
//   );
// }

"use client";

import SurveydetailsPage from "@/components/survey/SurveyDetailView";
import { useParams } from "next/navigation";
import React from "react";

const page = () => {
  const { id } = useParams();

  return (
    <div>
      <SurveydetailsPage id={id as string} />
    </div>
  );
};

export default page;
