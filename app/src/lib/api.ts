/**
 * API client for AuthCheck backend
 */

import type {
  UploadResponse,
  PapersResponse,
  AuthorsResponse,
  PotentialDuplicatesResponse,
  StatisticsResponse,
  MergeAuthorsRequest,
  MergeAuthorsResponse,
  Paper,
} from '../types/authcheck';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Upload Excel file and process it
   */
  async uploadFile(
    file: File,
    submissionLimit: number = 2,
    similarityThreshold: number = 85
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('submissionLimit', submissionLimit.toString());
    formData.append('similarityThreshold', similarityThreshold.toString());

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  /**
   * Get all papers with quota warnings
   */
  async getPapers(): Promise<PapersResponse> {
    const response = await fetch(`${this.baseUrl}/api/papers`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch papers');
    }

    return response.json();
  }

  /**
   * Get paper details by ID
   */
  async getPaperById(paperId: string): Promise<{ paper: Paper; authorsInfo: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/papers/${paperId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch paper');
    }

    return response.json();
  }

  /**
   * Get all authors with statistics
   */
  async getAuthors(
    warningOnly: boolean = false,
    sortBy: 'name' | 'email' | 'affiliation' | 'submissions' = 'submissions',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<AuthorsResponse> {
    const params = new URLSearchParams({
      warningOnly: warningOnly.toString(),
      sortBy,
      order,
    });

    const response = await fetch(`${this.baseUrl}/api/authors?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch authors');
    }

    return response.json();
  }

  /**
   * Get potential duplicate authors
   */
  async getPotentialDuplicates(): Promise<PotentialDuplicatesResponse> {
    const response = await fetch(`${this.baseUrl}/api/potential-duplicates`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch duplicates');
    }

    return response.json();
  }

  /**
   * Merge multiple authors into one
   */
  async mergeAuthors(request: MergeAuthorsRequest): Promise<MergeAuthorsResponse> {
    const response = await fetch(`${this.baseUrl}/api/authors/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to merge authors');
    }

    return response.json();
  }

  /**
   * Get overall statistics
   */
  async getStatistics(): Promise<StatisticsResponse> {
    const response = await fetch(`${this.baseUrl}/api/statistics`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch statistics');
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; analyzer_loaded: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/health`);

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }
}

// Export singleton instance
export const api = new ApiClient();
