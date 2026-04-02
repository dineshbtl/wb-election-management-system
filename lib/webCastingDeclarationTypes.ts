/** Shared with WebCastingDeclarationClient and save helper. */
export type WebCastingFormValues = {
  fullName: string;
  fatherName: string;
  motherName: string;
  districtId: string;
  district: string;
  /** Strapi assembly `documentId` when chosen from list (optional). */
  assemblyDocumentId?: string;
  /** Strapi location/booth `documentId` when chosen from list (optional). */
  pollingStationDocumentId?: string;
  assembly?: string;
  pollingStation?: string;
  village: string;
  phone: string;
  /** 12-digit UIDAI Aadhaar number (digits only). */
  aadhaarNumber: string;
  address: string;
  pin: string;
  agencyName: string;
  authorisedPersonName: string;
  designation: string;
  agencyMobile: string;
};
