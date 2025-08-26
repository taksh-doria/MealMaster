export interface ShoppingItem {
  _id?: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice?: number;
  isCompleted: boolean;
  notes?: string;
}
export interface ShoppingList {
  _id?: string;
  name: string;
  mealPlan?: string;
  items: ShoppingItem[];
  totalEstimatedCost: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
export const GROCERY_CATEGORIES = ['Produce','Meat & Seafood','Dairy & Eggs','Pantry & Dry Goods','Frozen Foods','Other'] as const;
