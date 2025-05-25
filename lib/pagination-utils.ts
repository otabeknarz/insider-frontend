import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import ApiService from "./api";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetches all pages of a paginated API response
 * @param initialUrl The initial URL to fetch
 * @param config Optional axios config
 * @returns Promise with all results combined
 */
export async function fetchAllPages<T>(
  initialUrl: string,
  config?: AxiosRequestConfig
): Promise<T[]> {
  let nextUrl: string | null = initialUrl;
  let allResults: T[] = [];

  while (nextUrl) {
    try {
      // Use the absolute URL if it's a full URL, otherwise use the path with ApiService
      const isAbsoluteUrl = nextUrl.startsWith('http');
      
      let response: AxiosResponse;
      if (isAbsoluteUrl) {
        response = await axios.get(nextUrl, config);
      } else {
        response = await ApiService.request({
          method: 'get',
          url: nextUrl,
          ...config
        });
      }

      const data = response.data as PaginatedResponse<T>;
      
      if (Array.isArray(data.results)) {
        allResults = [...allResults, ...data.results];
      }
      
      nextUrl = data.next;
    } catch (error) {
      console.error("Error fetching paginated data:", error);
      throw error;
    }
  }

  return allResults;
}

/**
 * Enhanced API request function that can optionally fetch all pages
 * @param url The API endpoint URL
 * @param getAll Whether to fetch all pages or just the first page
 * @param config Optional axios config
 * @returns Promise with response data
 */
export async function getPaginatedData<T>(
  url: string,
  getAll: boolean = false,
  config?: AxiosRequestConfig
): Promise<AxiosResponse | T[]> {
  try {
    if (getAll) {
      const allResults = await fetchAllPages<T>(url, config);
      return allResults;
    } else {
      return await ApiService.request({
        method: 'get',
        url,
        ...config
      });
    }
  } catch (error) {
    console.error("Error in getPaginatedData:", error);
    throw error;
  }
}
