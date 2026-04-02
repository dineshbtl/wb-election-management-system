// "use client";

// import { Modal, Switch, Select, Input, message, Image } from "antd";
// import { Button } from "@/components/ui/button";
// import { X, Plus } from "lucide-react";
// import { useEffect, useState } from "react";
// import api from "@/lib/api";

// interface SurveyPhoto {
//   file?: File | null;
//   title: string;
//   description: string;
//   image?: any; // existing image
// }

// interface Props {
//   open: boolean;
//   survey: any;
//   onClose: () => void;
//   onSuccess?: () => void;
// }

// export default function EditSurveyModal({
//   open,
//   survey,
//   onClose,
//   onSuccess,
// }: Props) {
//   const [submitting, setSubmitting] = useState(false);

//   const [form, setForm] = useState<any>({
//     Power_Available: false,
//     Socket_Working: false, // ✅ ADD

//     Network_Available: false,
//     site_condition: "Good",
//     site_description: "",
//     GPS_Latitude: "",
//     GPS_Longitude: "",
//     Remarks: "",
//     airtel_signal: 0,
//     jio_signal: 0,
//     state: "Raised",
//     survey_photo: [],
//   });

//   /* 🔁 Prefill data */
//   useEffect(() => {
//     if (survey) {
//       setForm({
//         Power_Available: survey.Power_Available,
//         Socket_Working: survey.Socket_Working || false, // ✅ ADD
//         Network_Available: survey.Network_Available,
//         site_condition: survey.site_condition,
//         site_description: survey.site_description,
//         GPS_Latitude: survey.GPS_Latitude || "",
//         GPS_Longitude: survey.GPS_Longitude || "",
//         Remarks: survey.Remarks,
//         airtel_signal: survey.airtel_signal,
//         jio_signal: survey.jio_signal,
//         state: survey.state,
//         survey_photo:
//           survey.survey_photo?.map((p: any) => ({
//             title: p.title,
//             description: p.description,
//             image: p.image,
//             file: null,
//           })) || [],
//       });
//     }
//   }, [survey]);

//   /* 📸 Photo Helpers */
//   const addPhoto = () =>
//     setForm((p: any) => ({
//       ...p,
//       survey_photo: [
//         ...p.survey_photo,
//         { file: null, title: "", description: "" },
//       ],
//     }));

//   const updatePhoto = (index: number, field: string, value: any) => {
//     const updated = [...form.survey_photo];
//     updated[index][field] = value;
//     setForm({ ...form, survey_photo: updated });
//   };

//   const removePhoto = (index: number) => {
//     const updated = form.survey_photo.filter(
//       (_: any, i: number) => i !== index,
//     );
//     setForm({ ...form, survey_photo: updated });
//   };

//   /* 🚀 Submit Update */
//   const handleUpdate = async () => {
//     setSubmitting(true);
//     try {
//       let newUploadedIds: number[] = [];

//       // Upload new files
//       const newFiles = form.survey_photo.filter((p: any) => p.file);

//       if (newFiles.length > 0) {
//         const fd = new FormData();
//         newFiles.forEach((p: any) => fd.append("files", p.file));

//         const uploadRes = await api.post("/upload", fd);
//         newUploadedIds = uploadRes.data.map((img: any) => img.id);
//       }

//       // Build final photo payload
//       let uploadIndex = 0;

//       const finalPhotos = form.survey_photo.map((p: any) => {
//         if (p.file) {
//           const imageId = newUploadedIds[uploadIndex++];
//           return {
//             title: p.title,
//             description: p.description,
//             image: imageId,
//           };
//         } else {
//           return {
//             title: p.title,
//             description: p.description,
//             image: p.image?.id,
//           };
//         }
//       });

//       await api.put(`/surveys/${survey.documentId}`, {
//         data: {
//           Power_Available: form.Power_Available,
//           Socket_Working: form.Socket_Working, // ✅ ADD HERE
//           Network_Available: form.Network_Available,
//           site_condition: form.site_condition,
//           site_description: form.site_description,
//           GPS_Latitude: parseFloat(form.GPS_Latitude) || null,
//           GPS_Longitude: parseFloat(form.GPS_Longitude) || null,
//           Remarks: form.Remarks,
//           airtel_signal: form.airtel_signal,
//           jio_signal: form.jio_signal,
//           state: form.state,
//           survey_photo: finalPhotos,
//         },
//       });

