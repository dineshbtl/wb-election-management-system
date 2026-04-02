// "use client";

// import React, { useEffect, useState } from "react";
// import { Modal, Input, Upload, message, Spin } from "antd";
// import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
// import { Button } from "@/components/ui/button";
// import axios from "axios";
// import api from "@/lib/api";

// interface Props {
//   open: boolean;
//   onClose: () => void;
//   profile: any;
//   onUpdated: (updatedProfile: any) => void;
// }

// export default function EditProfileModal({
//   open,
//   onClose,
//   profile,
//   onUpdated,
// }: Props) {
//   const API_URL = process.env.NEXT_PUBLIC_API_URL;
//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   const [loading, setLoading] = useState(false);
//   const [photoFile, setPhotoFile] = useState<File | null>(null);
//   const [removePhoto, setRemovePhoto] = useState(false);

//   const [form, setForm] = useState<any>({
//     Full_Name: "",
//     Phone_Number: "",
//     State: "",
//     District: "",
//     Assembly: "",
//     Village: "",
//     Father_Name: "",
//     Mother_Name: "",
//     Bank_or_UPI: "",
//     Pincode: "",
//     address: "",
//   });

//   /* -------------------- LOAD PROFILE -------------------- */
//   useEffect(() => {
//     if (!profile) return;

//     setForm({
//       Full_Name: profile.Full_Name || "",
//       Phone_Number: profile.Phone_Number || "",
//       State: profile.State || "",
//       District: profile.District || "",
//       Assembly: profile.Assembly || "",
//       Village: profile.Village || "",
//       Father_Name: profile.Father_Name || "",
//       Mother_Name: profile.Mother_Name || "",
//       Bank_or_UPI: profile.Bank_or_UPI || "",
//       Pincode: profile.Pincode || "",
//       address: profile.address || "",
//     });

//     setPhotoFile(null);
//     setRemovePhoto(false);
//   }, [profile]);

//   /* -------------------- SUBMIT -------------------- */
//   const handleSubmit = async () => {
//     try {
//       setLoading(true);

//       // Case 1: No photo changes - use simple JSON body
//       if (!photoFile && !removePhoto) {
//         const response = await axios.put(
//           `${API_URL}/app-users/${profile.documentId}`,
//           {
//             data: {
//               Full_Name: form.Full_Name,
//               Phone_Number: form.Phone_Number,
//               State: form.State,
//               District: form.District,
//               Assembly: form.Assembly,
//               Village: form.Village,
//               Father_Name: form.Father_Name,
//               Mother_Name: form.Mother_Name,
//               Bank_or_UPI: form.Bank_or_UPI,
//               Pincode: form.Pincode,
//               address: form.address,
//             },
//           },
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/json",
//             },
//           },
//         );

//         message.success("Profile updated successfully");
//         onUpdated(response.data.data);
//         onClose();
//         return;
//       }

//       // Case 2: Photo upload or removal - use FormData
//       const formData = new FormData();

//       const dataPayload: any = {
//         Full_Name: form.Full_Name,
//         Phone_Number: form.Phone_Number,
//         State: form.State,
//         District: form.District,
//         Assembly: form.Assembly,
//         Village: form.Village,
//         Father_Name: form.Father_Name,
//         Mother_Name: form.Mother_Name,
//         Bank_or_UPI: form.Bank_or_UPI,
//         Pincode: form.Pincode,
//         address: form.address,
//       };

//       if (removePhoto) {
//         dataPayload.Photo = null; // or [] if multiple media
//       }

//       formData.append("data", JSON.stringify(dataPayload));

//       if (photoFile) {
//         formData.append("files.Photo", photoFile); // make sure field name matches
//       }

//       const response = await axios.put(
//         `${API_URL}/app-users/${profile.documentId}`,
//         formData,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       message.success("Profile updated successfully");
//       onUpdated(response.data.data);
//       onClose();
//     } catch (err: any) {
//       console.error("Update error:", err);

//       let errorMsg = "Update failed";

//       if (err?.response?.data?.error?.message) {
//         errorMsg = err.response.data.error.message;
//       } else if (err?.response?.data?.error?.details?.errors?.[0]?.message) {
//         errorMsg = err.response.data.error.details.errors[0].message;
//       }

//       message.error(errorMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const existingPhoto = profile?.Photo?.[0];

//   return (
//     <Modal
//       open={open}
//       onCancel={onClose}
//       footer={null}
//       title="Edit Profile"
//       width={800}
//     >
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <Input
//           placeholder="Full Name"
//           value={form.Full_Name}
//           onChange={(e) => setForm({ ...form, Full_Name: e.target.value })}
//         />
//         <div></div>

