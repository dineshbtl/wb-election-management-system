

// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import { Modal, Input, Select, Upload, message, Spin, Alert } from "antd";
// import { UploadOutlined, InfoCircleOutlined } from "@ant-design/icons";
// import { Button } from "@/components/ui/button";
// import api from "@/lib/api";
// import axios from "axios";

// const { Option } = Select;

// interface Props {
//   open: boolean;
//   onClose: () => void;
//   onCreated: (coord: any) => void;
// }

// const ROLE_HIERARCHY: Record<string, string[]> = {
//   superadmin: [
//     "superadmin",
//     "district_coordinator",
//     "assembly_coordinator",
//     "booth_coordinator",
//   ],
//   district_coordinator: ["assembly_coordinator", "booth_coordinator"],
//   assembly_coordinator: ["booth_coordinator"],
// };

// export default function CreateCoordinatorModal({
//   open,
//   onClose,
//   onCreated,
// }: Props) {
//   const API_URL = process.env.NEXT_PUBLIC_API_URL;
//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   const [loading, setLoading] = useState(false);
//   const [currentUser, setCurrentUser] = useState<any>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

//   const [roles, setRoles] = useState<any[]>([]);
//   const [districts, setDistricts] = useState<any[]>([]);
//   const [assemblies, setAssemblies] = useState<any[]>([]);
//   const [booths, setBooths] = useState<any[]>([]);

//   const [form, setForm] = useState<any>({
//     Full_Name: "",
//     email: "",
//     password: "",
//     phone_Number: "",
//     State: "",
//     District: "",
//     Assembly: "",
//     Booth: [] as string[],
//     Aadhar: "",
//     Father_Name: "",
//     Mother_Name: "",
//     Bank_or_UPI: "",
//     Village: "",
//     Pincode: "",
//     address: "",
//     Photo: null,
//     role: "",
//   });

//   /* ---------------------------------- */
//   /* INIT                               */
//   /* ---------------------------------- */
//   useEffect(() => {
//     if (!open) return;

//     resetForm();
//     loadInitialData();
//   }, [open]);

//   const resetForm = () => {
//     setForm({
//       Full_Name: "",
//       email: "",
//       password: "",
//       phone_Number: "",
//       State: "",
//       District: "",
//       Assembly: "",
//       Booth: [],
//       Aadhar: "",
//       Father_Name: "",
//       Mother_Name: "",
//       Bank_or_UPI: "",
//       Village: "",
//       Pincode: "",
//       address: "",
//       Photo: null,
//       role: "",
//     });
//     setAssemblies([]);
//     setBooths([]);
//     setErrorMessage(null);
//     setFieldErrors({});
//   };

//   const normalizeRoleType = (role: string) =>
//     role?.toLowerCase().replace(/-/g, "_");

//   const loadInitialData = async () => {
//     try {
//       const [meRes, roleRes, distRes] = await Promise.all([
//         api.get("/users/me?populate[role]=true&populate[profile]=true"),
//         api.get("/users-permissions/roles?pagination[pageSize]=1000"),
//         api.get("/districts?pagination[pageSize]=1000"),
//       ]);

//       setDistricts(distRes.data.data || []);

//       console.log("Current User:", meRes.data);

//       const rawRole = meRes.data?.role?.type || meRes.data?.role?.name || "";
//       const creatorRoleType = normalizeRoleType(
//         meRes.data?.role?.type || meRes.data?.role?.name || "",
//       );

//       const currentRoleType = normalizeRoleType(rawRole);

//       setCurrentUser({
//         ...meRes.data,
//         roleType: creatorRoleType,
//       });

//       // 🔵 If district coordinator → get his district
//       if (creatorRoleType === "district_coordinator") {
//         const myDistrictRes = await api.get(
//           `/districts?filters[district_coordinator][id][$eq]=${meRes.data.id}`,
//         );

//         const myDistrict = myDistrictRes.data.data[0] || null;

//         setCurrentUser((prev) => ({
//           ...prev,
//           myDistrict,
//         }));
//       }

//       // 🔵 If assembly coordinator → get his assembly
//       if (creatorRoleType === "assembly_coordinator") {
//         const myAssemblyRes = await api.get(
//           `/assemblies?filters[assembly_coordinator][id][$eq]=${meRes.data.id}`,
//         );

//         const myAssembly = myAssemblyRes.data.data[0] || null;

//         setCurrentUser((prev) => ({
//           ...prev,
//           myAssembly,
//         }));
//       }

//       const allowedRoleTypes =
//         ROLE_HIERARCHY[currentRoleType] || ROLE_HIERARCHY.superadmin;

//       const filteredRoles = roleRes.data.roles.filter((r: any) =>
//         allowedRoleTypes.includes(r.type),
//       );

