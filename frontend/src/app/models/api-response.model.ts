export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  errors?: string[];
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: { page: number; limit: number; total: number; pages: number; };
}
