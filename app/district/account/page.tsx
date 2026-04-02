// "use client";

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { message, Spin, Button, Input, Modal } from "antd";
// import {
//   CheckCircle,
//   AlertCircle,
//   Shield,
//   Mail,
//   Phone,
//   MapPin,
//   Users,
//   FileText,
//   Lock,
// } from "lucide-react";
// import EditProfileModal from "@/components/profile/EditProfileModal";

// const AadharVerificationPage = () => {
//   const [user, setUser] = useState<any>(null);
//   const [error, setError] = useState<string>("");
//   const [loading, setLoading] = useState<boolean>(true);
//   const [otpSent, setOtpSent] = useState(false);
//   const [otp, setOtp] = useState("");
//   const [clientId, setClientId] = useState("");
//   const [verifying, setVerifying] = useState(false);

//   // Change password states
//   const [passwordModalVisible, setPasswordModalVisible] = useState(false);
//   const [oldPassword, setOldPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [passwordLoading, setPasswordLoading] = useState(false);

//   const STRAPI_BASE = process.env.NEXT_PUBLIC_API_URL;
//   const AADHAR_API = "https://aadharverification.womenrider.com/aadhar"; // Fixed trailing spaces
//   const AUTH_TOKEN = process.env.NEXT_PUBLIC_AADHAR_BEARER;

//   const [editModalOpen, setEditModalOpen] = useState(false);

//   // 🔹 Fetch logged-in user with profile
//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           setError("No authentication token found. Please log in again.");
//           setLoading(false);
//           return;
//         }

//         const res = await axios.get(
//           `${STRAPI_BASE}/users/me?populate[profile][populate]=Photo`,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           },
//         );

//         const userData = res.data.user || res.data;
//         if (!userData?.profile) {
//           setError("Profile not found. Please contact support.");
//           setLoading(false);
//           return;
//         }

//         setUser(userData);

//         console.log("✅ User data fetched:", userData);
//       } catch (err: any) {
//         console.error("❌ Error fetching user:", err);
//         setError("Failed to load your profile. Please try again later.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUser();
//   }, []);

//   // 🔹 Send OTP using Aadhaar from profile
//   const handleSendOtp = async () => {
//     const aadharNumber = user?.profile?.Aadhar;
//     if (!aadharNumber || aadharNumber.length !== 12) {
//       return message.error(
//         "Invalid or missing Aadhaar number in your profile.",
//       );
//     }

//     try {
//       setVerifying(true);
//       const res = await axios.post(
//         `${AADHAR_API}/send-otp`,
//         { aadharNumber },
//         {
//           headers: {
//             Authorization: `Bearer ${AUTH_TOKEN}`,
//           },
//         },
//       );

//       setClientId(res.data.clientId);
//       setOtpSent(true);
//       message.success("OTP sent to your Aadhaar-registered mobile number!");
//     } catch (err: any) {
//       console.error("❌ OTP send error:", err);
//       const msg =
//         err?.response?.data?.message || "Failed to send OTP. Please try again.";
//       message.error(msg);
//     } finally {
//       setVerifying(false);
//     }
//   };

//   // 🔹 Verify OTP and update profile
//   const handleVerifyOtp = async () => {
//     if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
//       return message.warning("Please enter a valid 6-digit numeric OTP.");
//     }

//     try {
//       setVerifying(true);
//       const verifyRes = await axios.post(
//         `${AADHAR_API}/verifi-otp`,
//         {
//           otp,
//           clientId,
//           aadharNumber: user.profile.Aadhar,
//         },
//         {
//           headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
//         },
//       );

//       const result = verifyRes.data;
//       if (
//         result.message === "OTP VERIFIED" &&
//         result.data?.status === "success_aadhaar"
//       ) {
//         // Update app-user (profile) in Strapi
//         await axios.put(`${STRAPI_BASE}/app-suers/updateAadharVerified`, {
//           documentId: user.profile.documentId, // ✅ Correct: update the app-user
//           verified: true,
//           kycDetails: {
//             full_name: result.data.full_name,
//             dob: result.data.dob,
//             gender: result.data.gender,
//             address: result.data.address,
//             reference_id: result.data.reference_id,
//             zip: result.data.zip,
//           },
//         });