//       setRoles(filteredRoles);
//     } catch (err) {
//       console.error(err);
//       message.error("Failed to load initial data");
//     }
//   };

//   /* ---------------------------------- */
//   /* DERIVED                            */
//   /* ---------------------------------- */
//   const selectedRole = useMemo(
//     () => roles.find((r) => r.id.toString() === form.role),
//     [roles, form.role],
//   );

//   const roleType = selectedRole?.type;

//   useEffect(() => {
//     if (!open || !currentUser || !roleType) return;

//     // 🔵 If creator is district coordinator
//     if (currentUser.roleType === "district_coordinator") {
//       const districtId = currentUser.myDistrict?.documentId;

//       if (districtId) {
//         setForm((prev) => ({
//           ...prev,
//           District: districtId,
//         }));

//         fetchAssemblies(districtId);
//       }
//     }

//     // 🔵 If creator is assembly coordinator
//     if (currentUser.roleType === "assembly_coordinator") {
//       const assemblyId = currentUser.myAssembly?.documentId;

//       if (assemblyId) {
//         setForm((prev) => ({
//           ...prev,
//           Assembly: assemblyId,
//         }));

//         fetchBooths(assemblyId);
//       }
//     }
//   }, [roleType, currentUser]);

//   /* ---------------------------------- */
//   /* FETCH CASCADE DATA                 */
//   /* ---------------------------------- */
//   const fetchAssemblies = async (districtId: string) => {
//     const res = await axios.get(
//       `${API_URL}/assemblies?filters[district][documentId][$eq]=${districtId}&pagination[pageSize]=1000`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     setAssemblies(res.data.data || []);
//   };

//   const fetchBooths = async (assemblyId: string) => {
//     const res = await axios.get(
//       `${API_URL}/locations?filters[assembly][documentId][$eq]=${assemblyId}&pagination[pageSize]=1000`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     setBooths(res.data.data || []);
//   };

//   /* ---------------------------------- */
//   /* ERROR HANDLING HELPER              */
//   /* ---------------------------------- */
//   const extractErrorMessage = (
//     error: any,
//   ): { message: string; fieldErrors: Record<string, string> } => {
//     const fieldErrors: Record<string, string> = {};
//     let generalMessage = "Failed to create coordinator. Please try again.";

//     if (error?.response?.data?.error) {
//       const errData = error.response.data.error;

//       // Handle Strapi validation errors
//       if (errData.name === "ValidationError" && errData.details?.errors) {
//         errData.details.errors.forEach((err: any) => {
//           if (err.path) {
//             fieldErrors[err.path] = err.message;
//           }
//         });

//         if (Object.keys(fieldErrors).length > 0) {
//           generalMessage = "Please correct the following errors:";
//         }
//       }
//       // Handle application errors (like duplicate email)
//       else if (errData.name === "ApplicationError") {
//         generalMessage = errData.message;

//         // Check if it's a duplicate email/username error
//         if (
//           errData.message.includes("Email") ||
//           errData.message.includes("Username")
//         ) {
//           fieldErrors.email = "This email is already registered";
//         }
//       }
//       // Fallback to error message
//       else if (errData.message) {
//         generalMessage = errData.message;
//       }
//     } else if (error?.message) {
//       generalMessage = error.message;
//     }

//     return { message: generalMessage, fieldErrors };
//   };

//   /* ---------------------------------- */
//   /* SUBMIT                             */
//   /* ---------------------------------- */
//   const handleSubmit = async () => {
//     // Reset previous errors
//     setErrorMessage(null);
//     setFieldErrors({});

//     // Basic validation
//     if (!form.Full_Name?.trim()) {
//       setFieldErrors({ Full_Name: "Full Name is required" });
//       message.warning("Please enter Full Name");
//       return;
//     }

//     if (!form.email?.trim()) {
//       setFieldErrors({ email: "Email is required" });
//       message.warning("Please enter Email");
//       return;
//     }

//     if (!form.password?.trim()) {
//       setFieldErrors({ password: "Password is required" });
//       message.warning("Please enter Password");
//       return;
//     }

//     if (!form.role) {
//       setFieldErrors({ role: "Role is required" });
//       message.warning("Please select a Role");
//       return;
//     }

//     // Email format validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (form.email && !emailRegex.test(form.email)) {
//       setFieldErrors({ email: "Please enter a valid email address" });
//       message.warning("Invalid email format");
//       return;
//     }

//     // Password strength validation
//     if (form.password && form.password.length < 6) {
//       setFieldErrors({ password: "Password must be at least 6 characters" });
//       message.warning("Password is too weak");
//       return;
//     }