//         <Input
//           placeholder="Phone Number"
//           value={form.Phone_Number}
//           onChange={(e) => setForm({ ...form, Phone_Number: e.target.value })}
//         />

//         <Input
//           placeholder="State"
//           value={form.State}
//           onChange={(e) => setForm({ ...form, State: e.target.value })}
//         />

//         <Input
//           placeholder="District"
//           value={form.District}
//           onChange={(e) => setForm({ ...form, District: e.target.value })}
//         />

//         <Input
//           placeholder="Assembly"
//           value={form.Assembly}
//           onChange={(e) => setForm({ ...form, Assembly: e.target.value })}
//         />

//         <Input
//           placeholder="Village"
//           value={form.Village}
//           onChange={(e) => setForm({ ...form, Village: e.target.value })}
//         />

//         <Input
//           placeholder="Father Name"
//           value={form.Father_Name}
//           onChange={(e) => setForm({ ...form, Father_Name: e.target.value })}
//         />

//         <Input
//           placeholder="Mother Name"
//           value={form.Mother_Name}
//           onChange={(e) => setForm({ ...form, Mother_Name: e.target.value })}
//         />

//         <Input
//           placeholder="Bank / UPI"
//           value={form.Bank_or_UPI}
//           onChange={(e) => setForm({ ...form, Bank_or_UPI: e.target.value })}
//         />

//         <Input
//           placeholder="Pincode"
//           value={form.Pincode}
//           onChange={(e) => setForm({ ...form, Pincode: e.target.value })}
//         />

//         <div className="md:col-span-2">
//           <Input.TextArea
//             rows={3}
//             placeholder="Address"
//             value={form.address}
//             onChange={(e) => setForm({ ...form, address: e.target.value })}
//           />
//         </div>

//         {/* PHOTO SECTION */}
//         <div className="md:col-span-2 mt-4">
//           <label className="block text-sm font-medium mb-2">
//             Profile Photo
//           </label>
//           <div className="flex items-center gap-4">
//             {/* Existing Photo */}
//             {existingPhoto && !photoFile && !removePhoto && (
//               <div className="relative">
//                 <img
//                   src={`http://172.30.0.200:1335${existingPhoto.formats?.thumbnail?.url || existingPhoto.url}`}
//                   alt="Profile"
//                   className="w-28 h-28 rounded-full object-cover border-2 border-gray-200"
//                 />
//                 <button
//                   onClick={() => setRemovePhoto(true)}
//                   className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition"
//                   title="Remove photo"
//                 >
//                   <DeleteOutlined className="text-xs" />
//                 </button>
//               </div>
//             )}

//             {/* New Photo Preview */}
//             {photoFile && (
//               <div className="relative">
//                 <img
//                   src={URL.createObjectURL(photoFile)}
//                   alt="Preview"
//                   className="w-28 h-28 rounded-full object-cover border-2 border-green-300"
//                 />
//                 <button
//                   onClick={() => setPhotoFile(null)}
//                   className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition"
//                   title="Cancel upload"
//                 >
//                   <DeleteOutlined className="text-xs" />
//                 </button>
//               </div>
//             )}

//             {/* No photo state */}
//             {!existingPhoto && !photoFile && (
//               <div className="w-28 h-28 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
//                 <span className="text-gray-400 text-sm">No photo</span>
//               </div>
//             )}

//             {/* Upload Button */}
//             <div className="flex flex-col gap-2">
//               <Upload
//                 beforeUpload={(file) => {
//                   // Validate file type
//                   const isImage = file.type.startsWith("image/");
//                   if (!isImage) {
//                     message.error("You can only upload image files!");
//                     return false;
//                   }

//                   // Validate file size (5MB max)
//                   const isLt5M = file.size / 1024 / 1024 < 5;
//                   if (!isLt5M) {
//                     message.error("Image must be smaller than 5MB!");
//                     return false;
//                   }

//                   setPhotoFile(file);
//                   setRemovePhoto(false);
//                   return false;
//                 }}
//                 showUploadList={false}
//                 accept="image/*"
//               >
//                 <Button className="bg-green-600 hover:bg-green-700 text-white">
//                   <UploadOutlined /> {photoFile ? "Change" : "Upload"} Photo
//                 </Button>
//               </Upload>

