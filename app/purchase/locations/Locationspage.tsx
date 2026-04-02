// app/purchase/locations/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { ModernSidebar } from "@/components/layout/modern-sidebar";
import { ModernHeader } from "@/components/layout/modern-header";
import { ModernCard } from "@/components/ui/modern-card";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building,
  Bus,
  Navigation,
  Search,
  X,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface Division {
  id: string;
  name: string;
  code: string;
  region: string;
  depots: number;
  status: "active" | "inactive";
  description?: string;
  documentId: string;
}

interface Depot {
  id: number;
  documentId: string;
  name: string;
  code: string;
  division: string; // Store documentId of Division
  divisionName: string;
  address: string;
  busStations: number;
  status: "active" | "inactive";
  contactPerson?: string;
  phone?: string;
}

interface BusStation {
  id: string;
  name: string;
  depot: string; // Store documentId of Depot
  depotName: string;
  division: string; // Store documentId of Division
  divisionName: string;
  address: string;
  latitude: number;
  longitude: number;
  busStands: number;
  status: "active" | "inactive";
  facilities?: string[];
  documentId: string;
}

interface BusStand {
  id: string;
  name: string;
  platformNumber: string;
  busStation: string; // Store documentId of BusStation
  busStationName: string;
  depot: string; // Store documentId of Depot
  depotName: string;
  division: string; // Store documentId of Division
  divisionName: string;
  capacity: number;
  status: "active" | "inactive";
  type?: string;
  documentId: string;
}

