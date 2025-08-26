export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}

export interface Instruction {
  step: number;
  description: string;
}

// Optional: lightweight image marker; backend stores binary in DB.
// Keep a flag only if the API returns it. Otherwise, omit image entirely.

export interface Recipe {
  _imageUrl: string;
  _id?: string;
  name: string;
  description?: string;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 1 | 2 | 3;
  ingredients: Ingredient[];
  instructions: Instruction[];
  // Replace old filesystem-based metadata with optional inline marker
  tags: string[];
  rating?: number;
  notes?: string;
  image: ImageSchema;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImageSchema {
  data: any;
  contentType: string;
  filename: string;
  _imageUrl?: string; // client-side only
}

export interface RecipeFilters {
  page?: number;
  limit?: number;
  cuisine?: string;
  difficulty?: number;
  maxPrepTime?: number;
  maxCookTime?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const CUISINES = [
  'Italian','Asian','Mexican','American','Indian',
  'Mediterranean','Thai','French','Chinese','Other'
] as const;

export const DIFFICULTY_LABELS: Record<1|2|3, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard'
};