//               {removePhoto && (
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => {
//                     setRemovePhoto(false);
//                     setPhotoFile(null);
//                   }}
//                   className="text-blue-600"
//                 >
//                   Cancel Removal
//                 </Button>
//               )}
//             </div>
//           </div>

//           {removePhoto && existingPhoto && !photoFile && (
//             <p className="text-sm text-red-600 mt-2">
//               ⚠️ Photo will be removed after saving
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="flex justify-end gap-2 mt-8 pt-4 border-t">
//         <Button variant="outline" onClick={onClose}>
//           Cancel
//         </Button>
//         <Button
//           className="bg-blue-600 hover:bg-blue-700 text-white"
//           onClick={handleSubmit}
//           disabled={loading}
//         >
//           {loading ? (
//             <>
//               <Spin size="small" className="mr-2" />
//               Saving...
//             </>
//           ) : (
//             "Save Changes"
//           )}
//         </Button>
//       </div>
//     </Modal>
//   );
// }

"use client";

import React, { useEffect, useState } from "react";
import { Modal, Input, Upload, message, Spin } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/button";
import axios from "axios";
import api from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: any;
  email?: string;
  onUpdated: (updatedProfile: any) => void;
}

export default function EditProfileModal({
  open,
  onClose,
  profile,
  email,
  onUpdated,
}: Props) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://183.82.117.36:1337/api";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  // Resolved profile (full object) – from prop or fetched when profile is just an id
  const [resolvedProfile, setResolvedProfile] = useState<any>(null);

  const [form, setForm] = useState<any>({
    Full_Name: "",
    Phone_Number: "",
    State: "",
    District: "",
    Assembly: "",
    Village: "",
    Father_Name: "",
    Mother_Name: "",
    Bank_or_UPI: "",
    Pincode: "",
    address: "",
    Aadhar: "",
  });

  /* ---------------- RESOLVE PROFILE (fetch if needed) ---------------- */
  const profileId =
    typeof profile === "object"
      ? profile?.documentId ?? profile?.id
      : typeof profile === "number" || (typeof profile === "string" && profile)
        ? profile
        : null;
  const hasFullProfile =
    typeof profile === "object" &&
    profile !== null &&
    (profile.Full_Name != null || profile.Phone_Number != null);

  useEffect(() => {
    if (!open) return;
    if (!profile && profileId == null) {
      setResolvedProfile(null);
      return;
    }
    if (hasFullProfile) {
      setResolvedProfile(profile);
      return;
    }
    if (!profileId) {
      setResolvedProfile(null);
      return;
    }
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const res = await api.get(
          `/app-users/${profileId}?populate[Photo]=true`
        );
        const data = res.data?.data ?? res.data;
        setResolvedProfile(data);
      } catch (err: any) {
        console.error("Fetch profile error:", err);
        message.error(
          err?.response?.data?.error?.message ?? "Unable to load profile details."
        );
        setResolvedProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [open, profile, profileId, hasFullProfile]);

  /* ---------------- FILL FORM FROM RESOLVED PROFILE ---------------- */
  useEffect(() => {
    const source = resolvedProfile ?? (hasFullProfile ? profile : null);
    if (!source) return;

    setForm({
      Full_Name: source.Full_Name || "",
      Phone_Number: source.Phone_Number || "",
      State: source.State || "",
      District: source.District || "",
      Assembly: source.Assembly || "",
      Village: source.Village || "",
      Father_Name: source.Father_Name || "",
      Mother_Name: source.Mother_Name || "",
      Bank_or_UPI: source.Bank_or_UPI || "",
      Pincode: source.Pincode || "",
      address: source.address || "",
      Aadhar: source.Aadhar || "",
    });

    setPhotoFile(null);
    setRemovePhoto(false);
  }, [resolvedProfile, profile, hasFullProfile]);

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    const idToUse =
      resolvedProfile?.documentId ??
      resolvedProfile?.id ??
      profileId;
    if (!idToUse) {
      message.error(
        "Profile ID not found. Please refresh the page and try again.",
      );
      return;
    }

    if (!token) {
      message.error("Session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);

      let photoDocumentIds: string[] | null = null;

      if (photoFile) {
        const uploadForm = new FormData();
        uploadForm.append("files", photoFile);

        const uploadRes = await axios.post(`${API_URL}/upload`, uploadForm, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const uploaded = Array.isArray(uploadRes.data)
          ? uploadRes.data[0]
          : uploadRes.data?.[0];
        if (uploaded?.id) {
          photoDocumentIds = [uploaded.id];
        }
      }

      const finalPayload: any = {
        Full_Name: form.Full_Name,
        Phone_Number: form.Phone_Number,
        State: form.State,
        District: form.District,
        Assembly: form.Assembly,
        Village: form.Village,
        Father_Name: form.Father_Name,
        Mother_Name: form.Mother_Name,
        Bank_or_UPI: form.Bank_or_UPI,
        Pincode: form.Pincode,
        address: form.address,
        Aadhar: form.Aadhar || undefined,
      };

      if (photoDocumentIds) {
        finalPayload.Photo = photoDocumentIds;
      }

      if (removePhoto) {
        finalPayload.Photo = [];
      }

      const response = await api.put(`/app-users/${idToUse}`, {
        data: finalPayload,
      });

      // Handle both Strapi v4 and v5 response structures
      const updatedProfile =
        response.data?.data ??
        response.data ??
        { ...(resolvedProfile || profile), ...finalPayload };
      onUpdated(updatedProfile);
      message.success("Profile updated successfully");
      onClose();
    } catch (err: any) {
      console.error("Profile update error:", err);

      const errorMsg =
        err?.response?.data?.error?.message ??
        err?.message ??
        "Profile update failed";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const displayProfile = resolvedProfile ?? (hasFullProfile ? profile : null);
  const existingPhoto = displayProfile?.Photo?.[0];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Edit Profile"
      width={800}
    >
      {loadingProfile ? (
        <div className="flex items-center justify-center py-12">
          <Spin tip="Loading profile..." />
        </div>
      ) : !profileId ? (
        <p className="text-gray-600 py-6 text-center">
          No profile linked to your account. Please contact support.
        </p>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          placeholder="Email"
          value={(email ?? "").toLowerCase()}
          disabled
          className="bg-gray-100"
        />
        <Input
          placeholder="Full Name"
          value={form.Full_Name}
          onChange={(e) => setForm({ ...form, Full_Name: e.target.value })}
        />

        <Input
          placeholder="Phone Number"
          value={form.Phone_Number}
          onChange={(e) => setForm({ ...form, Phone_Number: e.target.value })}
        />

        <Input
          placeholder="State"
          value={form.State}
          onChange={(e) => setForm({ ...form, State: e.target.value })}
        />

        <Input
          placeholder="District"
          value={form.District}
          onChange={(e) => setForm({ ...form, District: e.target.value })}
        />

        <Input
          placeholder="Assembly"
          value={form.Assembly}
          onChange={(e) => setForm({ ...form, Assembly: e.target.value })}
        />

        <Input
          placeholder="Village"
          value={form.Village}
          onChange={(e) => setForm({ ...form, Village: e.target.value })}
        />

        <Input
          placeholder="Father Name"
          value={form.Father_Name}
          onChange={(e) => setForm({ ...form, Father_Name: e.target.value })}
        />

        <Input
          placeholder="Mother Name"
          value={form.Mother_Name}
          onChange={(e) => setForm({ ...form, Mother_Name: e.target.value })}
        />

        <Input
          placeholder="Bank / UPI"
          value={form.Bank_or_UPI}
          onChange={(e) => setForm({ ...form, Bank_or_UPI: e.target.value })}
        />

        <Input
          placeholder="Pincode"
          value={form.Pincode}
          onChange={(e) => setForm({ ...form, Pincode: e.target.value })}
        />

        <Input
          placeholder="Aadhaar Number (12 digits)"
          value={form.Aadhar}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 12);
            setForm({ ...form, Aadhar: v });
          }}
          maxLength={12}
        />

        <div className="md:col-span-2">
          <Input.TextArea
            rows={3}
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        {/* PHOTO SECTION */}
        <div className="md:col-span-2 mt-4">
          <label className="block text-sm font-medium mb-2">
            Profile Photo
          </label>

          <div className="flex items-center gap-4">
            {existingPhoto && !photoFile && !removePhoto && (
              <div className="relative">
                <img
                  src={`${API_URL.replace("/api", "")}${existingPhoto.url}`}
                  className="w-28 h-28 rounded-full object-cover border"
                  alt="Profile"
                />
                <button
                  onClick={() => setRemovePhoto(true)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  <DeleteOutlined />
                </button>
              </div>
            )}

            {photoFile && (
              <div className="relative">
                <img
                  src={URL.createObjectURL(photoFile)}
                  className="w-28 h-28 rounded-full object-cover border"
                  alt="Preview"
                />
                <button
                  onClick={() => setPhotoFile(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  <DeleteOutlined />
                </button>
              </div>
            )}

            <Upload
              accept="image/*"
              beforeUpload={(file) => {
                if (!file.type.startsWith("image/")) {
                  message.error("Only image files allowed");
                  return false;
                }
                if (file.size / 1024 / 1024 > 5) {
                  message.error("Max size 5MB");
                  return false;
                }
                setPhotoFile(file);
                setRemovePhoto(false);
                return false;
              }}
              showUploadList={false}
            >
              <Button className="bg-green-600 text-white">
                <UploadOutlined /> Upload Photo
              </Button>
            </Upload>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>

        <Button
          className="bg-blue-600 text-white"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Spin size="small" /> : "Save Changes"}
        </Button>
      </div>
      </>
      )}
    </Modal>
  );
}