//     // Role-specific validations
//     // if (roleType === "booth_coordinator" && form.Booth.length === 0) {
//     //   setFieldErrors({ Booth: "At least one booth must be selected" });
//     //   message.warning("Please select at least one booth");
//     //   return;
//     // }

//     setLoading(true);
//     try {
//       // 1️⃣ Create auth user
//       const registerRes = await axios.post(`${API_URL}/auth/local/register`, {
//         username: form.email,
//         email: form.email,
//         password: form.password,
//       });

//       const userId = registerRes.data.user.id;

//       // 2️⃣ Create app-user
//       const appUserRes = await axios.post(
//         `${API_URL}/app-users`,
//         {
//           data: {
//             Full_Name: form.Full_Name,
//             email: form.email,
//             Phone_Number: form.phone_Number,
//             State: form.State,
//             Aadhar: form.Aadhar,
//             Father_Name: form.Father_Name,
//             Mother_Name: form.Mother_Name,
//             Bank_or_UPI: form.Bank_or_UPI,
//             Village: form.Village,
//             Pincode: form.Pincode,
//             address: form.address,
//             createdby: currentUser.documentId,
//           },
//         },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );

//       const appUserId = appUserRes.data.data.id; // numeric

//       const appUserDocumentId = appUserRes.data.data.documentId;

//       // 3️⃣ Assign role + profile
//       await axios.put(
//         `${API_URL}/users/${userId}`,
//         {
//           role: Number(form.role),
//           profile: appUserId,
//         },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );

//       // 4️⃣ Optional assignments
//       if (roleType === "district_coordinator" && form.District) {
//         await axios.put(
//           `${API_URL}/districts/${form.District}`,
//           { data: { district_coordinator: userId } },
//           { headers: { Authorization: `Bearer ${token}` } },
//         );
//       }

//       if (roleType === "assembly_coordinator" && form.Assembly) {
//         await axios.put(
//           `${API_URL}/assemblies/${form.Assembly}`,
//           { data: { assembly_coordinator: userId } },
//           { headers: { Authorization: `Bearer ${token}` } },
//         );
//       }

//       if (roleType === "booth_coordinator" && form.Booth.length > 0) {
//         await Promise.all(
//           form.Booth.map((boothId: string) =>
//             axios.put(
//               `${API_URL}/locations/${boothId}`,
//               { data: { booth_coordinator: userId } },
//               { headers: { Authorization: `Bearer ${token}` } },
//             ),
//           ),
//         );
//       }

//       // 5️⃣ Upload photo
//       // 5️⃣ Upload photo correctly (Strapi v4 way)
//       if (form.Photo) {
//         // Step 1: Upload file
//         const uploadForm = new FormData();
//         uploadForm.append("files", form.Photo);

//         const uploadRes = await axios.post(`${API_URL}/upload`, uploadForm, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const uploadedFileId = uploadRes.data[0].id;

//         // Step 2: Link uploaded file to app-user
//         await axios.put(
//           `${API_URL}/app-users/${appUserDocumentId}`,
//           {
//             data: {
//               Photo: [uploadedFileId], // IMPORTANT
//             },
//           },
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           },
//         );
//       }

//       message.success("Coordinator created successfully");
//       onCreated({
//         documentId: registerRes.data.user.documentId,
//         email: form.email,
//         username: registerRes.data.user.username,
//         Full_Name: form.Full_Name,
//         Phone_Number: form.phone_Number,
//       });
//       onClose();
//     } catch (err: any) {
//       console.error("Creation error:", err);

//       // Extract and display error message
//       const { message: errorMsg, fieldErrors: errors } =
//         extractErrorMessage(err);

//       setErrorMessage(errorMsg);
//       setFieldErrors(errors);

//       // Show error notification
//       message.error(errorMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ---------------------------------- */
//   /* RENDER                             */
//   /* ---------------------------------- */
//   return (
//     <Modal
//       open={open}
//       onCancel={onClose}
//       title="Create Coordinator"
//       width={820}
//       footer={null}
//     >
//       {/* Error Banner */}
//       {errorMessage && (
//         <Alert
//           message="Error"
//           description={errorMessage}
//           type="error"
//           showIcon
//           icon={<InfoCircleOutlined />}
//           style={{ marginBottom: 16 }}
//           closable
//           onClose={() => setErrorMessage(null)}
//         />
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div>
//           <Input
//             placeholder="Full Name *"
//             value={form.Full_Name}
//             status={fieldErrors.Full_Name ? "error" : ""}
//             onChange={(e) => {
//               setForm({ ...form, Full_Name: e.target.value });
//               if (fieldErrors.Full_Name) {
//                 setFieldErrors({ ...fieldErrors, Full_Name: "" });
//               }
//             }}
//           />
//           {fieldErrors.Full_Name && (
//             <p className="text-red-500 text-xs mt-1">{fieldErrors.Full_Name}</p>
//           )}
//         </div>