export default function LocationsPage() {
  const [activeTab, setActiveTab] = useState("divisions");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [allDepots, setAllDepots] = useState<Depot[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  const [allBusStations, setAllBusStations] = useState<BusStation[]>([]);
  const [busStations, setBusStations] = useState<BusStation[]>([]);

  const [allBusStands, setAllBusStands] = useState<BusStand[]>([]);
  const [busStands, setBusStands] = useState<BusStand[]>([]);

  // useEffect(() => {
  //   fetchDivisions(page, pageSize).then((pagination) => {
  //     if (pagination) setTotal(pagination.total);
  //   });
  // }, [page, pageSize]);

  const [pagination, setPagination] = useState({
    divisions: { page: 1, pageSize: 50, total: 0 },
    depots: { page: 1, pageSize: 50, total: 0 },
    "bus-stations": { page: 1, pageSize: 50, total: 0 },
    "bus-stands": { page: 1, pageSize: 50, total: 0 },
  });

  useEffect(() => {
    switch (activeTab) {
      case "divisions":
        fetchAllDivisions();
        break;
      case "depots":
        fetchAllDepots();
        break;
      case "bus-stations":
        fetchAllBusStations();
        break;
      case "bus-stands":
        fetchAllBusStands();
        break;
    }
  }, [activeTab]);

  // 🔹 Fetch ALL divisions (no pagination)
  const fetchAllDivisions = async () => {
    try {
      const res = await api.get(`/divisions?pagination[pageSize]=10000`);
      const sorted = res.data.data
        .map((item: any) => ({
          id: item.id,
          documentId: item.documentId,
          name: item.name || "",
          code: item.code || "",
          region: item.region || "",
          description: item.description || "",
          depots: item.depots?.length || 0,
          status: item.status || "inactive",
        }))
        .sort((a: Division, b: Division) => a.name.localeCompare(b.name));
      setDivisions(sorted);
      setAllDivisions(sorted);
    } catch (err) {
      console.error("Error fetching all divisions:", err);
    }
  };

  const searchItems = async (
    type: string,
    query: string,
    page = 1,
    pageSize = 50
  ) => {
    try {
      const res = await api.get(`/${type}`, {
        params: {
          filters: { name: { $containsi: query } },
          pagination: { page, pageSize },
          populate: "*",
        },
      });

      const data = res.data.data.map((item: any) => {
        switch (type) {
          case "divisions":
            return {
              id: item.id,
              documentId: item.documentId,
              name: item.name || "",
              code: item.code || "",
              region: item.region || "",
              description: item.description || "",
              status: item.status || "inactive",
            };

          case "depots":
            return {
              id: item.id,
              documentId: item.documentId,
              name: item.name || "",
              code: item.code || "",
              address: item.address || "",
              contactPerson: item.contactPerson || "",
              phone: item.phone || "",
              division: item.division?.documentId?.toString() || "", // Use documentId
              divisionName: item.division?.name || "N/A",
              status: item.status || "inactive",
            };

          case "bus-stations":
            return {
              id: item.id,
              documentId: item.documentId,
              name: item.name || "",
              address: item.address || "",
              latitude: item.latitude || "",
              longitude: item.longitude || "",
              facilities: item.facilities || [],
              division: item.division?.documentId?.toString() || "", // Use documentId
              divisionName: item.division?.name || "N/A",
              depot: item.depot?.documentId?.toString() || "", // Use documentId
              depotName: item.depot?.name || "N/A",
              status: item.status || "inactive",
            };

          case "bus-stands":
            return {
              id: item.id,
              documentId: item.documentId,
              name: item.name || "",
              type: item.type || "",
              capacity: item.capacity || 0,
              platformNumber: item.platformNumber || "",
              division: item.division?.documentId?.toString() || "", // Use documentId
              divisionName: item.division?.name || "N/A",
              depot: item.depot?.documentId?.toString() || "", // Use documentId
              depotName: item.depot?.name || "N/A",
              busStation: item.bus_station?.documentId?.toString() || "", // Use documentId
              busStationName: item.bus_station?.name || "N/A",
              status: item.status || "inactive",
            };

          default:
            return item;
        }
      });

      if (type === "divisions") setDivisions(data);
      if (type === "depots") setDepots(data);
      if (type === "bus-stations") setBusStations(data);
      if (type === "bus-stands") setBusStands(data);

      const totalRes = await api.get(`/${type}`, {
        params: { pagination: { page: 1, pageSize: 1 } },
      });

      setPagination((prev) => ({
        ...prev,
        [type]: {
          ...res.data.meta.pagination,
          overallTotal: totalRes.data.meta.pagination.total,
        },
      }));
    } catch (err) {
      console.error(`❌ Search failed for ${type}`, err);
    }
  };

  // 🔹 Fetch Divisions (with pagination)
  const fetchDivisions = async (page = 1, pageSize = 10) => {
    try {
      const res = await api.get("/divisions", {
        params: {
          pagination: { page, pageSize },
        },
      });

      const data = res.data.data.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        name: item.name || "",
        code: item.code || "",
        region: item.region || "",
        description: item.description || "",
        depots: item.depots?.length || 0,
        status: item.status || "inactive",
      }));

      setDivisions(data);
      setPagination((prev) => ({
        ...prev,
        divisions: {
          ...prev.divisions,
          page,
          pageSize,
          total: res.data.meta.pagination.total,
        },
      }));
    } catch (err) {
      console.error("❌ Error fetching divisions:", err);
    }
  };

  // 🔹 Fetch Depots (with pagination)
  const fetchDepots = async (page = 1, pageSize = 10) => {
    try {
      const res = await api.get(`/depots`, {
        params: {
          populate: ["division"],
          pagination: { page, pageSize },
        },
      });

      const data = res.data.data.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        name: item.name || "",
        code: item.code || "",
        address: item.address || "",
        division: item.division?.documentId?.toString() || "", // Use documentId
        divisionName: item.division?.name || "N/A",
        contactPerson: item.contactPerson || "",
        phone: item.phone || "",
        busStations: item.busStations?.length || 0,
        status: item.status || "inactive",
      }));

      setDepots(data);
      setPagination((prev) => ({
        ...prev,
        depots: {
          page,
          pageSize,
          total: res.data.meta.pagination.total,
        },
      }));
    } catch (err) {
      console.error("❌ Error fetching depots:", err);
    }
  };

  // 🔹 Fetch Bus Stations (with pagination)
  const fetchBusStations = async (page = 1, pageSize = 10) => {
    try {
      const res = await api.get(`/bus-stations`, {
        params: {
          populate: ["division", "depot"],
          pagination: { page, pageSize },
        },
      });

      const data = res.data.data.map((station: any) => ({
        id: station.id,
        documentId: station.documentId,
        name: station.name || "",
        address: station.address || "",
        latitude: station.latitude || "",
        longitude: station.longitude || "",
        facilities: station.facilities || [],
        division: station.division?.documentId?.toString() || "", // Use documentId
        divisionName: station.division?.name || "N/A",
        depot: station.depot?.documentId?.toString() || "", // Use documentId
        depotName: station.depot?.name || "N/A",
        busStands: station.busStands?.length || 0,
        status: station.status || "inactive",
      }));

      setBusStations(data);
      setPagination((prev) => ({
        ...prev,
        "bus-stations": {
          page,
          pageSize,
          total: res.data.meta.pagination.total,
        },
      }));
    } catch (err) {
      console.error("❌ Error fetching bus stations:", err);
    }
  };

  // 🔹 Fetch Bus Stands (with pagination)
  const fetchBusStands = async (page = 1, pageSize = 10) => {
    try {
      const res = await api.get(`/bus-stands`, {
        params: {
          populate: ["division", "depot", "bus_station"],
          pagination: { page, pageSize },
        },
      });

      const data = res.data.data.map((stand: any) => ({
        id: stand.id,
        documentId: stand.documentId,
        name: stand.name || "",
        platformNumber: stand.platformNumber || "",
        capacity: stand.capacity || 0,
        type: stand.type || "",
        division: stand.division?.documentId?.toString() || "", // Use documentId
        divisionName: stand.division?.name || "N/A",
        depot: stand.depot?.documentId?.toString() || "", // Use documentId
        depotName: stand.depot?.name || "N/A",
        busStation: stand.bus_station?.documentId?.toString() || "", // Use documentId
        busStationName: stand.bus_station?.name || "N/A",
        status: stand.status || "inactive",
      }));

      setBusStands(data);
      setPagination((prev) => ({
        ...prev,
        "bus-stands": {
          page,
          pageSize,
          total: res.data.meta.pagination.total,
        },
      }));
    } catch (err) {
      console.error("❌ Error fetching bus stands:", err);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() !== "") {
      searchItems(
        activeTab,
        searchTerm,
        pagination[activeTab].page,
        pagination[activeTab].pageSize
      );
    } else {
      switch (activeTab) {
        case "divisions":
          fetchDivisions(
            pagination.divisions.page,
            pagination.divisions.pageSize
          );
          break;
        case "depots":
          fetchDepots(pagination.depots.page, pagination.depots.pageSize);
          break;
        case "bus-stations":
          fetchBusStations(
            pagination["bus-stations"].page,
            pagination["bus-stations"].pageSize
          );
          break;

          break;
        case "bus-stands":
          fetchBusStands(
            pagination["bus-stands"].page,
            pagination["bus-stands"].pageSize
          );
          break;

          break;
      }
    }
  }, [
    searchTerm,
    activeTab,
    pagination[activeTab].page,
    pagination[activeTab].pageSize,
  ]);

  // 🔹 Fetch ALL depots
  const fetchAllDepots = async () => {
    try {
      const res = await api.get(
        `/depots?populate=division&pagination[pageSize]=10000`
      );
      const data = res.data.data.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        name: item.name || "",
        code: item.code || "",
        address: item.address || "",
        division: item.division?.documentId?.toString() || "", // Use documentId
        divisionName: item.division?.name || "N/A",
        contactPerson: item.contactPerson || "",
        phone: item.phone || "",
        status: item.status || "inactive",
      }));
      setDepots(data);
      setAllDepots(data);
    } catch (err) {
      console.error("❌ Error fetching all depots:", err);
    }
  };

  // 🔹 Fetch ALL bus stations
  const fetchAllBusStations = async () => {
    try {
      const res = await api.get(
        `/bus-stations?populate=*&pagination[pageSize]=10000`
      );
      const data = res.data.data.map((station: any) => ({
        id: station.id,
        documentId: station.documentId,
        name: station.name || "",
        address: station.address || "",
        latitude: station.latitude || "",
        longitude: station.longitude || "",
        facilities: station.facilities || [],
        division: station.division?.documentId?.toString() || "", // Use documentId
        divisionName: station.division?.name || "N/A",
        depot: station.depot?.documentId?.toString() || "", // Use documentId
        depotName: station.depot?.name || "N/A",
        busStands: station.busStands?.length || 0,
        status: station.status || "inactive",
      }));
      setBusStations(data);
      setAllBusStations(data);
    } catch (err) {
      console.error("Error fetching all bus stations:", err);
    }
  };

  // 🔹 Fetch ALL bus stands
  const fetchAllBusStands = async () => {
    try {
      const res = await api.get(
        `/bus-stands?populate=*&pagination[pageSize]=10000`
      );
      const data = res.data.data.map((stand: any) => ({
        id: stand.id,
        documentId: stand.documentId,
        name: stand.name || "",
        platformNumber: stand.platformNumber || "",
        capacity: stand.capacity || 0,
        type: stand.type || "",
        division: stand.division?.documentId?.toString() || "", // Use documentId
        divisionName: stand.division?.name || "N/A",
        depot: stand.depot?.documentId?.toString() || "", // Use documentId
        depotName: stand.depot?.name || "N/A",
        busStation: stand.bus_station?.documentId?.toString() || "", // Use documentId
        busStationName: stand.bus_station?.name || "N/A",
        status: stand.status || "inactive",
      }));
      setBusStands(data);
      setAllBusStands(data);
    } catch (err) {
      console.error("Error fetching all bus stands:", err);
    }
  };

  

  // useEffect(() => {
  //   Promise.all([
  //     fetchAllDivisions(),
  //     fetchAllDepots(),
  //     fetchAllBusStations(),
  //     fetchAllBusStands(),
  //   ]).catch((error) => {
  //     console.error("Error fetching initial data:", error);
  //   });
  // }, []);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    region: "",
    division: "",
    depot: "",
    busStation: "",
    address: "",
    latitude: "",
    longitude: "",
    platformNumber: "",
    capacity: "",
    description: "",
    contactPerson: "",
    phone: "",
    facilities: [] as string[],
    type: "",
  });

  const findDivisionId = (divisionName: string, divisions: any[]) => {
    const cleaned = normalize(divisionName);

    let found = divisions.find((div) => normalize(div.name) === cleaned);
    if (found) return found.documentId;

    found = divisions.find((div) => normalize(div.name).includes(cleaned));
    if (found) {
      console.warn(
        `⚠️ Using partial match: "${divisionName}" → "${found.name}"`
      );
      return found.documentId;
    }

    found = divisions.find((div) => cleaned.includes(normalize(div.name)));
    if (found) {
      console.warn(
        `⚠️ Using reverse match: "${divisionName}" → "${found.name}"`
      );
      return found.documentId;
    }

    console.error(`❌ Division "${divisionName}" not found`);
    return null;
  };

  const handleAdd = async (type: string) => {
    try {
      if (!formData.name) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Name is required",
        });
        return;
      }

      switch (type) {
        case "divisions":
          if (!formData.region) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Region is required",
            });
            return;
          }
          const divisionPayload = {
            data: {
              name: formData.name,
              code: formData.code || "",
              region: formData.region,
              description: formData.description,
            },
          };
          await api.post("/divisions", divisionPayload, {
            headers: { "Content-Type": "application/json" },
          });
          fetchDivisions();
          toast({
            variant: "success",
            title: "Division Created",
            description: `${formData.name} has been successfully created`,
          });
          break;

        case "depots":
          let depotDivisionId = formData.division;
          if (!depotDivisionId) {
            if (divisions.length === 0) {
              toast({
                variant: "destructive",
                title: "Validation Error",
                description:
                  "No divisions exist. Please create a division first.",
              });
              return;
            }
            const defaultDivision =
              divisions.find((div) => div.name === "Ahilyanagar") ||
              divisions[0];
            depotDivisionId = defaultDivision.documentId; // Use documentId
          }

          const depotPayload = {
            data: {
              name: formData.name,
              code: formData.code || "",
              division: depotDivisionId, // Use documentId
              address: formData.address,
              contactPerson: formData.contactPerson,
              phone: formData.phone,
              state: "active",
            },
          };
          await api.post("/depots", depotPayload);
          fetchDepots();
          toast({
            variant: "success",
            title: "Depot Created",
            description: `${formData.name} has been successfully created`,
          });
          break;

        case "bus-stations":
          if (!formData.division || !formData.depot) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Division and depot are required",
            });
            return;
          }
          if (!Array.isArray(formData.facilities)) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Facilities must be a valid list",
            });
            return;
          }
          const busStationsPayload = {
            data: {
              name: formData.name,
              depot: formData.depot, // Use documentId
              division: formData.division, // Use documentId
              address: formData.address,
              latitude: formData.latitude,
              longitude: formData.longitude,
              facilities: formData.facilities,
            },
          };
          await api.post("/bus-stations", busStationsPayload);
          fetchBusStations();
          toast({
            variant: "success",
            title: "Bus Station Created",
            description: `${formData.name} has been successfully created`,
          });
          break;

        case "bus-stands":
          if (
            !formData.platformNumber ||
            !formData.division ||
            !formData.depot ||
            !formData.busStation
          ) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description:
                "Name, platform number, division, depot, and bus station are required",
            });
            return;
          }
          const busStandPayload = {
            data: {
              name: formData.name,
              platformNumber: formData.platformNumber,
              bus_station: formData.busStation, // Use documentId
              depot: formData.depot, // Use documentId
              division: formData.division, // Use documentId
              capacity: Number.parseInt(formData.capacity) || 0,
              type: formData.type || "",
            },
          };
          await api.post("/bus-stands", busStandPayload);
          fetchBusStands();
          toast({
            variant: "success",
            title: "Bus Stand Created",
            description: `${formData.name} has been successfully created`,
          });
          break;
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error(`Error creating ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          `Failed to create ${type.slice(0, -1)}. Please try again.`,
      });
    }
  };

  const handleEdit = (item: any) => {
    console.log("Editing item:", item);
    setEditingItem(item);
    setFormData({
      ...item,
      division: item.division?.toString() || "", // Use documentId
      depot: item.depot?.toString() || "", // Use documentId
      busStation: item.busStation?.toString() || "", // Use documentId
      latitude: item.latitude?.toString() || "",
      longitude: item.longitude?.toString() || "",
      capacity: item.capacity?.toString() || "",
      facilities: Array.isArray(item.facilities)
        ? item.facilities
        : item.facilities && typeof item.facilities === "object"
        ? Object.entries(item.facilities)
            .filter(([_, value]) => value === true)
            .map(([key]) => key)
        : [],
    });
    setIsAddDialogOpen(true);
  };

  const handleUpdate = async (type: string) => {
    try {
      if (!formData.name) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Name is required",
        });
        return;
      }

      if (!editingItem?.documentId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid item selected for update",
        });
        console.error("No documentId found for editingItem:", editingItem);
        return;
      }

      console.log(
        `Updating ${type} with documentId: ${editingItem.documentId}`,
        formData
      );

      switch (type) {
        case "divisions":
          if (!formData.region) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Region is required",
            });
            return;
          }
          const divisionPayload = {
            data: {
              name: formData.name,
              code: formData.code || "",
              region: formData.region,
              description: formData.description,
            },
          };
          await api.put(
            `/divisions/${editingItem.documentId}`,
            divisionPayload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          fetchDivisions();
          toast({
            variant: "success",
            title: "Division Updated",
            description: `${formData.name} has been successfully updated`,
          });
          break;

        case "depots":
          let depotDivisionId = formData.division;
          if (!depotDivisionId) {
            if (divisions.length === 0) {
              toast({
                variant: "destructive",
                title: "Validation Error",
                description:
                  "No divisions exist. Please create a division first.",
              });
              return;
            }
            const defaultDivision =
              divisions.find((div) => div.name === "Ahilyanagar") ||
              divisions[0];
            depotDivisionId = defaultDivision.documentId;
          }

          const depotPayload = {
            data: {
              name: formData.name,
              code: formData.code || "",
              division: depotDivisionId,
              address: formData.address,
              contactPerson: formData.contactPerson,
              phone: formData.phone,
              state: editingItem.status || "inactive",
            },
          };

          // ✅ Use documentId instead of id
          await api.put(`/depots/${editingItem.documentId}`, depotPayload, {
            headers: { "Content-Type": "application/json" },
          });

          fetchDepots();
          toast({
            variant: "success",
            title: "Depot Updated",
            description: `${formData.name} has been successfully updated`,
          });
          break;

        case "bus-stations":
          if (!formData.division || !formData.depot) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Division and depot are required",
            });
            return;
          }
          const busStationsPayload = {
            data: {
              name: formData.name,
              depot: formData.depot,
              division: formData.division,
              address: formData.address,
              latitude: formData.latitude,
              longitude: formData.longitude,
              facilities: Array.isArray(formData.facilities)
                ? formData.facilities
                : [],
            },
          };
          await api.put(
            `/bus-stations/${editingItem.documentId}`,
            busStationsPayload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          fetchBusStations();
          toast({
            variant: "success",
            title: "Bus Station Updated",
            description: `${formData.name} has been successfully updated`,
          });
          break;

        case "bus-stands":
          const busStationId = Number.parseInt(formData.busStation);
          if (!busStationId || isNaN(busStationId)) {
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Invalid bus station selected",
            });
            return;
          }
          const busStandPayload = {
            data: {
              name: formData.name,
              platformNumber: formData.platformNumber,
              bus_stations: busStationId,
              depot: Number.parseInt(formData.depot) || 0,
              divisions: Number.parseInt(formData.division) || 0,
              capacity: Number.parseInt(formData.capacity) || 0,
              type: formData.type || "",
            },
          };
          await api.put(
            `/bus-stands/${editingItem.documentId}`,
            busStandPayload,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          fetchBusStands();
          toast({
            variant: "success",
            title: "Bus Stand Updated",
            description: `${formData.name} has been successfully updated`,
          });
          break;

        default:
          throw new Error(`Invalid type: ${type}`);
      }

      setIsAddDialogOpen(false);
      setEditingItem(null);
      resetForm();
    } catch (error: any) {
      console.error(`Error updating ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          `Failed to update ${type.slice(0, -1)}. Please try again.`,
      });
    }
  };

  const handleDelete = async (id: string, type: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      switch (type) {
        case "division":
          await api.delete(`/divisions/${id}`); // id is documentId
          setDivisions(divisions.filter((div) => div.documentId !== id));
          break;
        case "depot":
          await api.delete(`/depots/${id}`); // id is documentId
          setDepots(depots.filter((depot) => depot.documentId !== id));
          break;
        case "bus-station":
          await api.delete(`/bus-stations/${id}`); // id is documentId
          setBusStations(
            busStations.filter((station) => station.documentId !== id)
          );
          break;
        case "bus-stand":
          await api.delete(`/bus-stands/${id}`); // id is documentId
          setBusStands(busStands.filter((stand) => stand.documentId !== id));
          break;
      }

      toast({
        variant: "success",
        title: "Item Deleted",
        description: `${name} has been successfully deleted`,
      });
    } catch (error: any) {
      console.error(`Error deleting ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.error?.message ||
          `Failed to delete ${type}. Please try again.`,
      });
    }
  };

  // Convert Excel coordinate values into a normalized string
  const normalizeCoordinate = (value: string | number): string | null => {
    if (!value) return null;

    if (typeof value === "number") {
      return value.toString(); // already decimal
    }

    let str = value.trim().replace(/,/g, "").replace(/°/g, "° ");

    // Decimal with N/E/S/W (e.g., "19.2267 N")
    const decimalRegex = /^([0-9.+-]+)\s*°?\s*([NSEW])?$/i;
    const decimalMatch = str.match(decimalRegex);
    if (decimalMatch) {
      let num = parseFloat(decimalMatch[1]);
      const dir = decimalMatch[2]?.toUpperCase();
      if (dir === "S" || dir === "W") num *= -1;
      return num.toString();
    }

    // DMS format (e.g., "19°06'05.9\"N")
    const dmsRegex = /^(\d+)°\s*(\d+)'?\s*([\d.]+)"?\s*([NSEW])?$/i;
    const dmsMatch = str.match(dmsRegex);
    if (dmsMatch) {
      const deg = parseFloat(dmsMatch[1]);
      const min = parseFloat(dmsMatch[2]);
      const sec = parseFloat(dmsMatch[3]);
      let num = deg + min / 60 + sec / 3600;
      const dir = dmsMatch[4]?.toUpperCase();
      if (dir === "S" || dir === "W") num *= -1;
      return num.toString();
    }

    // If already decimal
    if (!isNaN(Number(str))) return str;

    console.warn("⚠️ Unrecognized coordinate:", value);
    return str;
  };

  const handleBulkImport = async () => {
    if (!bulkFile) {
      console.error("❌ No file selected for bulk import");
      return;
    }

    try {
      const reader = new FileReader();

      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows: {
          division: string;
          depot: string;
          busStation: string;
          busStand: string;
          Address: string;
          Latitude: string;
          Longitude: string;
        }[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        console.log(`📥 Parsed ${rows.length} rows`);

        for (const row of rows) {
          try {
            // 1️⃣ Division
            let divisionRes = await api.get("/divisions", {
              params: { filters: { name: row.division.trim() } },
            });

            let divisionId;
            if (divisionRes.data.data.length > 0) {
              divisionId = divisionRes.data.data[0].documentId.toString();
            } else {
              const newDivision = await api.post("/divisions", {
                data: { name: row.division.trim(), region: "Western" },
              });
              divisionId = newDivision.data.data.documentId;
              console.log(`✅ Created Division: ${row.division}`);
            }

            // 2️⃣ Depot
            let depotRes = await api.get("/depots", {
              params: {
                filters: {
                  name: { $eq: row.depot.trim() },
                  division: { documentId: { $eq: divisionId } },
                },
              },
            });

            let depotId;
            if (depotRes.data.data.length > 0) {
              depotId = depotRes.data.data[0].documentId;
            } else {
              const newDepot = await api.post("/depots", {
                data: {
                  name: row.depot.trim(),
                  division: divisionId, // Use documentId
                  code: row.depot.trim().slice(0, 5).toUpperCase(),
                  address: row.Address || "",
                  contactPerson: "",
                  phone: "",
                  state: "inactive",
                },
              });
              depotId = newDepot.data.data.documentId;
              console.log(`✅ Created Depot: ${row.depot}`);
            }

            // 3️⃣ Bus Station
            let stationRes = await api.get("/bus-stations", {
              params: {
                filters: {
                  name: { $eq: row.busStation.trim() },
                  division: { documentId: { $eq: divisionId } },
                  depot: { documentId: { $eq: depotId } },
                },
              },
            });

            let stationId;
            if (stationRes.data.data.length > 0) {
              stationId = stationRes.data.data[0].documentId;
            } else {
              const latitude = normalizeCoordinate(row.Latitude);
              const longitude = normalizeCoordinate(row.Longitude);
              const newStation = await api.post("/bus-stations", {
                data: {
                  name: row.busStation.trim(),
                  division: divisionId, // Use documentId
                  depot: depotId, // Use documentId
                  address: row.Address,
                  latitude,
                  longitude,
                },
              });
              stationId = newStation.data.data.documentId;
              console.log(`✅ Created Bus Station: ${row.busStation}`);
            }

            // 4️⃣ Bus Stand
            let standRes = await api.get("/bus-stands", {
              params: {
                filters: {
                  name: { $containsi: row.busStand.trim() },
                  division: { documentId: { $eq: divisionId } },
                  depot: { documentId: { $eq: depotId } },
                  bus_station: { documentId: { $eq: stationId } },
                },
              },
            });

            if (standRes.data.data.length === 0) {
              try {
                const uniqueName = `${row.busStand.trim()} (${row.depot.trim()} - ${row.busStation.trim()})`;
                const newStand = await api.post("/bus-stands", {
                  data: {
                    name: uniqueName,
                    division: divisionId, // Use documentId
                    depot: depotId, // Use documentId
                    bus_station: stationId, // Use documentId
                  },
                });
                console.log(`✅ Created Bus Stand: ${newStand.data.data.name}`);
              } catch (err: any) {
                if (
                  err.response?.data?.error?.message ===
                  "This attribute must be unique"
                ) {
                  console.warn(
                    `⚠️ Bus Stand "${row.busStand}" already exists, skipping`
                  );
                } else {
                  throw err;
                }
              }
            } else {
              console.log(
                `⏭ Skipped existing Bus Stand: ${row.busStand} under ${row.depot} / ${row.busStation}`
              );
            }
          } catch (err: any) {
            console.error(
              `🚨 Error processing row: ${row.division} → ${row.depot} → ${row.busStation} → ${row.busStand}`,
              err?.response?.data || err.message
            );
          }
        }

        toast({
          variant: "success",
          title: "Bulk Import Complete",
          description: `Imported ${rows.length} rows successfully.`,
        });

        setIsBulkImportDialogOpen(false);
        setBulkFile(null);

        fetchDivisions();
        fetchDepots();
        fetchBusStations();
        fetchBusStands();
      };

      reader.readAsArrayBuffer(bulkFile);
    } catch (error) {
      console.error("🚨 Bulk import failed:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Something went wrong while importing.",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      region: "",
      division: "",
      depot: "",
      busStation: "",
      address: "",
      latitude: "",
      longitude: "",
      platformNumber: "",
      capacity: "",
      description: "",
      contactPerson: "",
      phone: "",
      facilities: [],
      type: "",
    });
  };

  const getStatusBadge = (status: string) => (
    <Badge
      className={
        status === "active"
          ? "bg-green-100 text-green-800 border-green-200 text-xs sm:text-sm"
          : "bg-red-100 text-red-800 border-red-200 text-xs sm:text-sm"
      }
    >
      {status}
    </Badge>
  );

  const addFacility = (facility: string) => {
    if (facility) {
      setFormData((prev) => ({
        ...prev,
        facilities: Array.isArray(prev.facilities)
          ? [...prev.facilities.filter((f) => f !== facility), facility]
          : [facility],
      }));
    }
  };

  const removeFacility = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: Array.isArray(prev.facilities)
        ? prev.facilities.filter((f) => f !== facility)
        : [],
    }));
  };

  const renderAddForm = () => {
    switch (activeTab) {
      case "divisions":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Division Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter division name"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Division Code
                </Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Enter division code"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Region *
              </Label>
              <Select
                value={formData.region}
                onValueChange={(value) =>
                  setFormData({ ...formData, region: value })
                }
              >
                <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Western">Western</SelectItem>
                  <SelectItem value="Eastern">Eastern</SelectItem>
                  <SelectItem value="Northern">Northern</SelectItem>
                  <SelectItem value="Southern">Southern</SelectItem>
                  <SelectItem value="Central">Central</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter division description"
                className="min-h-[80px] sm:min-h-[100px] bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base resize-none"
              />
            </div>
          </div>
        );

      case "depots":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Depot Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter depot name"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Depot Code
                </Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Enter depot code"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Division
              </Label>
              <Select
                value={formData.division}
                onValueChange={(value) =>
                  setFormData({ ...formData, division: value })
                }
              >
                <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((div) => (
                    <SelectItem key={div.documentId} value={div.documentId}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Address
              </Label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter depot address"
                className="min-h-[80px] bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Contact Person
                </Label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="Enter contact person name"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
        );

      case "bus-stations":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Bus Station Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter bus station name"
                className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Division *
                </Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) =>
                    setFormData({ ...formData, division: value, depot: "" })
                  }
                >
                  <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.length > 0 ? (
                      divisions.map((div) => (
                        <SelectItem key={div.documentId} value={div.documentId}>
                          {div.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500 text-sm">
                        No divisions available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Depot *
                </Label>
                <Select
                  value={formData.depot}
                  onValueChange={(value) =>
                    setFormData({ ...formData, depot: value })
                  }
                  disabled={!formData.division}
                >
                  <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select depot" />
                  </SelectTrigger>
                  <SelectContent>
                    {depots.filter(
                      (depot) => depot.division === formData.division
                    ).length > 0 ? (
                      depots
                        .filter((depot) => depot.division === formData.division)
                        .map((depot) => (
                          <SelectItem
                            key={depot.documentId}
                            value={depot.documentId}
                          >
                            {depot.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-gray-500 text-sm">
                        {formData.division
                          ? "No depots available for this division"
                          : "Select a division first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Address
              </Label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter bus station address"
                className="min-h-[80px] bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Latitude
                </Label>
                <Input
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData({ ...formData, latitude: e.target.value })
                  }
                  placeholder="Enter latitude"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Longitude
                </Label>
                <Input
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData({ ...formData, longitude: e.target.value })
                  }
                  placeholder="Enter longitude"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Facilities
              </Label>
              <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                {Array.isArray(formData.facilities) &&
                formData.facilities.length > 0 ? (
                  formData.facilities.map((facility) => (
                    <Badge
                      key={facility}
                      className="bg-purple-100 text-purple-800 border-purple-200 text-xs"
                    >
                      {facility}
                      <button
                        type="button"
                        onClick={() => removeFacility(facility)}
                        className="ml-1 sm:ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <div className="text-gray-500 text-xs">
                    No facilities selected
                  </div>
                )}
              </div>
              <Select onValueChange={addFacility}>
                <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                  <SelectValue placeholder="Add facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Waiting Area">Waiting Area</SelectItem>
                  <SelectItem value="Restrooms">Restrooms</SelectItem>
                  <SelectItem value="Food Court">Food Court</SelectItem>
                  <SelectItem value="Parking">Parking</SelectItem>
                  <SelectItem value="ATM">ATM</SelectItem>
                  <SelectItem value="Medical Aid">Medical Aid</SelectItem>
                  <SelectItem value="Information Desk">
                    Information Desk
                  </SelectItem>
                  <SelectItem value="WiFi">WiFi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "bus-stands":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Bus Stand Name *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter bus stand name"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Platform Number *
                </Label>
                <Input
                  value={formData.platformNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, platformNumber: e.target.value })
                  }
                  placeholder="Enter platform number"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Division *
                </Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      division: value,
                      depot: "",
                      busStation: "",
                    })
                  }
                >
                  <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.length > 0 ? (
                      divisions.map((div) => (
                        <SelectItem key={div.documentId} value={div.documentId}>
                          {div.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500 text-sm">
                        No divisions available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Depot *
                </Label>
                <Select
                  value={formData.depot}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      depot: value,
                      busStation: "",
                    })
                  }
                  disabled={!formData.division}
                >
                  <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select depot" />
                  </SelectTrigger>
                  <SelectContent>
                    {depots.filter(
                      (depot) => depot.division === formData.division
                    ).length > 0 ? (
                      depots
                        .filter((depot) => depot.division === formData.division)
                        .map((depot) => (
                          <SelectItem
                            key={depot.documentId}
                            value={depot.documentId}
                          >
                            {depot.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-gray-500 text-sm">
                        {formData.division
                          ? "No depots available for this division"
                          : "Select a division first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Bus Station *
                </Label>
                <Select
                  value={formData.busStation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, busStation: value })
                  }
                  disabled={!formData.depot}
                >
                  <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select bus station" />
                  </SelectTrigger>
                  <SelectContent>
                    {busStations.filter(
                      (station) => station.depot === formData.depot
                    ).length > 0 ? (
                      busStations
                        .filter((station) => station.depot === formData.depot)
                        .map((station) => (
                          <SelectItem
                            key={station.documentId}
                            value={station.documentId}
                          >
                            {station.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="p-2 text-gray-500 text-sm">
                        {formData.depot
                          ? "No bus stations available for this depot"
                          : "Select a depot first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Capacity
                </Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="Enter bus capacity"
                  className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Service Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Long Distance">Long Distance</SelectItem>
                    <SelectItem value="City Service">City Service</SelectItem>
                    <SelectItem value="Express Service">
                      Express Service
                    </SelectItem>
                    <SelectItem value="Local Service">Local Service</SelectItem>
                    <SelectItem value="Intercity">Intercity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen ">
      <main className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ModernCard className="p-4 sm:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 sm:mb-6 gap-4">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:max-w-2xl bg-white/50 backdrop-blur-sm h-auto sm:h-12 p-2">
                  <TabsTrigger
                    value="divisions"
                    className="text-xs sm:text-sm font-medium py-2 sm:py-0"
                  >
                    Divisions
                  </TabsTrigger>
                  <TabsTrigger
                    value="depots"
                    className="text-xs sm:text-sm font-medium py-2 sm:py-0"
                  >
                    Depots
                  </TabsTrigger>
                  <TabsTrigger
                    value="bus-stations"
                    className="text-xs sm:text-sm font-medium py-2 sm:py-0"
                  >
                    Bus Stations
                  </TabsTrigger>
                  <TabsTrigger
                    value="bus-stands"
                    className="text-xs sm:text-sm font-medium py-2 sm:py-0"
                  >
                    Bus Stands
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 sm:h-12 bg-white/80 backdrop-blur-sm border-white/30 rounded-xl text-sm sm:text-base w-full"
                    />
                  </div>

                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={(open) => {
                      console.log("Add/Edit dialog open:", open);
                      setIsAddDialogOpen(open);
                      if (!open) {
                        setEditingItem(null);
                        resetForm();
                      }
                    }}
                  >
                    <DialogContent
                      aria-describedby={undefined}
                      className="w-[95vw] sm:max-w-md bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-white/30"
                    >
                      <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900">
                          {editingItem ? "Edit" : "Add"}{" "}
                          {activeTab.replace("-", " ")}
                        </DialogTitle>
                      </DialogHeader>

                      {/* 👇 use the same renderAddForm() here */}
                      <div className="py-4">{renderAddForm()}</div>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-white/30">
                        <PillButton
                          variant="secondary"
                          onClick={() => setIsAddDialogOpen(false)}
                          className="h-10 sm:h-12 px-4 sm:px-6"
                        >
                          Cancel
                        </PillButton>
                        <PillButton
                          variant="accent"
                          onClick={() =>
                            editingItem
                              ? handleUpdate(activeTab)
                              : handleAdd(activeTab)
                          }
                          className="h-10 sm:h-12 px-4 sm:px-6"
                        >
                          {editingItem ? "Update" : "Add"}
                        </PillButton>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isBulkImportDialogOpen}
                    onOpenChange={(open) => {
                      console.log("Bulk import dialog open:", open);
                      setIsBulkImportDialogOpen(open);
                      if (!open) {
                        setBulkFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }
                    }}
                  ></Dialog>
                </div>
              </div>

              <TabsContent value="divisions" className="space-y-3 sm:space-y-4">
                {divisions.map((division, index) => (
                  <motion.div
                    key={division.documentId} // Use documentId
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl sm:rounded-2xl hover:bg-white/70 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                      <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                        <Building className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-gray-900">
                          {division.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Code: {division.code} • Region: {division.region} •{" "}
                          {division.depots} depots
                        </p>
                        {division.description && (
                          <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                            {division.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 mt-3 sm:mt-0">
                      {getStatusBadge(division.status)}
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(division);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </PillButton>
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleDelete(
                            division.documentId,
                            "division",
                            division.name
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </PillButton>
                    </div>
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent value="depots" className="space-y-3 sm:space-y-4">
                {depots.map((depot, index) => (
                  <motion.div
                    key={depot.documentId} // Use documentId
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl sm:rounded-2xl hover:bg-white/70 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                      <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-gray-900">
                          {depot.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Code: {depot.code} • Division: {depot.divisionName} •{" "}
                          {depot.busStations} bus stations
                        </p>
                        <p className="text-xs text-gray-500">{depot.address}</p>
                        {depot.contactPerson && (
                          <p className="text-xs text-gray-500 hidden sm:block">
                            Contact: {depot.contactPerson}{" "}
                            {depot.phone && `• ${depot.phone}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 mt-3 sm:mt-0">
                      {getStatusBadge(depot.status)}
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(depot);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </PillButton>
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleDelete(depot.documentId, "depot", depot.name)
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </PillButton>
                    </div>
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent
                value="bus-stations"
                className="space-y-3 sm:space-y-4"
              >
                {busStations
                  .filter((station) =>
                    station.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((station, index) => (
                    <motion.div
                      key={station.documentId} // Use documentId
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl sm:rounded-2xl hover:bg-white/70 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                        <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                          <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg text-gray-900">
                            {station.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Depot: {station.depotName} • Division:{" "}
                            {station.divisionName} • {station.busStands} bus
                            stands
                          </p>
                          <p className="text-xs text-gray-500">
                            {station.address}
                            {station.latitude && station.longitude
                              ? ` • GPS: ${Number(station.latitude).toFixed(
                                  4
                                )}, ${Number(station.longitude).toFixed(4)}`
                              : " • GPS: N/A"}
                          </p>
                          {station.facilities &&
                            Array.isArray(station.facilities) &&
                            station.facilities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {station.facilities
                                  .slice(0, 3)
                                  .map((facility, idx) => (
                                    <Badge
                                      key={idx}
                                      className="bg-purple-100 text-purple-800 border-purple-200 text-xs"
                                    >
                                      {facility}
                                    </Badge>
                                  ))}
                                {station.facilities.length > 3 && (
                                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                                    +{station.facilities.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 mt-3 sm:mt-0">
                        {getStatusBadge(station.status)}
                        <PillButton
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(station);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </PillButton>
                        <PillButton
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleDelete(
                              station.documentId,
                              "bus-station",
                              station.name
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </PillButton>
                      </div>
                    </motion.div>
                  ))}
              </TabsContent>

              <TabsContent
                value="bus-stands"
                className="space-y-3 sm:space-y-4"
              >
                {busStands
                  .filter((stand) =>
                    stand.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((stand, index) => (
                    <motion.div
                      key={stand.documentId} // Use documentId
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl sm:rounded-2xl hover:bg-white/70 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                        <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                          <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg text-gray-900">
                            {stand.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Platform: {stand.platformNumber} • Station:{" "}
                            {stand.busStationName} • Capacity: {stand.capacity}
                          </p>
                          <p className="text-xs text-gray-500">
                            Depot: {stand.depotName} • Division:{" "}
                            {stand.divisionName}
                          </p>
                          {stand.type && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs mt-1">
                              {stand.type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3 mt-3 sm:mt-0">
                        {getStatusBadge(stand.status)}
                        <PillButton
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(stand);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </PillButton>
                        <PillButton
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleDelete(
                              stand.documentId,
                              "bus-stand",
                              stand.name
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </PillButton>
                      </div>
                    </motion.div>
                  ))}
              </TabsContent>
            </Tabs>
          </ModernCard>
        </motion.div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <select
              value={pagination[activeTab].pageSize}
              onChange={(e) =>
                setPagination((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    pageSize: Number(e.target.value),
                    page: 1, // reset to first page
                  },
                }))
              }
              className="border rounded px-2 py-1"
            >
              {[50, 100, 150, 200].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <span className="text-sm text-gray-600">Entries per page</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={pagination[activeTab].page === 1}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    page: prev[activeTab].page - 1,
                  },
                }))
              }
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from(
              {
                length: Math.ceil(
                  pagination[activeTab].total / pagination[activeTab].pageSize
                ),
              },
              (_, i) => (
                <button
                  key={i + 1}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      [activeTab]: { ...prev[activeTab], page: i + 1 },
                    }))
                  }
                  className={`px-3 py-1 border rounded ${
                    pagination[activeTab].page === i + 1
                      ? "bg-blue-500 text-white"
                      : ""
                  }`}
                >
                  {i + 1}
                </button>
              )
            )}
            <button
              disabled={
                pagination[activeTab].page >=
                Math.ceil(
                  pagination[activeTab].total / pagination[activeTab].pageSize
                )
              }
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    page: prev[activeTab].page + 1,
                  },
                }))
              }
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
