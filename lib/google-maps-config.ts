// Google Maps configuration and utilities

export const GOOGLE_MAPS_CONFIG = {
  apiKey:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "AIzaSyCN9htaexjSDWMVybqWtlSl1ygNpZWkobg",
  libraries: ["places", "geometry"] as const,
  mapOptions: {
    zoom: 7,
    center: { lat: 19.076, lng: 72.8777 }, // Maharashtra center
    mapTypeId: "roadmap" as const,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#dbeafe" }],
      },
      {
        featureType: "landscape",
        elementType: "geometry.fill",
        stylers: [{ color: "#fef7ed" }],
      },
    ],
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
  },
};

export const MARKER_COLORS = {
  completed: "#10B981",
  "in-progress": "#F59E0B",
  pending: "#EF4444",
  default: "#6B7280",
};

export const createMarkerIcon = (status: string, size = 40) => {
  const color =
    MARKER_COLORS[status as keyof typeof MARKER_COLORS] ||
    MARKER_COLORS.default;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${
    size / 2 - 2
  }" fill="${color}" stroke="white" strokeWidth="4"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="6" fill="white"/>
    </svg>
  `)}`;
};

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Utility functions for Google Maps
export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      GOOGLE_MAPS_CONFIG.apiKey
    }&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(",")}`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script"));

    document.head.appendChild(script);
  });
};

export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Custom marker icons for different survey statuses

// Geocoding utilities
export const geocodeAddress = async (address: string): Promise<any | null> => {
  return new Promise((resolve) => {
    const geocoder = window.google.maps.Geocoder();

    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(results[0].geometry.location);
      } else {
        resolve(null);
      }
    });
  });
};

export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  return new Promise((resolve) => {
    const geocoder = window.google.maps.Geocoder();
    const latlng = new window.google.maps.LatLng(lat, lng);

    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        resolve(null);
      }
    });
  });
};

// Map style presets
export const MAP_STYLES = {
  default: [],
  satellite: [{ featureType: "all", stylers: [{ saturation: -100 }] }],
  terrain: [
    { featureType: "landscape", stylers: [{ color: "#f2f2f2" }] },
    { featureType: "water", stylers: [{ color: "#46bcec" }] },
  ],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  ],
};

// Helper function to get bounds for multiple locations
export const getBoundsForLocations = (
  locations: { lat: number; lng: number }[]
) => {
  if (locations.length === 0) return null;

  const bounds = new window.google.maps.LatLngBounds();
  locations.forEach((location) => {
    bounds.extend(new window.google.maps.LatLng(location.lat, location.lng));
  });
  return bounds;
};

// Helper function to create info window content
export const createInfoWindowContent = (survey: any) => {
  return `
    <div style="max-width: 300px; padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
      <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937; font-size: 16px;">${
        survey.location
      }</h3>
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">${
        survey.address
      }</p>
      <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
        <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
          📹 ${survey.cameras} cameras
        </span>
        <span style="background: ${
          getStatusBadgeStyle(survey.status).bg
        }; color: ${
    getStatusBadgeStyle(survey.status).color
  }; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
          ${
            survey.status.charAt(0).toUpperCase() +
            survey.status.slice(1).replace("-", " ")
          }
        </span>
      </div>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">${
        survey.division
      } • ${survey.depot} • ${survey.cameraType}</p>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">Last updated: ${
          survey.lastUpdated
        }</p>
      </div>
    </div>
  `;
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "completed":
      return { bg: "#dcfce7", color: "#166534" };
    case "in-progress":
      return { bg: "#fef3c7", color: "#92400e" };
    case "pending":
      return { bg: "#fee2e2", color: "#991b1b" };
    default:
      return { bg: "#f3f4f6", color: "#374151" };
  }
};