//         <div>
//           <Input
//             placeholder="Email *"
//             value={form.email}
//             status={fieldErrors.email ? "error" : ""}
//             onChange={(e) => {
//               setForm({ ...form, email: e.target.value });
//               if (fieldErrors.email) {
//                 setFieldErrors({ ...fieldErrors, email: "" });
//               }
//             }}
//           />
//           {fieldErrors.email && (
//             <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
//           )}
//         </div>

//         <div>
//           <Input.Password
//             placeholder="Password * (min 6 characters)"
//             value={form.password}
//             status={fieldErrors.password ? "error" : ""}
//             onChange={(e) => {
//               setForm({ ...form, password: e.target.value });
//               if (fieldErrors.password) {
//                 setFieldErrors({ ...fieldErrors, password: "" });
//               }
//             }}
//           />
//           {fieldErrors.password && (
//             <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
//           )}
//         </div>

//         <div>
//           <Input
//             placeholder="Phone Number"
//             value={form.phone_Number}
//             onChange={(e) => setForm({ ...form, phone_Number: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="Aadhar"
//             value={form.Aadhar}
//             onChange={(e) => setForm({ ...form, Aadhar: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="Father Name"
//             value={form.Father_Name}
//             onChange={(e) => setForm({ ...form, Father_Name: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="Mother Name"
//             value={form.Mother_Name}
//             onChange={(e) => setForm({ ...form, Mother_Name: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="Bank / UPI"
//             value={form.Bank_or_UPI}
//             onChange={(e) => setForm({ ...form, Bank_or_UPI: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="Village"
//             value={form.Village}
//             onChange={(e) => setForm({ ...form, Village: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="Pincode"
//             value={form.Pincode}
//             onChange={(e) => setForm({ ...form, Pincode: e.target.value })}
//           />
//         </div>

//         <div>
//           <Input
//             placeholder="State"
//             value={form.State}
//             onChange={(e) => setForm({ ...form, State: e.target.value })}
//           />
//         </div>

//         <div>
//           <Select
//             placeholder="Role *"
//             className="w-full"
//             value={form.role || undefined}
//             status={fieldErrors.role ? "error" : ""}
//             onChange={(v) => {
//               setForm({
//                 ...form,
//                 role: v,
//                 District: "",
//                 Assembly: "",
//                 Booth: [],
//               });
//               if (fieldErrors.role) {
//                 setFieldErrors({ ...fieldErrors, role: "" });
//               }
//             }}
//           >
//             {roles.map((r) => (
//               <Option key={r.id} value={r.id.toString()}>
//                 {r.name}
//               </Option>
//             ))}
//           </Select>
//           {fieldErrors.role && (
//             <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>
//           )}
//         </div>

//         {currentUser?.roleType === "superadmin" &&
//           [
//             "district_coordinator",
//             "assembly_coordinator",
//             "booth_coordinator",
//           ].includes(roleType) && (
//             <div>
//               <Select
//                 allowClear
//                 className="w-full"
//                 placeholder="District (optional)"
//                 value={form.District || undefined}
//                 onChange={(v) => {
//                   setForm({ ...form, District: v, Assembly: "", Booth: [] });
//                   fetchAssemblies(v);
//                 }}
//               >
//                 {districts.map((d) => (
//                   <Option key={d.documentId} value={d.documentId}>
//                     {d.district_name}
//                   </Option>
//                 ))}
//               </Select>
//             </div>
//           )}

//         {["assembly_coordinator", "booth_coordinator"].includes(roleType) &&
//           currentUser?.roleType !== "assembly_coordinator" && (
//             <div>
//               <Select
//                 allowClear
//                 className="w-full"
//                 placeholder="Assembly (optional)"
//                 disabled={!form.District}
//                 value={form.Assembly || undefined}
//                 onChange={(v) => {
//                   setForm({ ...form, Assembly: v, Booth: [] });
//                   fetchBooths(v);
//                 }}
//               >
//                 {assemblies.map((a) => (
//                   <Option key={a.documentId} value={a.documentId}>
//                     {a.Assembly_Name}
//                   </Option>
//                 ))}
//               </Select>
//             </div>
//           )}