//         // Update local state
//         setUser((prev: any) => ({
//           ...prev,
//           profile: {
//             ...prev.profile,
//             aadhar_verified: true,
//             Full_Name: result.data.full_name || prev.profile.Full_Name,
//             dob: result.data.dob,
//             gender: result.data.gender,
//           },
//         }));

//         message.success("✅ Aadhaar verified successfully!");
//       } else {
//         message.error(
//           "Verification failed. Please check the OTP and try again.",
//         );
//       }
//     } catch (err: any) {
//       console.error("❌ Verification error:", err);
//       const msg =
//         err?.response?.data?.message ||
//         "Verification failed. Please try again.";
//       message.error(msg);
//     } finally {
//       setVerifying(false);
//     }
//   };

//   // 🔹 Handle Change Password
//   const handleChangePassword = async () => {
//     if (!oldPassword || !newPassword || !confirmPassword) {
//       return message.error("Please fill in all password fields");
//     }

//     if (newPassword !== confirmPassword) {
//       return message.error("New password and confirmation do not match");
//     }

//     if (newPassword.length < 6) {
//       return message.error("New password must be at least 6 characters");
//     }

//     try {
//       setPasswordLoading(true);
//       const token = localStorage.getItem("token");

//       const res = await axios.post(
//         `${STRAPI_BASE}/auth/change-password`,
//         {
//           currentPassword: oldPassword,
//           password: newPassword,
//           passwordConfirmation: confirmPassword,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       message.success("✅ Password changed successfully!");
//       setPasswordModalVisible(false);
//       setOldPassword("");
//       setNewPassword("");
//       setConfirmPassword("");
//     } catch (err: any) {
//       console.error("❌ Password change error:", err);
//       const msg =
//         err?.response?.data?.message ||
//         "Failed to change password. Please try again.";
//       message.error(msg);
//     } finally {
//       setPasswordLoading(false);
//     }
//   };

//   // 🔹 Loading State
//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-green-50">
//         <Spin size="large" />
//       </div>
//     );
//   }

//   // 🔹 Error State
//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-b from-blue-50 to-green-50 flex items-center justify-center p-4">
//         <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border-l-4 border-red-500">
//           <div className="flex items-center gap-3 mb-4">
//             <AlertCircle className="w-8 h-8 text-red-500" />
//             <h3 className="text-lg font-bold text-gray-900">Error</h3>
//           </div>
//           <p className="text-gray-600">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   // Safely access profile
//   const profile = user?.profile || {};

//   const photo = profile?.Photo?.[0];

//   const photoUrl = photo
//     ? `http://172.30.0.200:1335${photo.formats?.small?.url || photo.url}`
//     : null;

//   return (
//     <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-5xl mx-auto">
//         {/* Header */}

//         <div className="">
//           {/* Left Column - User Info */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Change Password Card */}
//             <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-orange-500">
//               <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
//                 <Lock className="w-6 h-6 text-orange-500" />
//                 Security Settings
//               </h2>
//               <Button
//                 type="primary"
//                 size="large"
//                 onClick={() => setPasswordModalVisible(true)}
//                 style={{
//                   background: "linear-gradient(to right, #f97316, #ea580c)",
//                   borderColor: "transparent",
//                 }}
//               >
//                 Change Password
//               </Button>
//               <Button
//                 type="primary"
//                 size="large"
//                 onClick={() => setEditModalOpen(true)}
//                 className="mb-4"
//               >
//                 Edit Profile
//               </Button>
//             </div>

//             <div className="bg-white rounded-2xl shadow-lg p-8">
//               <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
//                 <Users className="w-6 h-6 text-blue-500" />
//                 Profile Information
//               </h2>

//               {/* Profile Photo */}
//               <div className="flex justify-center mb-6">
//                 {photoUrl ? (
//                   <img
//                     src={photoUrl}
//                     alt="Profile"
//                     className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-md"
//                   />
//                 ) : (
//                   <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
//                     No Photo
//                   </div>
//                 )}
//               </div>

