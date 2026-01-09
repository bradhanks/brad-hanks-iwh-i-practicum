/**
 * HubSpot API Types
 * Type definitions for HubSpot CRM custom object responses
 */

export interface HubSpotProperties {
    name: string;
    homeownership_rate: string;
    median_home_age: string;
}

export interface HubSpotRecord {
    id: string;
    properties: HubSpotProperties;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}

export interface HubSpotResponse {
    results: HubSpotRecord[];
}