//         {roleType === "booth_coordinator" && (
//           <div>
//             <Select
//               className="w-full"
//               allowClear
//               mode="multiple"
//               showSearch
//               placeholder="Select Booths * (Search by PS No)"
//               disabled={!form.Assembly}
//               value={form.Booth}
//               status={fieldErrors.Booth ? "error" : ""}
//               optionFilterProp="label"
//               filterOption={(input, option: any) =>
//                 option?.label
//                   ?.toString()
//                   .toLowerCase()
//                   .includes(input.toLowerCase())
//               }
//               onChange={(v) => {
//                 setForm({ ...form, Booth: v });
//                 if (fieldErrors.Booth) {
//                   setFieldErrors({ ...fieldErrors, Booth: "" });
//                 }
//               }}
//             >
//               {booths.map((b) => (
//                 <Option key={b.documentId} value={b.documentId} label={b.PS_No}>
//                   {b.PS_No} - {b.PS_Name}
//                 </Option>
//               ))}
//             </Select>
//             {fieldErrors.Booth && (
//               <p className="text-red-500 text-xs mt-1">{fieldErrors.Booth}</p>
//             )}
//           </div>
//         )}

//         <Upload
//           beforeUpload={(f) => {
//             setForm({ ...form, Photo: f });
//             return false;
//           }}
//         >
//           <Button className="bg-green-500 text-white w-full">
//             <UploadOutlined /> Upload Photo
//           </Button>
//         </Upload>

//         <div className="md:col-span-2">
//           <Input.TextArea
//             rows={3}
//             placeholder="Address"
//             value={form.address}
//             onChange={(e) => setForm({ ...form, address: e.target.value })}
//           />
//         </div>
//       </div>

//       <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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
//               Creating...
//             </>
//           ) : (
//             "Create Coordinator"
//           )}
//         </Button>
//       </div>
//     </Modal>
//   );
// }




"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input, Select, Upload, message, Spin, Alert } from "antd";
import { UploadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import axios from "axios";

const { Option } = Select;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (coord: any) => void;
}

const ROLE_HIERARCHY: Record<string, string[]> = {
  superadmin: [
    "district_coordinator",
    "assembly_coordinator",
    "booth_coordinator",
    "superadmin",
  ],
  district_coordinator: ["assembly_coordinator", "booth_coordinator"],
  assembly_coordinator: ["booth_coordinator"],
};

