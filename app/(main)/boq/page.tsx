"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import api from "@/lib/api"; // your axios instance

type Boq = {
  id: number;
  division?: { name: string };
  depot?: { name: string };
  bus_station?: { name: string };
  bus_stand?: { name: string };
  nvr_selection?: { id: number; count: number }[];
};

type RefData = {
  divisions: { id: number; name: string }[];
  depots: { id: number; name: string }[];
  stations: { id: number; name: string }[];
  stands: { id: number; name: string }[];
  nvrs: { id: number; name: string }[];
  cameras: { id: number; name: string }[];
  switches: { id: number; name: string; documentId: string }[]; // ✅ NEW
  racks: { id: number; name: string; documentId: string }[]; // ✅ NEW
  poles: { id: number; name: string; documentId: string }[]; // ✅ NEW
  weatherproofBoxes: { id: number; name: string; documentId: string }[]; // ✅ NEW
  cables: { id: number; name: string; documentId: string }[]; // ✅
  conduits: { id: number; name: string; documentId: string }[]; // ✅
  wires: { id: number; name: string; documentId: string }[];
  ups: { id: number; name: string; documentId: string }[]; // ✅ NEW
  lcds: { id: number; name: string; documentId: string }[]; // ✅ NEW
};

export default function UploadBoqPage() {
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [boqs, setBoqs] = useState<Boq[]>([]);

  // ✅ fetch BOQs
  const fetchBoqs = async () => {
    try {
      const res = await api.get(
        `/boqs?populate[division]=true&populate[depot]=true&populate[bus_station]=true&populate[bus_stand]=true&populate[nvr_selection][populate][nvr]=true&populate[camera_selection][populate][camera]=true&populate[switch_selection][populate][switch]=true&populate[rack_selection][populate][rack]=true&populate[pole_selection][populate][pole]=true&populate[wpf_selection][populate][weatherproof_box]=true&populate[cable_selection][populate][cable]=true&populate[conduit_selection][populate][conduit]=true&populate[wire_selection][populate][wire]=true&populate[ups_selection][populate][up]=true&populate[lcd_selection][populate][lcd]=true`
      );

      setBoqs(res.data.data);
    } catch (err) {
      console.error("Error fetching BOQs:", err);
    }
  };

  // fetch BOQs on mount
  useEffect(() => {
    fetchBoqs();
  }, []);

  // ✅ fetch reference data
  const fetchReferenceData = async (): Promise<RefData> => {
    const [
      divisions,
      depots,
      stations,
      stands,
      nvrs,
      cameras,
      switches,
      racks,
      poles,
      weatherproofBoxes,
      cables,
      conduits,
      wires,
      ups, // ✅ add this
      lcds,
    ] = await Promise.all([
      api.get(`/divisions?pagination[pageSize]=1000`),
      api.get(`/depots?pagination[pageSize]=1000`),
      api.get(`/bus-stations?pagination[pageSize]=1000`),
      api.get(`/bus-stands?pagination[pageSize]=1000`),
      api.get(`/nvrs?pagination[pageSize]=1000`),
      api.get(`/cameras?pagination[pageSize]=1000`), // ✅ fetch cameras
      api.get(`/switches?pagination[pageSize]=1000`), // ✅ fetch switches
      api.get(`/racks?pagination[pageSize]=1000`), // ✅ NEW
      api.get(`/poles?pagination[pageSize]=1000`), // ✅ NEW
      api.get(`/weatherproof-boxes?pagination[pageSize]=1000`), // ✅ NEW
      api.get(`/cables?pagination[pageSize]=1000`), // ✅
      api.get(`/conduits?pagination[pageSize]=1000`), // ✅
      api.get(`/wires?pagination[pageSize]=1000`),
      api.get(`/upss?pagination[pageSize]=1000`), // ✅ NEW
      api.get(`/lcds?pagination[pageSize]=1000`), // ✅ NEW
    ]);

    const mapData = (list: any[]) =>
      list.data.data.map((x: any) => ({
        id: x.id,
        documentId: x.documentId,
        name: x.name,
      }));

    return {
      divisions: mapData(divisions),
      depots: mapData(depots),
      stations: mapData(stations),
      stands: mapData(stands),
      nvrs: mapData(nvrs),
      cameras: mapData(cameras),
      switches: mapData(switches),
      racks: mapData(racks),
      poles: mapData(poles),
      weatherproofBoxes: mapData(weatherproofBoxes),
      cables: mapData(cables), // ✅
      conduits: mapData(conduits), // ✅
      wires: mapData(wires), // ✅
      ups: mapData(ups), // ✅
      lcds: mapData(lcds),
    };
  };

  // ✅ read excel into JSON
  const readExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

        // normalize keys
        const normalized = json.map((row) => {
          const newRow: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            newRow[key.trim().toLowerCase()] = row[key];
          });
          return newRow;
        });

        resolve(normalized);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // ✅ map row → BOQ
  // ✅ map row → BOQ
  const mapRowToBoq = (row: any, refs: RefData) => {
    const normalize = (str: string) =>
      str?.toString().trim().replace(/\s+/g, " ").toLowerCase();

    const divisionName = row["division"]?.toString().trim();
    const depotName = row["depot"]?.toString().trim();
    const stationName = row["busstation"]?.toString().trim();
    const standShort = row["busstand"]?.toString().trim();

    const division = refs.divisions.find(
      (d) => normalize(d.name) === normalize(divisionName)
    );
    const depot = refs.depots.find(
      (d) => normalize(d.name) === normalize(depotName)
    );
    const station = refs.stations.find(
      (s) => normalize(s.name) === normalize(stationName)
    );

    let busStand;
    if (depotName && stationName && standShort) {
      const busStandName = `${standShort} (${depotName} - ${stationName})`;
      busStand = refs.stands.find(
        (s) => normalize(s.name) === normalize(busStandName)
      );
    }

    // ✅ NVR selections
    // ✅ NVR selections (dynamic from Strapi)
    const nvr_selection: { documentId: string; count: number }[] = [];
    refs.nvrs.forEach((nvr) => {
      const colName = nvr.name.toLowerCase(); // e.g., "8 ch nvr"
      const count = row[colName];
      if (count && Number(count) > 0) {
        nvr_selection.push({
          documentId: nvr.documentId,
          count: Number(count),
        });
      }
    });

    // ✅ Camera selections (dynamic from Strapi)
    const camera_selection: { documentId: string; count: number }[] = [];
    refs.cameras.forEach((camera) => {
      const colName = camera.name.toLowerCase(); // e.g., "bullet camera"
      const count = row[colName];
      if (count && Number(count) > 0) {
        camera_selection.push({
          documentId: camera.documentId,
          count: Number(count),
        });
      }
    });

    const switch_selection: { documentId: string; count: number }[] = [];
    refs.switches.forEach((sw) => {
      const colName = sw.name.toLowerCase(); // e.g., "8 port switch"
      const count = row[colName];
      if (count && Number(count) > 0) {
        switch_selection.push({
          documentId: sw.documentId,
          count: Number(count),
        });
      }
    });

    const rack_selection: { documentId: string; count: number }[] = [];
    refs.racks.forEach((rack) => {
      const colName = rack.name.toLowerCase(); // e.g., "4u rack"
      const count = row[colName];
      if (count && Number(count) > 0) {
        rack_selection.push({
          documentId: rack.documentId,
          count: Number(count),
        });
      }
    });

    const pole_selection: { documentId: string; count: number }[] = [];
    refs.poles.forEach((pole) => {
      const colName = pole.name.toLowerCase(); // e.g., "6mtr pole"
      const count = row[colName];
      if (count && Number(count) > 0) {
        pole_selection.push({
          documentId: pole.documentId,
          count: Number(count),
        });
      }
    });

    const wpf_selection: { documentId: string; count: number }[] = [];
    refs.weatherproofBoxes.forEach((wpf) => {
      const colName = wpf.name.toLowerCase(); // e.g., "weatherproof box"
      const count = row[colName];
      if (count && Number(count) > 0) {
        wpf_selection.push({
          documentId: wpf.documentId,
          count: Number(count),
        });
      }
    });

    const cable_selection: { documentId: string; count: number }[] = [];
    refs.cables.forEach((cable) => {
      const colName = cable.name.toLowerCase();
      const count = row[colName];
      if (count && Number(count) > 0) {
        cable_selection.push({
          documentId: cable.documentId,
          count: Number(count),
        });
      }
    });

    const conduit_selection: { documentId: string; count: number }[] = [];
    refs.conduits.forEach((conduit) => {
      const colName = conduit.name.toLowerCase();
      const count = row[colName];
      if (count && Number(count) > 0) {
        conduit_selection.push({
          documentId: conduit.documentId,
          count: Number(count),
        });
      }
    });

    const wire_selection: { documentId: string; count: number }[] = [];
    refs.wires.forEach((wire) => {
      const colName = wire.name.toLowerCase();
      const count = row[colName];
      if (count && Number(count) > 0) {
        wire_selection.push({
          documentId: wire.documentId,
          count: Number(count),
        });
      }
    });

    const ups_selection: { documentId: string; count: number }[] = [];
    refs.ups.forEach((ups) => {
      const colName = ups.name.toLowerCase(); // e.g., "6kv ups"
      const count = row[colName];
      if (count && Number(count) > 0) {
        ups_selection.push({
          documentId: ups.documentId,
          count: Number(count),
        });
      }
    });

    const lcd_selection: { documentId: string; count: number }[] = [];
    refs.lcds.forEach((lcd) => {
      const colName = lcd.name.toLowerCase(); // e.g., "43\"lcd"
      const count = row[colName];
      if (count && Number(count) > 0) {
        lcd_selection.push({
          documentId: lcd.documentId,
          count: Number(count),
        });
      }
    });

    const payload = {
      division: division ? { connect: [division.documentId] } : null,
      depot: depot ? { connect: [depot.documentId] } : null,
      bus_station: station ? { connect: [station.documentId] } : null,
      bus_stand: busStand ? { connect: [busStand.documentId] } : null,
      nvr_selection: nvr_selection.map((n) => ({
        nvr: { connect: [n.documentId] },
        count: n.count,
      })),
      camera_selection: camera_selection.map((c) => ({
        camera: { connect: [c.documentId] },
        count: c.count,
      })),
      switch_selection: switch_selection.map((sw) => ({
        // ✅
        switch: { connect: [sw.documentId] },
        count: sw.count,
      })),

      rack_selection: rack_selection.map((r) => ({
        rack: { connect: [r.documentId] },
        count: r.count,
      })), // ✅ NEW

      pole_selection: pole_selection.map((p) => ({
        pole: { connect: [p.documentId] },
        count: p.count,
      })), // ✅ NEW

      wpf_selection: wpf_selection.map((w) => ({
        weatherproof_box: { connect: [w.documentId] },
        count: w.count,
      })), // ✅ NEW

      cable_selection: cable_selection.map((c) => ({
        cable: { connect: [c.documentId] },
        count: c.count,
      })),
      conduit_selection: conduit_selection.map((c) => ({
        conduit: { connect: [c.documentId] },
        count: c.count,
      })),
      wire_selection: wire_selection.map((w) => ({
        wire: { connect: [w.documentId] },
        count: w.count,
      })),
      ups_selection: ups_selection.map((u) => ({
        up: { connect: [u.documentId] },
        count: u.count,
      })),
      lcd_selection: lcd_selection.map((l) => ({
        lcd: { connect: [l.documentId] },
        count: l.count,
      })),
    };

    console.log("📦 Final BOQ Payload:", payload);
    return payload;
  };

  // ✅ upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    setLog([]);

    try {
      const rows = await readExcel(e.target.files[0]);
      const refs = await fetchReferenceData();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const boqData = mapRowToBoq(row, refs);

        try {
          await api.post(`/boqs`, { data: boqData });
          setLog((prev) => [...prev, `✅ Row ${i + 1} uploaded`]);
        } catch (err: any) {
          setLog((prev) => [...prev, `❌ Row ${i + 1} failed: ${err.message}`]);
        }
      }

      // refresh BOQs after upload
      await fetchBoqs();
    } catch (err: any) {
      setLog((prev) => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Upload BOQs (Excel)</h1>

      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />

      {uploading && <p className="mt-4 text-blue-600">Uploading...</p>}

      <div className="mt-4 space-y-1">
        {log.map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>

      <h2 className="text-lg font-bold mt-6 mb-2">Existing BOQs</h2>
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Division</th>
            <th className="border px-2 py-1">Depot</th>
            <th className="border px-2 py-1">Bus Station</th>
            <th className="border px-2 py-1">Bus Stand</th>
            <th className="border px-2 py-1">NVRs</th>
            <th className="border px-2 py-1">Cameras</th>
            <th className="border px-2 py-1">Switches</th>
            <th className="border px-2 py-1">Racks</th>
            <th className="border px-2 py-1">Poles</th>
            <th className="border px-2 py-1">Weatherproof Boxes</th>
            <th className="border px-2 py-1">Cables</th>
            <th className="border px-2 py-1">Conduits</th>
            <th className="border px-2 py-1">Wires</th>
            <th className="border px-2 py-1">UPS</th>
            <th className="border px-2 py-1">LCDs</th>
          </tr>
        </thead>
        <tbody>
          {boqs.map((b: any) => (
            <tr key={b.id}>
              <td className="border px-2 py-1">{b.id}</td>
              <td className="border px-2 py-1">{b.division?.name || "-"}</td>
              <td className="border px-2 py-1">{b.depot?.name || "-"}</td>
              <td className="border px-2 py-1">{b.bus_station?.name || "-"}</td>
              <td className="border px-2 py-1">{b.bus_stand?.name || "-"}</td>
              <td className="border px-2 py-1">
                {b.nvr_selection
                  ?.map((n: any) => `${n.nvr?.name || "Unknown"} ×${n.count}`)
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.camera_selection
                  ?.map(
                    (c: any) => `${c.camera?.name || "Unknown"} ×${c.count}`
                  )
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.switch_selection
                  ?.map(
                    (sw: any) => `${sw.switch?.name || "Unknown"} ×${sw.count}`
                  )
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.rack_selection
                  ?.map((r: any) => `${r.rack?.name || "Unknown"} ×${r.count}`)
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.pole_selection
                  ?.map((p: any) => `${p.pole?.name || "Unknown"} ×${p.count}`)
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.wpf_selection
                  ?.map(
                    (w: any) =>
                      `${w.weatherproof_box?.name || "Unknown"} ×${w.count}`
                  )
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.cable_selection
                  ?.map((c: any) => `${c.cable?.name || "Unknown"} ×${c.count}`)
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.conduit_selection
                  ?.map(
                    (c: any) => `${c.conduit?.name || "Unknown"} ×${c.count}`
                  )
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.wire_selection
                  ?.map((w: any) => `${w.wire?.name || "Unknown"} ×${w.count}`)
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.ups_selection
                  ?.map((u: any) => `${u.up?.name || "Unknown"} ×${u.count}`)
                  .join(", ") || "-"}
              </td>
              <td className="border px-2 py-1">
                {b.lcd_selection
                  ?.map(
                    (l: any) =>
                      `${l.lcd?.name || "Unknown"} (₹${l.lcd?.price || 0}) ×${
                        l.count
                      }`
                  )
                  .join(", ") || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
