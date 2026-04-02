import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Mock survey detail data - in real app, query from database
  const surveyDetail = {
    id: params.id,
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
    notes: "Excellent location for camera installation. Clear line of sight. Power supply available nearby.",
    photos: [
      "/placeholder.svg?height=200&width=300",
      "/placeholder.svg?height=200&width=300",
      "/placeholder.svg?height=200&width=300",
      "/placeholder.svg?height=200&width=300",
    ],
    cameras: [
      { id: 1, type: "Bullet", position: "Main Entrance", status: "Planned" },
      { id: 2, type: "Dome", position: "Platform Area", status: "Planned" },
      { id: 3, type: "PTZ", position: "Parking Area", status: "Planned" },
      { id: 4, type: "ANPR", position: "Exit Gate", status: "Planned" },
    ],
  }

  return NextResponse.json({ survey: surveyDetail })
}