//               <div className="space-y-4">
//                 {/* Row 1 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Full Name
//                     </p>
//                     <p className="text-lg font-semibold text-black">
//                       {profile.Full_Name || "—"}
//                     </p>
//                   </div>
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Email
//                     </p>
//                     <p className="text-lg font-semibold text-black flex items-center gap-2">
//                       <Mail className="w-4 h-4" />
//                       {user.email || "—"}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Row 2 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Phone Number
//                     </p>
//                     <p className="text-lg font-semibold text-black flex items-center gap-2">
//                       <Phone className="w-4 h-4" />
//                       {profile.Phone_Number || "—"}
//                     </p>
//                   </div>
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Pincode
//                     </p>
//                     <p className="text-lg font-semibold text-black flex items-center gap-2">
//                       <MapPin className="w-4 h-4" />
//                       {profile.Pincode || "—"}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Row 3 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Address
//                     </p>
//                     <p className="text-lg font-semibold text-black">
//                       {profile.address || "—"}
//                     </p>
//                   </div>
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Village
//                     </p>
//                     <p className="text-lg font-semibold text-black">
//                       {profile.Village || "—"}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Row 4 */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Father's Name
//                     </p>
//                     <p className="text-lg font-semibold text-black">
//                       {profile.Father_Name || "—"}
//                     </p>
//                   </div>
//                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
//                     <p className="text-sm text-gray-600 font-medium mb-1">
//                       Mother's Name
//                     </p>
//                     <p className="text-lg font-semibold text-black">
//                       {profile.Mother_Name || "—"}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Aadhaar */}
//                 <div className="bg-gradient-to-r from-blue-100 to-green-100 p-4 rounded-lg border-2 border-blue-200">
//                   <p className="text-sm text-gray-600 font-medium mb-1">
//                     Aadhaar Number
//                   </p>
//                   <p className="text-xl font-bold text-black flex items-center gap-2">
//                     <FileText className="w-5 h-5" />
//                     {profile.Aadhar
//                       ? `${profile.Aadhar.slice(0, 4)}XXXX${profile.Aadhar.slice(-4)}`
//                       : "—"}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Change Password Modal */}
//       <Modal
//         title="Change Password"
//         visible={passwordModalVisible}
//         onCancel={() => {
//           setPasswordModalVisible(false);
//           setOldPassword("");
//           setNewPassword("");
//           setConfirmPassword("");
//         }}
//         footer={[
//           <Button
//             key="cancel"
//             onClick={() => {
//               setPasswordModalVisible(false);
//               setOldPassword("");
//               setNewPassword("");
//               setConfirmPassword("");
//             }}
//           >
//             Cancel
//           </Button>,
//           <Button
//             key="submit"
//             type="primary"
//             loading={passwordLoading}
//             onClick={handleChangePassword}
//             style={{
//               background: "linear-gradient(to right, #3b82f6, #10b981)",
//             }}
//           >
//             Change Password
//           </Button>,
//         ]}
//       >
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Current Password
//             </label>
//             <Input.Password
//               placeholder="Enter your current password"
//               value={oldPassword}
//               onChange={(e) => setOldPassword(e.target.value)}
//               size="large"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               New Password
//             </label>
//             <Input.Password
//               placeholder="Enter new password (min 6 characters)"
//               value={newPassword}
//               onChange={(e) => setNewPassword(e.target.value)}
//               size="large"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Confirm New Password
//             </label>
//             <Input.Password
//               placeholder="Confirm new password"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               size="large"
//             />
//           </div>
//         </div>
//       </Modal>

//       <EditProfileModal
//         open={editModalOpen}
//         onClose={() => setEditModalOpen(false)}
//         profile={profile}
//         onUpdated={(updatedProfile) => {
//           setUser((prev: any) => ({
//             ...prev,
//             profile: updatedProfile,
//           }));
//         }}
//       />
//     </div>
//   );
// };

// export default AadharVerificationPage;

import Profilepage from "@/components/profile/Profilepage";
import React from "react";

const page = () => {
  return (
    <div>
      <Profilepage />
    </div>
  );
};

export default page;
