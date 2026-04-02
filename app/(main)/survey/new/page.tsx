"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Camera,
  Upload,
  Save,
  ArrowLeft,
  Navigation,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function NewSurvey() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [formData, setFormData] = useState({
    division: "",
    depot: "",
    busStation: "",
    busStand: "",
    surveyPurpose: "",
    cameraType: "",
    serialNumber: "",
    poleLocation: "",
    distanceBetweenCameras: "",
    workStatus: "",
    notes: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [gpsStatus, setGpsStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    // Get GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsStatus("success");
        },
        (error) => {
          console.error("GPS Error:", error);
          setGpsStatus("error");
        }
      );
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, submit to API with GPS coordinates and photos
    console.log("Survey Data:", { ...formData, location, photos });
    alert("Survey submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                New Site Survey
              </h1>
              <p className="text-sm text-gray-500">
                CCTV Installation Survey Form
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Navigation className="w-4 h-4" />
            <Badge
              variant={
                gpsStatus === "success"
                  ? "default"
                  : gpsStatus === "error"
                  ? "destructive"
                  : "secondary"
              }
            >
              {gpsStatus === "success"
                ? "GPS Active"
                : gpsStatus === "error"
                ? "GPS Error"
                : "Getting GPS..."}
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Location Information</span>
              </CardTitle>
              <CardDescription>
                Basic location and administrative details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) =>
                    setFormData({ ...formData, division: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pune">Pune</SelectItem>
                    <SelectItem value="mumbai">Mumbai</SelectItem>
                    <SelectItem value="nashik">Nashik</SelectItem>
                    <SelectItem value="nagpur">Nagpur</SelectItem>
                    <SelectItem value="aurangabad">Aurangabad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="depot">Depot Name</Label>
                <Select
                  value={formData.depot}
                  onValueChange={(value) =>
                    setFormData({ ...formData, depot: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Depot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central">Central Depot</SelectItem>
                    <SelectItem value="eastern">Eastern Depot</SelectItem>
                    <SelectItem value="western">Western Depot</SelectItem>
                    <SelectItem value="northern">Northern Depot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="busStation">Bus Station</Label>
                <Input
                  id="busStation"
                  value={formData.busStation}
                  onChange={(e) =>
                    setFormData({ ...formData, busStation: e.target.value })
                  }
                  placeholder="Enter bus station name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="busStand">Bus Stand</Label>
                <Input
                  id="busStand"
                  value={formData.busStand}
                  onChange={(e) =>
                    setFormData({ ...formData, busStand: e.target.value })
                  }
                  placeholder="Enter bus stand name"
                  required
                />
              </div>

              {location && (
                <div className="md:col-span-2 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      GPS Location Captured
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Lat: {location.lat.toFixed(6)}, Lng:{" "}
                    {location.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Survey Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Survey Details</span>
              </CardTitle>
              <CardDescription>
                Camera specifications and installation details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surveyPurpose">Survey Purpose</Label>
                <Select
                  value={formData.surveyPurpose}
                  onValueChange={(value) =>
                    setFormData({ ...formData, surveyPurpose: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-installation">
                      New Installation
                    </SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="relocation">Relocation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cameraType">Camera Type</Label>
                <Select
                  value={formData.cameraType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cameraType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Camera Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullet">Bullet Camera</SelectItem>
                    <SelectItem value="dome">Dome Camera</SelectItem>
                    <SelectItem value="ptz">PTZ Camera</SelectItem>
                    <SelectItem value="anpr">ANPR Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  placeholder="Enter camera serial number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="poleLocation">Pole Location</Label>
                <Input
                  id="poleLocation"
                  value={formData.poleLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, poleLocation: e.target.value })
                  }
                  placeholder="Describe pole location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="distanceBetweenCameras">
                  Distance Between Cameras (meters)
                </Label>
                <Input
                  id="distanceBetweenCameras"
                  type="number"
                  value={formData.distanceBetweenCameras}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      distanceBetweenCameras: e.target.value,
                    })
                  }
                  placeholder="30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workStatus">Work Status/Progress</Label>
                <Select
                  value={formData.workStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, workStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="survey-completed">
                      Survey Completed
                    </SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending-approval">
                      Pending Approval
                    </SelectItem>
                    <SelectItem value="ready-for-installation">
                      Ready for Installation
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Photo Documentation</span>
              </CardTitle>
              <CardDescription>
                Upload photos with GPS location data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="photos">Upload Photos</Label>
                  <Input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="mt-2"
                  />
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo) || "/placeholder.svg"}
                          alt={`Survey photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Badge className="absolute top-1 right-1 text-xs">
                          GPS
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>
                Any additional observations or comments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Enter any additional notes, observations, or special requirements..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button type="submit" disabled={gpsStatus !== "success"}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit Survey
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