//       message.success("Survey updated successfully");
//       onSuccess?.();
//       onClose();
//     } catch (err) {
//       console.error(err);
//       message.error("Failed to update survey");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <Modal
//       title="Edit Survey"
//       open={open}
//       onCancel={onClose}
//       footer={null}
//       centered
//     >
//       <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
//         {/* Power Available */}
//         <div className="flex justify-between items-center">
//           <label className="text-sm font-semibold text-gray-700">
//             Power Available
//           </label>
//           <Switch
//             checked={form.Power_Available}
//             onChange={(v) =>
//               setForm({
//                 ...form,
//                 Power_Available: v,
//                 Socket_Working: v ? form.Socket_Working : false, // reset if power off
//               })
//             }
//           />
//         </div>

//         {form.Power_Available && (
//           <div className="flex justify-between items-center bg-yellow-50 border rounded px-3 py-2">
//             <label className="text-sm font-semibold text-gray-700">
//               Socket Working
//             </label>
//             <Switch
//               checked={form.Socket_Working}
//               onChange={(v) =>
//                 setForm({
//                   ...form,
//                   Socket_Working: v,
//                 })
//               }
//             />
//           </div>
//         )}

//         {/* Network Available */}
//         <div className="flex justify-between items-center">
//           <label className="text-sm font-semibold text-gray-700">
//             Network Available
//           </label>
//           <Switch
//             checked={form.Network_Available}
//             onChange={(v) => setForm({ ...form, Network_Available: v })}
//           />
//         </div>

//         {/* Site Condition */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-gray-700">
//             Site Condition
//           </label>
//           <Select
//             value={form.site_condition}
//             style={{ width: "100%" }}
//             onChange={(v) => setForm({ ...form, site_condition: v })}
//           >
//             <Select.Option value="Good">Good</Select.Option>
//             <Select.Option value="Average">Average</Select.Option>
//             <Select.Option value="Poor">Poor</Select.Option>
//           </Select>
//         </div>

//         {/* Site Description */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-gray-700">
//             Site Description
//           </label>
//           <Input.TextArea
//             rows={3}
//             value={form.site_description}
//             onChange={(e) =>
//               setForm({ ...form, site_description: e.target.value })
//             }
//             placeholder="Enter detailed site description..."
//           />
//         </div>

//         {/* GPS Coordinates */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-gray-700">
//             GPS Coordinates
//           </label>
//           <div className="grid grid-cols-2 gap-3">
//             <div>
//               <label className="text-xs text-gray-600 block mb-1">
//                 Latitude
//               </label>
//               <Input
//                 placeholder="e.g., 26.9124"
//                 value={form.GPS_Latitude}
//                 onChange={(e) =>
//                   setForm({ ...form, GPS_Latitude: e.target.value })
//                 }
//               />
//             </div>
//             <div>
//               <label className="text-xs text-gray-600 block mb-1">
//                 Longitude
//               </label>
//               <Input
//                 placeholder="e.g., 75.7873"
//                 value={form.GPS_Longitude}
//                 onChange={(e) =>
//                   setForm({ ...form, GPS_Longitude: e.target.value })
//                 }
//               />
//             </div>
//           </div>
//         </div>

//         {/* Signal Strength */}
//         <div className="grid grid-cols-2 gap-3">
//           <div className="space-y-2">
//             <label className="text-sm font-semibold text-gray-700">
//               Airtel Signal
//             </label>
//             <Input
//               type="number"
//               min="0"
//               max="5"
//               value={form.airtel_signal}
//               onChange={(e) =>
//                 setForm({
//                   ...form,
//                   airtel_signal: parseInt(e.target.value) || 0,
//                 })
//               }
//               placeholder="0-5"
//             />
//           </div>
//           <div className="space-y-2">
//             <label className="text-sm font-semibold text-gray-700">
//               Jio Signal
//             </label>
//             <Input
//               type="number"
//               min="0"
//               max="5"
//               value={form.jio_signal}
//               onChange={(e) =>
//                 setForm({ ...form, jio_signal: parseInt(e.target.value) || 0 })
//               }
//               placeholder="0-5"
//             />
//           </div>
//         </div>

