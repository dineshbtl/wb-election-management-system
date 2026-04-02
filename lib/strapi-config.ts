// Strapi Configuration for CCTV Survey Application
export const strapiConfig = {
  apiUrl: process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337/api",
  uploadUrl: process.env.NEXT_PUBLIC_STRAPI_UPLOAD_URL || "http://localhost:1337/uploads",
  token: process.env.STRAPI_API_TOKEN,
}

// Content Type Definitions for Strapi
export interface StrapiUser {
  id: number
  attributes: {
    username: string
    email: string
    fullName: string
    employeeId: string
    division: string
    depot: string
    role: "admin" | "supervisor" | "surveyor"
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiDivision {
  id: number
  attributes: {
    name: string
    code: string
    region: string
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiDepot {
  id: number
  attributes: {
    name: string
    code: string
    address?: string
    division: {
      data: StrapiDivision
    }
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiBusStation {
  id: number
  attributes: {
    name: string
    address?: string
    latitude?: number
    longitude?: number
    depot: {
      data: StrapiDepot
    }
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiBusStand {
  id: number
  attributes: {
    name: string
    platformNumber?: string
    capacity?: number
    busStation: {
      data: StrapiBusStation
    }
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiSurvey {
  id: number
  attributes: {
    surveyId: string
    surveyPurpose: string
    surveyDate: string
    completionDate?: string
    status: "pending" | "in-progress" | "completed" | "approved"
    gpsLatitude?: number
    gpsLongitude?: number
    notes?: string
    division: {
      data: StrapiDivision
    }
    depot: {
      data: StrapiDepot
    }
    busStation: {
      data: StrapiBusStation
    }
    busStand: {
      data: StrapiBusStand
    }
    surveyor: {
      data: StrapiUser
    }
    cameraInstallations: {
      data: StrapiCameraInstallation[]
    }
    surveyPhotos: {
      data: StrapiSurveyPhoto[]
    }
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiCameraInstallation {
  id: number
  attributes: {
    cameraType: "bullet" | "dome" | "ptz" | "anpr" | "thermal"
    serialNumber?: string
    poleLocation: string
    distanceBetweenCameras?: number
    workStatus: string
    installationDate?: string
    status: "planned" | "installed" | "active" | "maintenance" | "offline"
    survey: {
      data: StrapiSurvey
    }
    createdAt: string
    updatedAt: string
  }
}

export interface StrapiSurveyPhoto {
  id: number
  attributes: {
    photo: {
      data: {
        id: number
        attributes: {
          name: string
          url: string
          mime: string
          size: number
        }
      }
    }
    photoType?: string
    gpsLatitude?: number
    gpsLongitude?: number
    capturedAt: string
    survey: {
      data: StrapiSurvey
    }
    createdAt: string
    updatedAt: string
  }
}

// API Response Types
export interface StrapiResponse<T> {
  data: T
  meta: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface StrapiError {
  error: {
    status: number
    name: string
    message: string
    details?: any
  }
}
