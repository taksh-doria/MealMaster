import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import type { Recipe, RecipeFilters } from '../models/recipe.model';
import type { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  // Use your environment config if you have one
  private readonly baseUrl = 'http://localhost:4000/api/recipes';

  private recipesSubject = new BehaviorSubject<Recipe[]>([]);
  recipes$ = this.recipesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // GET /api/recipes with filters and pagination support
  getRecipes(filters: RecipeFilters = {}): Observable<PaginatedResponse<Recipe>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });

    return this.http.get<PaginatedResponse<Recipe>>(this.baseUrl, { params }).pipe(
      tap((resp) => {
        if (resp?.success && Array.isArray(resp.data)) {
          this.recipesSubject.next(resp.data);
        } else {
          this.recipesSubject.next([]);
        }
      })
    );
  }

  // GET /api/recipes/:id
  getRecipe(id: string): Observable<Recipe> {
    return this.http.get<ApiResponse<Recipe>>(`${this.baseUrl}/${id}`).pipe(
      map((resp) => {
        if (!resp?.success || !resp.data) {
          throw new Error(resp?.message || 'Failed to fetch recipe');
        }
        return resp.data;
      })
    );
  }

  // POST /api/recipes (multipart FormData: fields + image)
  // Important: do NOT set Content-Type when sending FormData
  createRecipe(form: FormData): Observable<Recipe> {
    console.log('Creating recipe with form data:', form); // Debug log
    console.log('image binary:', form.get('image')); // Debug log
    
    console.log([...((form as any).entries())]);
    return this.http.post<ApiResponse<Recipe>>(this.baseUrl, form).pipe(
      map((resp) => {
        if (!resp?.success || !resp.data) {
          throw new Error(resp?.message || 'Failed to create recipe');
        }
        this.refresh();
        return resp.data;
      })
    );
  }

  // PUT /api/recipes/:id (multipart FormData)
  // Important: do NOT set Content-Type when sending FormData
  updateRecipe(id: string, form: FormData): Observable<Recipe> {
    return this.http.put<ApiResponse<Recipe>>(`${this.baseUrl}/${id}`, form).pipe(
      map((resp) => {
        if (!resp?.success || !resp.data) {
          throw new Error(resp?.message || 'Failed to update recipe');
        }
        this.refresh();
        return resp.data;
      })
    );
  }

  // DELETE /api/recipes/:id
  deleteRecipe(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`).pipe(
      map((resp) => {
        if (!resp?.success) {
          throw new Error(resp?.message || 'Failed to delete recipe');
        }
        this.refresh();
      })
    );
  }

  // POST /api/recipes/:id/scale
  scaleRecipe(id: string, servings: number): Observable<{
    originalServings: number;
    newServings: number;
    scaledIngredients: Array<{ name: string; quantity: number; unit: string; category?: string }>;
  }> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/scale`, { servings }).pipe(
      map((resp) => {
        if (!resp?.success || !resp.data) {
          throw new Error(resp?.message || 'Failed to scale recipe');
        }
        return resp.data;
      })
    );
  }

  // Full-size image URL (served from DB via streaming route)
  getImageUrl(recipe: Recipe | string): string {
    const id = typeof recipe === 'string' ? recipe : recipe?._id;
    return id ? `${this.baseUrl}/${id}/image` : '';
  }

  // Thumbnail URL
  // If a dedicated thumbnail variant is added (e.g., ?size=thumb), switch to that here.
  getThumbnailUrl(recipe: Recipe | string): string {
    return this.getImageUrl(recipe);
  }

  // Utility: total time (prep + cook)
  getTotalTime(recipe: Recipe): number {
    const prep = Number(recipe?.prepTime ?? 0);
    const cook = Number(recipe?.cookTime ?? 0);
    return prep + cook;
  }

  // Utility: difficulty stars (e.g., ★★☆)
  getDifficultyStars(difficulty: number): string {
    const d = Math.max(1, Math.min(3, Number(difficulty) || 1));
    return '★'.repeat(d) + '☆'.repeat(3 - d);
  }

  // Re-query list and push into BehaviorSubject
  private refresh(): void {
    this.getRecipes().subscribe({
      error: () => this.recipesSubject.next([])
    });
  }
}
