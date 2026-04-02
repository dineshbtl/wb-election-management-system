// "use client";

// import { Modal, Input, Select } from "antd";
// import { useState, useEffect } from "react";
// import bpi from "@/lib/api";
// import { useToast } from "@/hooks/use-toast";

// interface Props {
//   open: boolean;
//   onClose: () => void;
//   onSuccess?: () => void;
// }

// export default function AddLocationModal({ open, onClose, onSuccess }: Props) {
//   const { toast } = useToast();

//   const [districts, setDistricts] = useState<any[]>([]);
//   const [assemblies, setAssemblies] = useState<any[]>([]);

//   const [district, setDistrict] = useState<string>();
//   const [assembly, setAssembly] = useState<string>();

//   const [psName, setPsName] = useState("");
//   const [psNo, setPsNo] = useState("");
//   const [psLocation, setPsLocation] = useState("");
//   const [latitude, setLatitude] = useState("");
//   const [longitude, setLongitude] = useState("");

//   const [loading, setLoading] = useState(false);

//   // Fetch districts
//   useEffect(() => {
//     if (!open) return;

//     const fetchDistricts = async () => {
//       try {
//         const res = await bpi.get(
//           "/districts?fields[0]=district_name&fields[1]=documentId&pagination[pageSize]=1000",
//         );
//         setDistricts(res.data.data);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchDistricts();
//   }, [open]);

//   // Fetch assemblies when district changes
//   useEffect(() => {
//     if (!district) return;

//     const fetchAssemblies = async () => {
//       try {
//         const res = await bpi.get("/assemblies", {
//           params: {
//             "filters[district][documentId][$eq]": district,
//             "pagination[pageSize]": 1000,
//           },
//         });

//         setAssemblies(res.data.data);
//       } catch (err) {
//         console.error(err);
//       }
//     };

//     fetchAssemblies();
//   }, [district]);

//   const resetForm = () => {
//     setDistrict(undefined);
//     setAssembly(undefined);
//     setPsName("");
//     setPsNo("");
//     setPsLocation("");
//     setLatitude("");
//     setLongitude("");
//   };

//   const handleSubmit = async () => {
//     if (!district || !assembly || !psName.trim() || !psNo.trim()) {
//       toast({
//         variant: "destructive",
//         title: "Validation Error",
//         description: "District, Assembly, PS Name and PS No are required",
//       });
//       return;
//     }

//     setLoading(true);
//     try {
//       await bpi.post("/locations", {
//         data: {
//           PS_Name: psName,
//           PS_No: psNo,
//           PS_Location: psLocation || null,
//           Latitude: latitude || null,
//           Longitude: longitude || null,
//           assembly,
//         },
//       });

//       toast({
//         variant: "success",
//         title: "Location Added",
//         description: `${psName} created successfully`,
//       });

//       resetForm();
//       onSuccess?.();
//       onClose();
//     } catch (err: any) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description:
//           err.response?.data?.error?.message || "Failed to create location",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Modal
//       title="Add Location"
//       open={open}
//       onCancel={() => {
//         resetForm();
//         onClose();
//       }}
//       onOk={handleSubmit}
//       confirmLoading={loading}
//       okText="Create"
//     >
//       <div className="space-y-4">
//         {/* District */}
//         <Select
//           placeholder="Select District"
//           className="w-full"
//           value={district}
//           onChange={(val) => {
//             setDistrict(val);
//             setAssembly(undefined);
//           }}
//         >
//           {districts.map((d: any) => (
//             <Select.Option key={d.documentId} value={d.documentId}>
//               {d.district_name}
//             </Select.Option>
//           ))}
//         </Select>

//         {/* Assembly */}
//         <Select
//           placeholder="Select Assembly"
//           className="w-full"
//           value={assembly}
//           disabled={!district}
//           onChange={setAssembly}
//         >
//           {assemblies.map((a: any) => (
//             <Select.Option key={a.documentId} value={a.documentId}>
//               {a.Assembly_Name}
//             </Select.Option>
//           ))}
//         </Select>

//         {/* PS Details */}
//         <Input
//           placeholder="PS Name"
//           value={psName}
//           onChange={(e) => setPsName(e.target.value)}
//         />

//         <Input
//           placeholder="PS No."
//           value={psNo}
//           onChange={(e) => setPsNo(e.target.value)}
//         />

//         <Input
//           placeholder="Village / Location (optional)"
//           value={psLocation}
//           onChange={(e) => setPsLocation(e.target.value)}
//         />

