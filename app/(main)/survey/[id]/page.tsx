"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Camera, User, Edit, Download, CheckCircle, Navigation } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SurveyDetails({ params }: { params: { id: string } }) {
  // Mock data - in real app, fetch based on params.id
  const surveyData = {
    id: "SRV001",
    location: "Pune Central Bus Station",
    division: "Pune",
    depot: "Pune Central",
    busStation: "Central Bus Station",
    busStand: "Platform 1-5",
    status: "Completed",
    surveyor: "Rajesh Kumar",
    surveyDate: "2024-01-15",
    completionDate: "2024-01-15",
    surveyPurpose: "New Installation",
    cameraType: "Bullet Camera",
    serialNumber: "CAM-PUN-001-004",
    poleLocation: "Main entrance, 3m height",
    distanceBetweenCameras: "30",
    workStatus: "Survey Completed",
    gpsLocation: {
      lat: 18.5204,
      lng: 73.8567,
    },
    notes:
      "Excellent location for camera installation. Clear line of sight. Power supply available nearby. Recommended for immediate installation.",
    photos: [
      "/placeholder.svg?height=200&width=300",
      "/placeholder.svg?height=200&width=300",
      "/placeholder.svg?height=200&width=300",
      "/placeholder.svg?height=200&width=300",
    ],
    cameras: [
      {
        id: 1,
        type: "Bullet",
        position: "Main Entrance",
        status: "Planned",
      },
      {
        id: 2,
        type: "Dome",
        position: "Platform Area",
        status: "Planned",
      },
      {
        id: 3,
        type: "PTZ",
        position: "Parking Area",
        status: "Planned",
      },
      {
        id: 4,
        type: "ANPR",
        position: "Exit Gate",
        status: "Planned",
      },
    ],
  }

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
              <h1 className="text-xl font-semibold text-gray-900">Survey Details</h1>
              <p className="text-sm text-gray-500">Survey ID: {surveyData.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={surveyData.status === "Completed" ? "default" : "secondary"}>{surveyData.status}</Badge>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Location Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Division</p>
                  <p className="text-sm text-gray-900">{surveyData.division}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Depot</p>
                  <p className="text-sm text-gray-900">{surveyData.depot}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bus Station</p>
                  <p className="text-sm text-gray-900">{surveyData.busStation}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bus Stand</p>
                  <p className="text-sm text-gray-900">{surveyData.busStand}</p>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">GPS Coordinates</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {surveyData.gpsLocation.lat}, {surveyData.gpsLocation.lng}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Survey Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Surveyor</p>
                  <p className="text-sm text-gray-900">{surveyData.surveyor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Survey Date</p>
                  <p className="text-sm text-gray-900">{surveyData.surveyDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Purpose</p>
                  <p className="text-sm text-gray-900">{surveyData.surveyPurpose}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Work Status</p>
                  <Badge variant="outline">{surveyData.workStatus}</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Completed on {surveyData.completionDate}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Camera Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Camera Installation Plan</span>
            </CardTitle>
            <CardDescription>Planned camera locations and specifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {surveyData.cameras.map((camera) => (
                <div key={camera.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Camera className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{camera.type} Camera</h3>
                      <p className="text-sm text-gray-500">{camera.position}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{camera.status}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Distance Between Cameras</p>
                  <p className="text-gray-900">{surveyData.distanceBetweenCameras}m</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Primary Camera Type</p>
                  <p className="text-gray-900">{surveyData.cameraType}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Serial Number</p>
                  <p className="text-gray-900">{surveyData.serialNumber}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Pole Location</p>
                  <p className="text-gray-900">{surveyData.poleLocation}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Site Photos</CardTitle>
            <CardDescription>Photos captured during the survey with GPS coordinates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {surveyData.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <Image
                    src={photo || "/placeholder.svg"}
                    alt={`Survey photo ${index + 1}`}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="text-xs">GPS</Badge>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <Button variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      View Full Size
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Survey Notes</CardTitle>
            <CardDescription>Additional observations and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-900">{surveyData.notes}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Survey
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          <Button>
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve for Installation
          </Button>
        </div>
      </div>
    </div>
  )
}