//         {/* Remarks */}
//         <div className="space-y-2">
//           <label className="text-sm font-semibold text-gray-700">Remarks</label>
//           <Input.TextArea
//             rows={2}
//             value={form.Remarks}
//             onChange={(e) => setForm({ ...form, Remarks: e.target.value })}
//             placeholder="Add any additional remarks..."
//           />
//         </div>

//         {/* Photos */}
//         {form.survey_photo.length > 0 && (
//           <div className="space-y-3 border-t pt-4">
//             <label className="text-sm font-semibold text-gray-700 block">
//               Survey Photos
//             </label>
//             {form.survey_photo.map((p: any, i: number) => (
//               <div
//                 key={i}
//                 className="border rounded-lg p-4 bg-gray-50 space-y-3"
//               >
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-xs font-semibold text-gray-600">
//                     Photo {i + 1}
//                   </span>
//                   <X
//                     className="text-red-500 cursor-pointer hover:text-red-700"
//                     size={18}
//                     onClick={() => removePhoto(i)}
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-600 block mb-1">
//                     Title
//                   </label>
//                   <Input
//                     value={p.title}
//                     onChange={(e) => updatePhoto(i, "title", e.target.value)}
//                     placeholder="Enter photo title..."
//                   />
//                 </div>

//                 <div>
//                   <label className="text-xs text-gray-600 block mb-1">
//                     Description
//                   </label>
//                   <Input
//                     value={p.description}
//                     onChange={(e) =>
//                       updatePhoto(i, "description", e.target.value)
//                     }
//                     placeholder="Enter photo description..."
//                   />
//                 </div>

//                 {p.image?.url && (
//                   <div className="mt-2">
//                     <label className="text-xs text-gray-600 block mb-1">
//                       Current Image
//                     </label>
//                     <Image
//                       src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${p.image.url}`}
//                       width={100}
//                       className="rounded border"
//                     />
//                   </div>
//                 )}