export default function CreateCoordinatorModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [roles, setRoles] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [booths, setBooths] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    Full_Name: "",
    email: "",
    password: "",
    phone_Number: "",
    State: "",
    District: "",
    Assembly: "",
    Booth: [] as string[],
    Aadhar: "",
    Father_Name: "",
    Mother_Name: "",
    Bank_or_UPI: "",
    Village: "",
    Pincode: "",
    address: "",
    Photo: null,
    role: "",
  });

  /* ---------------------------------- */
  /* INIT                               */
  /* ---------------------------------- */
  useEffect(() => {
    if (!open) return;

    resetForm();
    loadInitialData();
  }, [open]);

  const resetForm = () => {
    setForm({
      Full_Name: "",
      email: "",
      password: "",
      phone_Number: "",
      State: "",
      District: "",
      Assembly: "",
      Booth: [],
      Aadhar: "",
      Father_Name: "",
      Mother_Name: "",
      Bank_or_UPI: "",
      Village: "",
      Pincode: "",
      address: "",
      Photo: null,
      role: "",
    });
    setAssemblies([]);
    setBooths([]);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const normalizeRoleType = (role: string) =>
    role?.toLowerCase().replace(/-/g, "_");

  const loadInitialData = async () => {
    try {
      const [meRes, roleRes, distRes] = await Promise.all([
        api.get("/users/me?populate[role]=true&populate[profile]=true"),
        api.get("/users-permissions/roles?pagination[pageSize]=1000"),
        api.get("/districts?pagination[pageSize]=1000"),
      ]);

      setDistricts(distRes.data.data || []);

      console.log("Current User:", meRes.data);

      const rawRole = meRes.data?.role?.type || meRes.data?.role?.name || "";
      const creatorRoleType = normalizeRoleType(
        meRes.data?.role?.type || meRes.data?.role?.name || "",
      );

      const currentRoleType = normalizeRoleType(rawRole);

      setCurrentUser({
        ...meRes.data,
        roleType: creatorRoleType,
      });

      // 🔵 If district coordinator → get his districts
      if (creatorRoleType === "district_coordinator") {
        const myDistrictRes = await api.get(
          `/districts?filters[district_coordinator][id][$eq]=${meRes.data.id}&pagination[pageSize]=100`,
        );

        const myDistricts = myDistrictRes.data.data || [];

        setCurrentUser((prev: any) => ({
          ...prev,
          myDistricts,
        }));
      }

      // 🔵 If assembly coordinator → get his assembly
      if (creatorRoleType === "assembly_coordinator") {
        const myAssemblyRes = await api.get(
          `/assemblies?filters[assembly_coordinator][id][$eq]=${meRes.data.id}`,
        );

        const myAssembly = myAssemblyRes.data.data[0] || null;

        setCurrentUser((prev) => ({
          ...prev,
          myAssembly,
        }));
      }

      const allowedRoleTypes =
        ROLE_HIERARCHY[currentRoleType] || ROLE_HIERARCHY.superadmin;

      const filteredRoles = roleRes.data.roles.filter((r: any) =>
        allowedRoleTypes.includes(r.type),
      );

      setRoles(filteredRoles);
    } catch (err) {
      console.error(err);
      message.error("Failed to load initial data");
    }
  };

  /* ---------------------------------- */
  /* DERIVED                            */
  /* ---------------------------------- */
  const selectedRole = useMemo(
    () => roles.find((r) => r.id.toString() === form.role),
    [roles, form.role],
  );

  const roleType = selectedRole?.type;

  useEffect(() => {
    if (!open || !currentUser || !roleType) return;

    // 🔵 If creator is district coordinator
    if (currentUser.roleType === "district_coordinator") {
      const myDistricts = currentUser.myDistricts || [];

      if (myDistricts.length === 1) {
        // Only one district explicitly assigned, auto-select it
        const districtId = myDistricts[0].documentId;
        setForm((prev: any) => ({
          ...prev,
          District: districtId,
        }));
        fetchAssemblies(districtId);
        
        // Populate the dropdown with just this option instead of leaving it empty
        setDistricts(myDistricts);
      } else if (myDistricts.length > 1) {
        // If multiple duplicate districts are assigned, we populate the dropdown options with the deduplicated array and let the user pick
        const uniqueDistricts = Array.from(new Map(myDistricts.map((d: any) => [d.documentId, d])).values());
        setDistricts(uniqueDistricts as any[]);
      }
    }

    // 🔵 If creator is assembly coordinator
    if (currentUser.roleType === "assembly_coordinator") {
      const assemblyId = currentUser.myAssembly?.documentId;

      if (assemblyId) {
        setForm((prev) => ({
          ...prev,
          Assembly: assemblyId,
        }));

        fetchBooths(assemblyId);
      }
    }
  }, [roleType, currentUser]);

  /* ---------------------------------- */
  /* FETCH CASCADE DATA                 */
  /* ---------------------------------- */
  const fetchAssemblies = async (districtId: string) => {
    const res = await axios.get(
      `${API_URL}/assemblies?filters[district][documentId][$eq]=${districtId}&pagination[pageSize]=1000`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setAssemblies(res.data.data || []);
  };

  const fetchBooths = async (assemblyId: string) => {
    const res = await axios.get(
      `${API_URL}/locations?filters[assembly][documentId][$eq]=${assemblyId}&pagination[pageSize]=1000`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setBooths(res.data.data || []);
  };

  /* ---------------------------------- */
  /* ERROR HANDLING HELPER              */
  /* ---------------------------------- */
  const extractErrorMessage = (
    error: any,
  ): { message: string; fieldErrors: Record<string, string> } => {
    const fieldErrors: Record<string, string> = {};
    let generalMessage = "Failed to create coordinator. Please try again.";

    if (error?.response?.data?.error) {
      const errData = error.response.data.error;

      // Handle Strapi validation errors
      if (errData.name === "ValidationError" && errData.details?.errors) {
        errData.details.errors.forEach((err: any) => {
          if (err.path) {
            fieldErrors[err.path] = err.message;
          }
        });

        if (Object.keys(fieldErrors).length > 0) {
          generalMessage = "Please correct the following errors:";
        }
      }
      // Handle application errors (like duplicate email)
      else if (errData.name === "ApplicationError") {
        generalMessage = errData.message;

        // Check if it's a duplicate email/username error
        if (
          errData.message.includes("Email") ||
          errData.message.includes("Username")
        ) {
          fieldErrors.email = "This email is already registered";
        }
      }
      // Fallback to error message
      else if (errData.message) {
        generalMessage = errData.message;
      }
    } else if (error?.message) {
      generalMessage = error.message;
    }

    return { message: generalMessage, fieldErrors };
  };

  /* ---------------------------------- */
  /* SUBMIT                             */
  /* ---------------------------------- */
  const handleSubmit = async () => {
    // Reset previous errors
    setErrorMessage(null);
    setFieldErrors({});

    // Basic validation
    if (!form.Full_Name?.trim()) {
      setFieldErrors({ Full_Name: "Full Name is required" });
      message.warning("Please enter Full Name");
      return;
    }

    if (!form.email?.trim()) {
      setFieldErrors({ email: "Email is required" });
      message.warning("Please enter Email");
      return;
    }

    if (!form.password?.trim()) {
      setFieldErrors({ password: "Password is required" });
      message.warning("Please enter Password");
      return;
    }

    if (!form.role) {
      setFieldErrors({ role: "Role is required" });
      message.warning("Please select a Role");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      setFieldErrors({ email: "Please enter a valid email address" });
      message.warning("Invalid email format");
      return;
    }

    // Password strength validation
    if (form.password && form.password.length < 6) {
      setFieldErrors({ password: "Password must be at least 6 characters" });
      message.warning("Password is too weak");
      return;
    }

    // Role-specific validations
    // if (roleType === "booth_coordinator" && form.Booth.length === 0) {
    //   setFieldErrors({ Booth: "At least one booth must be selected" });
    //   message.warning("Please select at least one booth");
    //   return;
    // }

    setLoading(true);
    try {
      // 1️⃣ Create auth user
      const registerRes = await axios.post(`${API_URL}/auth/local/register`, {
        username: form.email,
        email: form.email,
        password: form.password,
      });

      const userId = registerRes.data.user.id;

      // 2️⃣ Create app-user
      const appUserRes = await axios.post(
        `${API_URL}/app-users`,
        {
          data: {
            Full_Name: form.Full_Name,
            email: form.email,
            Phone_Number: form.phone_Number,
            State: form.State,
            Aadhar: form.Aadhar,
            Father_Name: form.Father_Name,
            Mother_Name: form.Mother_Name,
            Bank_or_UPI: form.Bank_or_UPI,
            Village: form.Village,
            Pincode: form.Pincode,
            address: form.address,
            createdby: currentUser.documentId,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const appUserId = appUserRes.data.data.id; // numeric

      const appUserDocumentId = appUserRes.data.data.documentId;

      // 3️⃣ Assign role + profile
      await axios.put(
        `${API_URL}/users/${userId}`,
        {
          role: Number(form.role),
          profile: appUserId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // 4️⃣ Optional assignments
      if (roleType === "district_coordinator" && form.District) {
        await axios.put(
          `${API_URL}/districts/${form.District}`,
          { data: { district_coordinator: userId } },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      if (roleType === "assembly_coordinator" && form.Assembly) {
        await axios.put(
          `${API_URL}/assemblies/${form.Assembly}`,
          { data: { assembly_coordinator: userId } },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      if (roleType === "booth_coordinator" && form.Booth.length > 0) {
        await Promise.all(
          form.Booth.map((boothId: string) =>
            axios.put(
              `${API_URL}/locations/${boothId}`,
              { data: { booth_coordinator: userId } },
              { headers: { Authorization: `Bearer ${token}` } },
            ),
          ),
        );
      }

      // 5️⃣ Upload photo
      // 5️⃣ Upload photo correctly (Strapi v4 way)
      if (form.Photo) {
        // Step 1: Upload file
        const uploadForm = new FormData();
        uploadForm.append("files", form.Photo);

        const uploadRes = await axios.post(`${API_URL}/upload`, uploadForm, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const uploadedFileId = uploadRes.data[0].id;

        // Step 2: Link uploaded file to app-user
        await axios.put(
          `${API_URL}/app-users/${appUserDocumentId}`,
          {
            data: {
              Photo: [uploadedFileId], // IMPORTANT
            },
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }

      message.success("Coordinator created successfully");
      onCreated({
        documentId: registerRes.data.user.documentId,
        email: form.email,
        username: registerRes.data.user.username,
        Full_Name: form.Full_Name,
        Phone_Number: form.phone_Number,
      });
      onClose();
    } catch (err: any) {
      console.error("Creation error:", err);

      // Extract and display error message
      const { message: errorMsg, fieldErrors: errors } =
        extractErrorMessage(err);

      setErrorMessage(errorMsg);
      setFieldErrors(errors);

      // Show error notification
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------- */
  /* RENDER                             */
  /* ---------------------------------- */
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Create Coordinator"
      width={820}
      footer={null}
    >
      {/* Error Banner */}
      {errorMessage && (
        <Alert
          message="Error"
          description={errorMessage}
          type="error"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            placeholder="Full Name *"
            value={form.Full_Name}
            status={fieldErrors.Full_Name ? "error" : ""}
            onChange={(e) => {
              setForm({ ...form, Full_Name: e.target.value });
              if (fieldErrors.Full_Name) {
                setFieldErrors({ ...fieldErrors, Full_Name: "" });
              }
            }}
          />
          {fieldErrors.Full_Name && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.Full_Name}</p>
          )}
        </div>

        <div>
          <Input
            placeholder="Email *"
            value={form.email}
            status={fieldErrors.email ? "error" : ""}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              if (fieldErrors.email) {
                setFieldErrors({ ...fieldErrors, email: "" });
              }
            }}
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <Input.Password
            placeholder="Password * (min 6 characters)"
            value={form.password}
            status={fieldErrors.password ? "error" : ""}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              if (fieldErrors.password) {
                setFieldErrors({ ...fieldErrors, password: "" });
              }
            }}
          />
          {fieldErrors.password && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div>
          <Input
            placeholder="Phone Number"
            value={form.phone_Number}
            onChange={(e) => setForm({ ...form, phone_Number: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="Aadhar"
            value={form.Aadhar}
            onChange={(e) => setForm({ ...form, Aadhar: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="Father Name"
            value={form.Father_Name}
            onChange={(e) => setForm({ ...form, Father_Name: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="Mother Name"
            value={form.Mother_Name}
            onChange={(e) => setForm({ ...form, Mother_Name: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="Bank / UPI"
            value={form.Bank_or_UPI}
            onChange={(e) => setForm({ ...form, Bank_or_UPI: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="Village"
            value={form.Village}
            onChange={(e) => setForm({ ...form, Village: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="Pincode"
            value={form.Pincode}
            onChange={(e) => setForm({ ...form, Pincode: e.target.value })}
          />
        </div>

        <div>
          <Input
            placeholder="State"
            value={form.State}
            onChange={(e) => setForm({ ...form, State: e.target.value })}
          />
        </div>

        <div>
          <Select
            placeholder="Role *"
            className="w-full"
            value={form.role || undefined}
            status={fieldErrors.role ? "error" : ""}
            onChange={(v) => {
              setForm({
                ...form,
                role: v,
                District: "",
                Assembly: "",
                Booth: [],
              });
              if (fieldErrors.role) {
                setFieldErrors({ ...fieldErrors, role: "" });
              }
            }}
          >
            {roles.map((r) => (
              <Option key={r.id} value={r.id.toString()}>
                {r.name}
              </Option>
            ))}
          </Select>
          {fieldErrors.role && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>
          )}
        </div>

        {currentUser?.roleType === "superadmin" || currentUser?.roleType === "district_coordinator" ? (
          [
            "district_coordinator",
            "assembly_coordinator",
            "booth_coordinator",
          ].includes(roleType) && (
            <div>
              <Select
                allowClear
                className="w-full"
                disabled={currentUser?.roleType === "district_coordinator" && districts.length === 1}
                placeholder="District (optional)"
                value={form.District || undefined}
                onChange={(v) => {
                  setForm({ ...form, District: v, Assembly: "", Booth: [] });
                  fetchAssemblies(v);
                }}
              >
                {districts.map((d) => (
                  <Option key={d.documentId} value={d.documentId}>
                    {d.district_name}
                  </Option>
                ))}
              </Select>
            </div>
          )
        ) : null}

        {["assembly_coordinator", "booth_coordinator"].includes(roleType) &&
          currentUser?.roleType !== "assembly_coordinator" && (
            <div>
              <Select
                allowClear
                className="w-full"
                placeholder="Assembly (optional)"
                disabled={!form.District}
                value={form.Assembly || undefined}
                onChange={(v) => {
                  setForm({ ...form, Assembly: v, Booth: [] });
                  fetchBooths(v);
                }}
              >
                {assemblies.map((a) => (
                  <Option key={a.documentId} value={a.documentId}>
                    {a.Assembly_Name}
                  </Option>
                ))}
              </Select>
            </div>
          )}

        {roleType === "booth_coordinator" && (
          <div>
            <Select
              className="w-full"
              allowClear
              mode="multiple"
              showSearch
              placeholder="Select Booths * (Search by PS No)"
              disabled={!form.Assembly}
              value={form.Booth}
              status={fieldErrors.Booth ? "error" : ""}
              optionFilterProp="label"
              filterOption={(input, option: any) =>
                option?.label
                  ?.toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(v) => {
                setForm({ ...form, Booth: v });
                if (fieldErrors.Booth) {
                  setFieldErrors({ ...fieldErrors, Booth: "" });
                }
              }}
            >
              {booths.map((b) => (
                <Option key={b.documentId} value={b.documentId} label={b.PS_No}>
                  {b.PS_No} - {b.PS_Name}
                </Option>
              ))}
            </Select>
            {fieldErrors.Booth && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.Booth}</p>
            )}
          </div>
        )}

        <Upload
          beforeUpload={(f) => {
            setForm({ ...form, Photo: f });
            return false;
          }}
        >
          <Button className="bg-green-500 text-white w-full">
            <UploadOutlined /> Upload Photo
          </Button>
        </Upload>

        <div className="md:col-span-2">
          <Input.TextArea
            rows={3}
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spin size="small" className="mr-2" />
              Creating...
            </>
          ) : (
            "Create Coordinator"
          )}
        </Button>
      </div>
    </Modal>
  );
}
