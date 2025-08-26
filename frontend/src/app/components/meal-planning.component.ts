import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe, NgIf, NgFor } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
}

interface Recipe {
  _id: string;
  name: string;
  cuisine: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 1 | 2 | 3;
  ingredients: Ingredient[];
  image?: { filename?: string };
}

interface MealSlot {
  recipe: string | Recipe;
  servings: number;
  notes?: string;
}

interface DayPlan {
  date: string;
  breakfast: MealSlot[];
  lunch: MealSlot[];
  dinner: MealSlot[];
  snacks: MealSlot[];
}

interface MealPlan {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  isActive: boolean;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Component({
  selector: 'app-meal-planning',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    DatePipe,
    NgIf,
    NgFor,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div style="padding:16px; display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
        <h2 style="margin:0; display:flex; align-items:center; gap:8px;">
          <mat-icon>calendar_today</mat-icon> Meal Plan
        </h2>

        <div style="display:flex; gap:8px; align-items:center;">
          <button mat-stroked-button (click)="prevWeek()" [disabled]="loading()">
            <mat-icon>chevron_left</mat-icon> Previous
          </button>
          <button mat-stroked-button (click)="reload()" [disabled]="loading()">
            This Week
          </button>
          <button mat-stroked-button (click)="nextWeek()" [disabled]="loading()">
            Next <mat-icon>chevron_right</mat-icon>
          </button>
          <button mat-raised-button color="primary" (click)="generateShoppingList()" [disabled]="loading() || !plan()?._id">
            <mat-icon>shopping_cart</mat-icon> Generate Shopping List
          </button>
        </div>
      </div>

      <div *ngIf="loading()" style="display:flex; align-items:center; gap:12px;">
        <mat-spinner diameter="28"></mat-spinner> Loading meal plan...
      </div>

      <div *ngIf="!loading() && plan()" style="display:grid; grid-template-columns: 1fr 360px; gap:16px;">
        <!-- Calendar -->
        <mat-card>
          <mat-card-content>
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; font-weight:600; border-bottom:1px solid #eee; padding-bottom:8px;">
              <div>Date</div>
              <div>Breakfast</div>
              <div>Lunch</div>
              <div>Dinner</div>
              <div>Snacks</div>
            </div>

            <div *ngFor="let day of plan()!.days; let di = index" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; align-items:start; padding:12px 0; border-bottom:1px solid #f3f3f3;">
              <div style="font-weight:500;">
                {{ day.date | date : 'EEE, MMM d' }}
              </div>

              <ng-container *ngFor="let t of mealTypes">
                <div>
                  <div *ngIf="day[t].length === 0" style="color:#777; font-size:13px; margin-bottom:8px;">
                    Empty
                  </div>

                  <!-- Existing meals -->
                  <div *ngFor="let m of day[t]; let mi = index" style="display:flex; align-items:center; gap:8px; background:#fafafa; border:1px solid #eee; border-radius:6px; padding:8px; margin-bottom:8px;">
                    <mat-icon>restaurant</mat-icon>
                    <div style="flex:1;">
                      <div style="font-weight:600;">
                        {{ displayRecipeName(m.recipe) }}
                      </div>
                      <div style="font-size:12px; color:#666;">
                        Servings: {{ m.servings }}
                      </div>
                    </div>
                    <button mat-icon-button color="warn" (click)="removeMeal(di, t, mi)" [disabled]="loading()" aria-label="Remove">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>

                  <!-- Add new meal -->
                  <div style="display:flex; gap:8px; align-items:center;">
                    <mat-form-field appearance="outline" style="flex:1; min-width:180px;">
                      <mat-label>Add recipe</mat-label>
                      <mat-select [(value)]="selectedRecipeIds[di][t]" [disabled]="loading()">
                        <mat-option *ngFor="let r of recipes()" [value]="r._id">
                          {{ r.name }}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" style="width:110px;">
                      <mat-label>Servings</mat-label>
                      <input matInput type="number" min="1" [(ngModel)]="servingsInput[di][t]" [disabled]="loading()" />
                    </mat-form-field>

                    <button mat-mini-fab color="primary" (click)="addMeal(di, t)" [disabled]="loading() || !selectedRecipeIds[di][t]">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                </div>
              </ng-container>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Available recipes -->
        <div style="display:flex; flex-direction:column; gap:12px;">
          <mat-card>
            <mat-card-content>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-weight:600;">Available Recipes</div>
                <button mat-stroked-button (click)="loadRecipes()" [disabled]="loadingRecipes()">
                  Refresh
                </button>
              </div>

              <div *ngIf="loadingRecipes()" style="display:flex; align-items:center; gap:8px;">
                <mat-spinner diameter="22"></mat-spinner> Loading recipes...
              </div>

              <div *ngIf="!loadingRecipes() && recipes().length === 0" style="color:#777;">
                No recipes found. Add recipes in the Recipes tab.
              </div>

              <div *ngIf="!loadingRecipes() && recipes().length > 0" style="display:flex; flex-direction:column; gap:8px; max-height:60vh; overflow:auto;">
                <div *ngFor="let r of recipes()" style="display:flex; align-items:center; gap:8px; border:1px solid #eee; border-radius:6px; padding:8px;">
                  <mat-icon>restaurant</mat-icon>
                  <div style="flex:1;">
                    <div style="font-weight:600;">{{ r.name }}</div>
                    <div style="font-size:12px; color:#666;">
                      {{ r.cuisine }} • {{ r.prepTime + r.cookTime }}m • {{ r.servings }} svgs
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-content>
              <div style="font-weight:600; margin-bottom:8px;">Actions</div>
              <button mat-raised-button color="primary" (click)="generateShoppingList()" [disabled]="loading() || !plan()?._id">
                <mat-icon>shopping_cart</mat-icon> Generate Shopping List
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `
})
export class MealPlanningComponent implements OnInit {
  private readonly api = 'http://localhost:4000/api';

  loading = signal<boolean>(false);
  loadingRecipes = signal<boolean>(false);

  plan = signal<MealPlan | null>(null);
  recipes = signal<Recipe[]>([]);

  mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
  selectedRecipeIds: Record<number, Record<MealType, string | null>> = {};
  servingsInput: Record<number, Record<MealType, number>> = {};

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  // Authorization header helper (used if no global interceptor)
  private authHeaders(): { [header: string]: string } | undefined {
    const t = localStorage.getItem('mm_jwt');
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  }

  ngOnInit(): void {
    this.reload();
    this.loadRecipes();
  }

  reload(): void {
    this.loading.set(true);
    this.http
      .get<ApiResponse<MealPlan>>(`${this.api}/meal-plans/current`, {
        headers: this.authHeaders()
      })
      .subscribe({
        next: (resp) => {
          if (resp.success && resp.data) {
            this.plan.set(resp.data);
            this.initializeControls(resp.data);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Failed to load meal plan', 'Close', { duration: 3000 });
        }
      });
  }

  prevWeek(): void {
    this.snack.open('Previous week navigation is demo-only. Implement if needed.', 'Close', { duration: 2500 });
  }
  nextWeek(): void {
    this.snack.open('Next week navigation is demo-only. Implement if needed.', 'Close', { duration: 2500 });
  }

  private initializeControls(mp: MealPlan): void {
    this.selectedRecipeIds = {};
    this.servingsInput = {};
    mp.days.forEach((_d, di) => {
      this.selectedRecipeIds[di] = { breakfast: null, lunch: null, dinner: null, snacks: null };
      this.servingsInput[di] = { breakfast: 1, lunch: 1, dinner: 1, snacks: 1 };
    });
  }

  loadRecipes(): void {
    this.loadingRecipes.set(true);
    const params = new HttpParams().set('limit', '50').set('page', '1');
    this.http
      .get<PaginatedResponse<Recipe>>(`${this.api}/recipes`, {
        params,
        headers: this.authHeaders()
      })
      .subscribe({
        next: (resp) => {
          if (resp.success) this.recipes.set(resp.data);
          this.loadingRecipes.set(false);
        },
        error: () => {
          this.loadingRecipes.set(false);
          this.snack.open('Failed to load recipes', 'Close', { duration: 3000 });
        }
      });
  }

  addMeal(dayIndex: number, type: MealType): void {
    const mp = this.plan();
    if (!mp) return;

    const date = mp.days[dayIndex].date;
    const recipeId = this.selectedRecipeIds[dayIndex][type];
    const servings = Math.max(1, Number(this.servingsInput[dayIndex][type] || 1));

    if (!recipeId) {
      this.snack.open('Select a recipe first', 'Close', { duration: 2000 });
      return;
    }

    this.loading.set(true);
    this.http
      .post<ApiResponse<MealPlan>>(
        `${this.api}/meal-plans/${mp._id}/add-meal`,
        { date, mealType: type, recipeId, servings },
        { headers: this.authHeaders() }
      )
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.plan.set(resp.data);
            this.snack.open('Meal added', 'Close', { duration: 2000 });
            this.selectedRecipeIds[dayIndex][type] = null;
            this.servingsInput[dayIndex][type] = 1;
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Failed to add meal', 'Close', { duration: 3000 });
        }
      });
  }

  removeMeal(dayIndex: number, type: MealType, mealIndex: number): void {
    const mp = this.plan();
    if (!mp) return;

    const date = mp.days[dayIndex].date;

    this.loading.set(true);
    this.http
      .request<ApiResponse<MealPlan>>(
        'DELETE',
        `${this.api}/meal-plans/${mp._id}/remove-meal`,
        {
          body: { date, mealType: type, mealIndex },
          headers: this.authHeaders()
        }
      )
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.plan.set(resp.data);
            this.snack.open('Meal removed', 'Close', { duration: 2000 });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Failed to remove meal', 'Close', { duration: 3000 });
        }
      });
  }

  generateShoppingList(): void {
    const mp = this.plan();
    if (!mp?._id) return;
    this.loading.set(true);
    this.http
      .post<ApiResponse<any>>(
        `${this.api}/shopping-lists/from-meal-plan/${mp._id}`,
        { name: `Shopping List - ${mp.name}` },
        { headers: this.authHeaders() }
      )
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.snack.open('Shopping list generated', 'Close', { duration: 2500 });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Failed to generate shopping list', 'Close', { duration: 3000 });
        }
      });
  }

  displayRecipeName(r: string | Recipe): string {
    return typeof r === 'string' ? r : r?.name ?? 'Recipe';
  }
}