//                 <div>
//                   <label className="text-xs text-gray-600 block mb-1">
//                     Upload New Image
//                   </label>
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={(e) =>
//                       updatePhoto(i, "file", e.target.files?.[0] || null)
//                     }
//                     className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
//                   />
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         <Button onClick={addPhoto} variant="outline" className="w-full">
//           <Plus className="w-4 h-4 mr-2" />
//           Add Photo
//         </Button>
//       </div>

//       <div className="flex justify-end gap-3 pt-4 border-t mt-4">
//         <Button variant="outline" onClick={onClose}>
//           Cancel
//         </Button>
//         <Button
//           onClick={handleUpdate}
//           disabled={submitting}
//           className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
//         >
//           {submitting ? "Updating..." : "Update Survey"}
//         </Button>
//       </div>
//     </Modal>
//   );
// }

"use client";

import { Modal, Switch, Select, Input, message, Image } from "antd";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { uploadSurveyPhotos, updateSurvey } from "@/lib/survey-api";
import Network3 from "./Network3";

interface SurveyPhoto {
  file?: File | null;
  title: string;
  description: string;
  image?: any; // existing image
}

interface Props {
  open: boolean;
  survey: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditSurveyModal({
  open,
  survey,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    Power_Available: false,
    Socket_Working: false, // ✅ ADD

    Network_Available: false,
    site_condition: "Good",
    site_description: "",
    GPS_Latitude: "",
    GPS_Longitude: "",
    Remarks: "",
    sim_speeds: [],

    state: "Raised",
    survey_photo: [],
  });

  /* 🔁 Prefill data */
  useEffect(() => {
    if (survey) {
      setForm({
        Power_Available: survey.Power_Available,
        Socket_Working: survey.Socket_Working || false, // ✅ ADD
        Network_Available: survey.Network_Available,
        site_condition: survey.site_condition,
        site_description: survey.site_description,
        GPS_Latitude: survey.GPS_Latitude || "",
        GPS_Longitude: survey.GPS_Longitude || "",
        Remarks: survey.Remarks,
        sim_speeds: survey.sim_speeds || [],
        state: survey.state,
        survey_photo:
          survey.survey_photo?.map((p: any) => ({
            title: p.title,
            description: p.description,
            image: p.image,
            file: null,
          })) || [],
      });
    }
  }, [survey]);

  /* 📸 Photo Helpers */
  const addPhoto = () =>
    setForm((p: any) => ({
      ...p,
      survey_photo: [
        ...p.survey_photo,
        { file: null, title: "", description: "" },
      ],
    }));

  const updatePhoto = (index: number, field: string, value: any) => {
    const updated = [...form.survey_photo];
    updated[index][field] = value;
    setForm({ ...form, survey_photo: updated });
  };

  const removePhoto = (index: number) => {
    const updated = form.survey_photo.filter(
      (_: any, i: number) => i !== index,
    );
    setForm({ ...form, survey_photo: updated });
  };

  /* 🚀 Submit Update */
  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      let newUploadedIds: number[] = [];

      // Upload new files (uses api client — no hard timeout)
      const newFiles = form.survey_photo.filter((p: any) => p.file);

      if (newFiles.length > 0) {
        const fd = new FormData();
        newFiles.forEach((p: any) => fd.append("files", p.file));
        newUploadedIds = await uploadSurveyPhotos(fd);
      }

      // Build final photo payload
      let uploadIndex = 0;

      const finalPhotos = form.survey_photo.map((p: any) => {
        if (p.file) {
          const imageId = newUploadedIds[uploadIndex++];
          return {
            title: p.title,
            description: p.description,
            image: imageId,
          };
        } else {
          return {
            title: p.title,
            description: p.description,
            image: p.image?.id,
          };
        }
      });

      await updateSurvey(survey.documentId, {
        booth: survey.booth?.documentId ?? "",
        raised_by: survey.raised_by?.documentId ?? "",
        survey_date: survey.survey_date ?? new Date().toISOString(),
        Power_Available: form.Power_Available,
        Socket_Working: form.Socket_Working,
        Network_Available: form.Network_Available,
        site_condition: form.site_condition,
        site_description: form.site_description,
        GPS_Latitude: parseFloat(form.GPS_Latitude) || null,
        GPS_Longitude: parseFloat(form.GPS_Longitude) || null,
        sim_speeds: form.sim_speeds.map((s: any) => ({
          provider:
            s.provider === "airtel" ? "sim1" : s.provider === "jio" ? "sim2" : s.provider,
          download_speed: s.download_speed,
          upload_speed: s.upload_speed,
          latency: s.latency,
          ...(s.carrier_info && { carrier_info: s.carrier_info }),
        })),
        Remarks: form.Remarks,
        state: form.state,
        survey_photo: finalPhotos,
      });

      message.success("Survey updated successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      message.error("Failed to update survey");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Edit Survey"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-2">
        {/* Power Available */}
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">
            Power Available
          </label>
          <Switch
            checked={form.Power_Available}
            onChange={(v) =>
              setForm({
                ...form,
                Power_Available: v,
                Socket_Working: v ? form.Socket_Working : false, // reset if power off
              })
            }
          />
        </div>

        {form.Power_Available && (
          <div className="flex justify-between items-center bg-yellow-50 border rounded px-3 py-2">
            <label className="text-sm font-semibold text-gray-700">
              Socket Working
            </label>
            <Switch
              checked={form.Socket_Working}
              onChange={(v) =>
                setForm({
                  ...form,
                  Socket_Working: v,
                })
              }
            />
          </div>
        )}

        {/* Network Available */}
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">
            Network Available
          </label>
          <Switch
            checked={form.Network_Available}
            onChange={(v) => setForm({ ...form, Network_Available: v })}
          />
        </div>

        {form.Network_Available && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                SIM Speed Test
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Switch to the SIM you want to test, then run the test. Only one
                test can run at a time.
              </p>
            </div>

            {[
              { slot: "sim1", label: "SIM 1" },
              { slot: "sim2", label: "SIM 2" },
            ].map(({ slot, label }) => {
              const existing = form.sim_speeds?.find(
                (s: any) =>
                  s.provider === slot ||
                  (slot === "sim1" && s.provider === "airtel") ||
                  (slot === "sim2" && s.provider === "jio"),
              );

              const hasSpeed =
                existing &&
                (existing.download_speed > 0 || existing.upload_speed > 0);
              const displayLabel = existing?.carrier_info
                ? `${label} (${existing.carrier_info})`
                : label;

              return (
                <div
                  key={slot}
                  className="border rounded-lg p-3 bg-gray-50 space-y-2"
                >
                  <h4 className="font-semibold">{displayLabel}</h4>

                  {hasSpeed && testingProvider !== slot && (
                    <>
                      <p className="text-sm">
                        Download: {existing.download_speed} Mbps
                      </p>
                      <p className="text-sm">
                        Upload: {existing.upload_speed} Mbps
                      </p>
                      <p className="text-sm">Latency: {existing.latency} ms</p>
                      {existing.carrier_info && (
                        <p className="text-xs text-gray-500">
                          Detected: {existing.carrier_info}
                        </p>
                      )}

                      <Button
                        size="sm"
                        className="bg-yellow-500 text-white"
                        onClick={() => setTestingProvider(slot)}
                      >
                        Retest
                      </Button>
                    </>
                  )}

                  {!hasSpeed && testingProvider !== slot && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] text-white border-0"
                      onClick={() => setTestingProvider(slot)}
                    >
                      Start Test
                    </Button>
                  )}

                  {testingProvider === slot && (
                    <Network3
                      provider={slot}
                      onComplete={(data) => {
                        setForm((prev: any) => {
                          const others =
                            prev.sim_speeds?.filter(
                              (s: any) =>
                                s.provider !== slot &&
                                s.provider !==
                                  (slot === "sim1" ? "airtel" : "jio"),
                            ) || [];

                          return {
                            ...prev,
                            sim_speeds: [
                              ...others,
                              {
                                provider: slot,
                                download_speed: data.download_speed,
                                upload_speed: data.upload_speed,
                                latency: data.latency,
                                ...(data.carrier_info && {
                                  carrier_info: data.carrier_info,
                                }),
                              },
                            ],
                          };
                        });

                        setTestingProvider(null);
                        message.success(`${label} speed updated`);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Site Condition */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Site Condition
          </label>
          <Select
            value={form.site_condition}
            style={{ width: "100%" }}
            onChange={(v) => setForm({ ...form, site_condition: v })}
          >
            <Select.Option value="Good">Good</Select.Option>
            <Select.Option value="Average">Average</Select.Option>
            <Select.Option value="Poor">Poor</Select.Option>
          </Select>
        </div>

        {/* Site Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Site Description
          </label>
          <Input.TextArea
            rows={3}
            value={form.site_description}
            onChange={(e) =>
              setForm({ ...form, site_description: e.target.value })
            }
            placeholder="Enter detailed site description..."
          />
        </div>

        {/* GPS Coordinates */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            GPS Coordinates
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">
                Latitude
              </label>
              <Input
                placeholder="e.g., 26.9124"
                value={form.GPS_Latitude}
                onChange={(e) =>
                  setForm({ ...form, GPS_Latitude: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">
                Longitude
              </label>
              <Input
                placeholder="e.g., 75.7873"
                value={form.GPS_Longitude}
                onChange={(e) =>
                  setForm({ ...form, GPS_Longitude: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Remarks</label>
          <Input.TextArea
            rows={2}
            value={form.Remarks}
            onChange={(e) => setForm({ ...form, Remarks: e.target.value })}
            placeholder="Add any additional remarks..."
          />
        </div>

        {/* Photos */}
        {form.survey_photo.length > 0 && (
          <div className="space-y-3  pt-4">
            <label className="text-sm font-semibold text-gray-700 block">
              Survey Photos
            </label>
            {form.survey_photo.map((p: any, i: number) => (
              <div
                key={i}
                className="border rounded-lg p-4 bg-gray-50 space-y-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-600">
                    Photo {i + 1}
                  </span>
                  <X
                    className="text-red-500 cursor-pointer hover:text-red-700"
                    size={18}
                    onClick={() => removePhoto(i)}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Title
                  </label>
                  <Input
                    value={p.title}
                    onChange={(e) => updatePhoto(i, "title", e.target.value)}
                    placeholder="Enter photo title..."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Description
                  </label>
                  <Input
                    value={p.description}
                    onChange={(e) =>
                      updatePhoto(i, "description", e.target.value)
                    }
                    placeholder="Enter photo description..."
                  />
                </div>

                {p.image?.url && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600 block mb-1">
                      Current Image
                    </label>
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${p.image.url}`}
                      width={100}
                      className="rounded border"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Upload New Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      updatePhoto(i, "file", e.target.files?.[0] || null)
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={addPhoto} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Photo
        </Button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleUpdate}
          disabled={submitting}
          className="bg-gradient-to-r from-[#3A8DFF] to-[#2196F3] hover:from-[#2d7ae8] hover:to-[#1976D2] text-white border-0"
        >
          {submitting ? "Updating..." : "Update Survey"}
        </Button>
      </div>
    </Modal>
  );
}
