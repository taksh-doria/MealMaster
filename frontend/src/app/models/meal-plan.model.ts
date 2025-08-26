import type { Recipe } from './recipe.model';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface MealSlot { recipe: string | Recipe; servings: number; notes?: string; }
export interface DayPlan { date: string; breakfast: MealSlot[]; lunch: MealSlot[]; dinner: MealSlot[]; snacks: MealSlot[]; }

export interface MealPlan {
  _id?: string;
  name: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const MEAL_TYPE_LABELS: Record<MealType,string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks'
};
