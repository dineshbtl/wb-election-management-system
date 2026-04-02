import { strapiConfig, type StrapiResponse, type StrapiError } from "./strapi-config"

class StrapiAPI {
  private baseUrl: string
  private token?: string

  constructor() {
    this.baseUrl = strapiConfig.apiUrl
    this.token = strapiConfig.token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error: StrapiError = await response.json()
        throw new Error(error.error.message || "API request failed")
      }

      return await response.json()
    } catch (error) {
      console.error("Strapi API Error:", error)
      throw error
    }
  }

  // Authentication
  async login(identifier: string, password: string) {
    return this.request("/auth/local", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    })
  }

  async register(userData: {
    username: string
    email: string
    password: string
    fullName: string
    employeeId: string
    division: string
    depot: string
  }) {
    return this.request("/auth/local/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  // Divisions
  async getDivisions() {
    return this.request<StrapiResponse<any[]>>("/divisions?populate=*")
  }

  async createDivision(data: { name: string; code: string; region: string }) {
    return this.request("/divisions", {
      method: "POST",
      body: JSON.stringify({ data }),
    })
  }

  // Depots
  async getDepots(divisionId?: number) {
    const query = divisionId ? `?filters[division][id][$eq]=${divisionId}&populate=*` : "?populate=*"
    return this.request<StrapiResponse<any[]>>(`/depots${query}`)
  }

  async createDepot(data: {
    name: string
    code: string
    address?: string
    division: number
  }) {
    return this.request("/depots", {
      method: "POST",
      body: JSON.stringify({ data }),
    })
  }

  // Bus Stations
  async getBusStations(depotId?: number) {
    const query = depotId ? `?filters[depot][id][$eq]=${depotId}&populate=*` : "?populate=*"
    return this.request<StrapiResponse<any[]>>(`/bus-stations${query}`)
  }

  async createBusStation(data: {
    name: string
    address?: string
    latitude?: number
    longitude?: number
    depot: number
  }) {
    return this.request("/bus-stations", {
      method: "POST",
      body: JSON.stringify({ data }),
    })
  }

  // Bus Stands
  async getBusStands(busStationId?: number) {
    const query = busStationId ? `?filters[busStation][id][$eq]=${busStationId}&populate=*` : "?populate=*"
    return this.request<StrapiResponse<any[]>>(`/bus-stands${query}`)
  }

  async createBusStand(data: {
    name: string
    platformNumber?: string
    capacity?: number
    busStation: number
  }) {
    return this.request("/bus-stands", {
      method: "POST",
      body: JSON.stringify({ data }),
    })
  }

  // Surveys
  async getSurveys(filters?: {
    division?: number
    depot?: number
    status?: string
    surveyor?: number
    page?: number
    pageSize?: number
  }) {
    let query = "?populate=*"

    if (filters) {
      const filterParams = []
      if (filters.division) filterParams.push(`filters[division][id][$eq]=${filters.division}`)
      if (filters.depot) filterParams.push(`filters[depot][id][$eq]=${filters.depot}`)
      if (filters.status) filterParams.push(`filters[status][$eq]=${filters.status}`)
      if (filters.surveyor) filterParams.push(`filters[surveyor][id][$eq]=${filters.surveyor}`)
      if (filters.page) filterParams.push(`pagination[page]=${filters.page}`)
      if (filters.pageSize) filterParams.push(`pagination[pageSize]=${filters.pageSize}`)

      if (filterParams.length > 0) {
        query += "&" + filterParams.join("&")
      }
    }

    return this.request<StrapiResponse<any[]>>(`/surveys${query}`)
  }

  async getSurvey(id: number) {
    return this.request<StrapiResponse<any>>(`/surveys/${id}?populate=*`)
  }

  async createSurvey(data: {
    surveyId: string
    surveyPurpose: string
    surveyDate: string
    status: string
    gpsLatitude?: number
    gpsLongitude?: number
    notes?: string
    division: number
    depot: number
    busStation: number
    busStand: number
    surveyor: number
  }) {
    return this.request("/surveys", {
      method: "POST",
      body: JSON.stringify({ data }),
    })
  }

  async updateSurvey(
    id: number,
    data: Partial<{
      surveyPurpose: string
      completionDate: string
      status: string
      gpsLatitude: number
      gpsLongitude: number
      notes: string
    }>,
  ) {
    return this.request(`/surveys/${id}`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    })
  }

  async deleteSurvey(id: number) {
    return this.request(`/surveys/${id}`, {
      method: "DELETE",
    })
  }

  // Camera Installations
  async getCameraInstallations(surveyId?: number) {
    const query = surveyId ? `?filters[survey][id][$eq]=${surveyId}&populate=*` : "?populate=*"
    return this.request<StrapiResponse<any[]>>(`/camera-installations${query}`)
  }

  async createCameraInstallation(data: {
    cameraType: string
    serialNumber?: string
    poleLocation: string
    distanceBetweenCameras?: number
    workStatus: string
    status: string
    survey: number
  }) {
    return this.request("/camera-installations", {
      method: "POST",
      body: JSON.stringify({ data }),
    })
  }

  async updateCameraInstallation(
    id: number,
    data: Partial<{
      cameraType: string
      serialNumber: string
      poleLocation: string
      distanceBetweenCameras: number
      workStatus: string
      installationDate: string
      status: string
    }>,
  ) {
    return this.request(`/camera-installations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    })
  }

  // Survey Photos
  async uploadSurveyPhoto(
    file: File,
    surveyId: number,
    metadata?: {
      photoType?: string
      gpsLatitude?: number
      gpsLongitude?: number
      capturedAt?: string
    },
  ) {
    const formData = new FormData()
    formData.append("files", file)

    // First upload the file
    const uploadResponse = await fetch(`${this.baseUrl.replace("/api", "")}/upload`, {
      method: "POST",
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error("File upload failed")
    }

    const uploadedFiles = await uploadResponse.json()
    const uploadedFile = uploadedFiles[0]

    // Then create the survey photo record
    return this.request("/survey-photos", {
      method: "POST",
      body: JSON.stringify({
        data: {
          photo: uploadedFile.id,
          survey: surveyId,
          ...metadata,
        },
      }),
    })
  }

  async getSurveyPhotos(surveyId: number) {
    return this.request<StrapiResponse<any[]>>(`/survey-photos?filters[survey][id][$eq]=${surveyId}&populate=*`)
  }

  // Analytics and Reports
  async getDashboardStats() {
    const [surveys, cameras, users] = await Promise.all([
      this.getSurveys(),
      this.getCameraInstallations(),
      this.request<StrapiResponse<any[]>>("/users?populate=*"),
    ])

    return {
      totalSurveys: surveys.data.length,
      completedSurveys: surveys.data.filter((s) => s.attributes.status === "completed").length,
      pendingSurveys: surveys.data.filter((s) => s.attributes.status === "pending").length,
      totalCameras: cameras.data.length,
      onlineCameras: cameras.data.filter((c) => c.attributes.status === "active").length,
      offlineCameras: cameras.data.filter((c) => c.attributes.status === "offline").length,
      activeSurveyors: users.data.filter((u) => u.attributes.isActive).length,
    }
  }

  async getDivisionStats() {
    const surveys = await this.getSurveys()
    const divisions = await this.getDivisions()

    return divisions.data.map((division) => {
      const divisionSurveys = surveys.data.filter((s) => s.attributes.division.data.id === division.id)

      return {
        id: division.id,
        name: division.attributes.name,
        totalSurveys: divisionSurveys.length,
        completedSurveys: divisionSurveys.filter((s) => s.attributes.status === "completed").length,
        pendingSurveys: divisionSurveys.filter((s) => s.attributes.status === "pending").length,
        completionRate:
          divisionSurveys.length > 0
            ? Math.round(
                (divisionSurveys.filter((s) => s.attributes.status === "completed").length / divisionSurveys.length) *
                  100,
              )
            : 0,
      }
    })
  }
}

export const strapiAPI = new StrapiAPI()
