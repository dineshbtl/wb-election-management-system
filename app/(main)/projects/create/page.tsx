"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CreateProjectPage() {
  const [name, setName] = useState("");
  const [state, setState] = useState("Ongoing");
  const [startDate, setStartDate] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/projects", {
        data: {
          project_name: name,
          state,
          start_date: startDate, // ✅ include date in request
        },
      });
      alert("✅ Project created successfully!");
      router.push("/projects");
    } catch (error) {
      console.error("❌ Error creating project:", error);
      alert("Failed to create project");
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create New Project</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <div>
          <label className="block mb-1 font-medium">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
            className="border p-2 w-full rounded"
            required
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block mb-1 font-medium">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        {/* Project State */}
        <div>
          <label className="block mb-1 font-medium">Project State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Create Project
        </button>
      </form>
    </div>
  );
}