//         <div className="grid grid-cols-2 gap-2">
//           <Input
//             placeholder="Latitude"
//             value={latitude}
//             onChange={(e) => setLatitude(e.target.value)}
//           />
//           <Input
//             placeholder="Longitude"
//             value={longitude}
//             onChange={(e) => setLongitude(e.target.value)}
//           />
//         </div>
//       </div>
//     </Modal>
//   );
// }

"use client";

import { Modal, Input, Select, Button } from "antd";
import { useState, useEffect } from "react";
import bpi from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  assemblyId?: string; // 👈 optional
}

export default function AddLocationModal({
  open,
  onClose,
  onSuccess,
  assemblyId,
}: Props) {
  const { toast } = useToast();

  const [districts, setDistricts] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);

  const [district, setDistrict] = useState<string>();
  const [assembly, setAssembly] = useState<string | undefined>(assemblyId);

  const [psName, setPsName] = useState("");
  const [psNo, setPsNo] = useState("");
  const [psLocation, setPsLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [loading, setLoading] = useState(false);

  // Auto set assembly if passed
  useEffect(() => {
    if (assemblyId) {
      setAssembly(assemblyId);
    }
  }, [assemblyId]);

  // Fetch districts only if assemblyId not provided
  useEffect(() => {
    if (!open || assemblyId) return;

    const fetchDistricts = async () => {
      const res = await bpi.get(
        "/districts?fields[0]=district_name&fields[1]=documentId&pagination[pageSize]=1000",
      );
      setDistricts(res.data.data);
    };

    fetchDistricts();
  }, [open, assemblyId]);

  // Fetch assemblies if district selected
  useEffect(() => {
    if (!district || assemblyId) return;

    const fetchAssemblies = async () => {
      const res = await bpi.get("/assemblies", {
        params: {
          "filters[district][documentId][$eq]": district,
          "pagination[pageSize]": 1000,
        },
      });
      setAssemblies(res.data.data);
    };

    fetchAssemblies();
  }, [district, assemblyId]);

  const resetLocationFields = () => {
    setPsName("");
    setPsNo("");
    setPsLocation("");
    setLatitude("");
    setLongitude("");
  };

  const resetAll = () => {
    setDistrict(undefined);
    setAssembly(undefined);
    resetLocationFields();
  };

  const saveLocation = async (finish = false) => {
    if (!assembly || !psName.trim() || !psNo.trim()) {
      toast({
        variant: "destructive",
        title: "PS Name and PS No required",
      });
      return;
    }

    setLoading(true);
    try {
      await bpi.post("/locations", {
        data: {
          PS_Name: psName,
          PS_No: psNo,
          PS_Location: psLocation || null,
          Latitude: latitude || null,
          Longitude: longitude || null,
          assembly,
        },
      });

      toast({
        variant: "success",
        title: "Location Added",
      });

      onSuccess?.();

      if (finish) {
        resetAll();
        onClose();
      } else {
        resetLocationFields(); // 👈 allow multiple add
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.response?.data?.error?.message || "Failed to create location",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add Location"
      open={open}
      onCancel={() => {
        resetAll();
        onClose();
      }}
      footer={null}
    >
      <div className="space-y-4">
        {/* 👇 SHOW ONLY IF assemblyId NOT provided */}
        {!assemblyId && (
          <>
            <Select
              placeholder="Select District"
              className="w-full"
              value={district}
              onChange={(val) => {
                setDistrict(val);
                setAssembly(undefined);
              }}
            >
              {districts.map((d: any) => (
                <Select.Option key={d.documentId} value={d.documentId}>
                  {d.district_name}
                </Select.Option>
              ))}
            </Select>

            <Select
              placeholder="Select Assembly"
              className="w-full"
              value={assembly}
              disabled={!district}
              onChange={setAssembly}
            >
              {assemblies.map((a: any) => (
                <Select.Option key={a.documentId} value={a.documentId}>
                  {a.Assembly_Name}
                </Select.Option>
              ))}
            </Select>
          </>
        )}

        {/* Location fields */}
        <Input
          placeholder="PS Name"
          value={psName}
          onChange={(e) => setPsName(e.target.value)}
        />

        <Input
          placeholder="PS No."
          value={psNo}
          onChange={(e) => setPsNo(e.target.value)}
        />

        <Input
          placeholder="Village / Location"
          value={psLocation}
          onChange={(e) => setPsLocation(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
          <Input
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>

        <div className="flex justify-between mt-4">
          <Button onClick={onClose}>Cancel</Button>

          <div className="flex gap-2">
            <Button loading={loading} onClick={() => saveLocation(false)}>
              Save & Add Another
            </Button>

            <Button
              type="primary"
              loading={loading}
              onClick={() => saveLocation(true)}
            >
              Save & Finish
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
