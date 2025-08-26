import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule }  from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }  from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

interface ShoppingItem {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice?: number;
  isCompleted: boolean;
  notes?: string;
}

interface ShoppingList {
  _id: string;
  name: string;
  mealPlan?: string;
  items: ShoppingItem[];
  totalEstimatedCost: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number; };
}

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  template: `
    <div style="padding:16px; display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
        <h2 style="margin:0; display:flex; align-items:center; gap:8px;">
          <mat-icon>shopping_cart</mat-icon> Shopping Lists
        </h2>

        <form [formGroup]="generateForm" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <mat-form-field appearance="outline" style="min-width:240px;">
            <mat-label>Generate from Meal Plan ID</mat-label>
            <input matInput placeholder="Enter mealPlanId..." formControlName="mealPlanId">
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:240px;">
            <mat-label>List name (optional)</mat-label>
            <input matInput placeholder="Shopping List - Week of ..." formControlName="name">
          </mat-form-field>

          <button type="button" mat-raised-button color="primary" (click)="generateFromMealPlan()" [disabled]="loading()">
            <mat-icon>playlist_add</mat-icon> Generate
          </button>
        </form>
      </div>

      <mat-card>
        <mat-card-content>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-weight:600;">Available Shopping Lists</div>
            <button mat-stroked-button (click)="loadLists()" [disabled]="loading()">
              <mat-icon>refresh</mat-icon> Refresh
            </button>
          </div>

          <div *ngIf="loading()" style="display:flex; align-items:center; gap:8px;">
            <mat-spinner diameter="22"></mat-spinner> Loading...
          </div>

          <div *ngIf="!loading() && lists().length === 0" style="color:#777;">
            No shopping lists found. Generate one from a meal plan.
          </div>

          <div *ngIf="!loading() && lists().length > 0" style="display:flex; gap:12px; flex-wrap:wrap;">
            <button
              mat-stroked-button
              *ngFor="let l of lists()"
              (click)="selectList(l)"
              [disabled]="loading()"
              [color]="selectedList()?._id === l._id ? 'primary' : undefined"
              style="text-align:left;"
            >
              <mat-icon>list</mat-icon>
              &nbsp; {{ l.name }} ({{ l.items.length }} items)
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card *ngIf="selectedList()">
        <mat-card-content>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:700; font-size:18px;">{{ selectedList()!.name }}</div>
              <div style="color:#666; font-size:13px;">
                {{ selectedList()!.isCompleted ? 'Completed' : 'In Progress' }}
                • {{ selectedList()!.items.length }} item(s)
                • Est: {{ selectedList()!.totalEstimatedCost | number:'1.2-2' }}
              </div>
            </div>

            <div style="display:flex; gap:8px;">
              <button mat-stroked-button color="primary" (click)="recalculateTotals()" [disabled]="loading()">
                <mat-icon>calculate</mat-icon> Recalculate Total
              </button>
              <button mat-raised-button color="primary" (click)="saveList()" [disabled]="loading()">
                <mat-icon>save</mat-icon> Save
              </button>
            </div>
          </div>

          <div style="margin-top:16px; display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:12px;">
            <div
              *ngFor="let item of selectedList()!.items"
              style="border:1px solid #eee; border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px;"
            >
              <div style="display:flex; align-items:center; gap:8px;">
                <mat-checkbox
                  [checked]="item.isCompleted"
                  (change)="toggleItem(item)"
                  [disabled]="loading()"
                ></mat-checkbox>
                <div style="font-weight:600; flex:1;">{{ item.name }}</div>
                <button mat-icon-button color="primary" (click)="nudgeQuantity(item, +1)" [disabled]="loading()" aria-label="Increase">
                  <mat-icon>add</mat-icon>
                </button>
                <button mat-icon-button (click)="nudgeQuantity(item, -1)" [disabled]="loading()" aria-label="Decrease">
                  <mat-icon>remove</mat-icon>
                </button>
              </div>

              <div style="display:flex; gap:8px;">
                <mat-form-field appearance="outline" style="width:120px;">
                  <mat-label>Qty</mat-label>
                  <input matInput type="number" min="0" step="0.01" [(ngModel)]="item.quantity">
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:120px;">
                  <mat-label>Unit</mat-label>
                  <input matInput [(ngModel)]="item.unit">
                </mat-form-field>

                <mat-form-field appearance="outline" style="flex:1;">
                  <mat-label>Category</mat-label>
                  <input matInput [(ngModel)]="item.category">
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:140px;">
                  <mat-label>Est. Price</mat-label>
                  <input matInput type="number" min="0" step="0.01" [(ngModel)]="item.estimatedPrice">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Notes</mat-label>
                <input matInput [(ngModel)]="item.notes">
              </mat-form-field>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class ShoppingListComponent implements OnInit {
  private readonly api = 'http://localhost:4000/api';

  loading = signal<boolean>(false);

  lists = signal<ShoppingList[]>([]);
  selectedList = signal<ShoppingList | null>(null);

  generateForm: FormGroup;

  constructor(private http: HttpClient, private snack: MatSnackBar, fb: FormBuilder) {
    this.generateForm = fb.group({
      mealPlanId: [''],
      name: ['']
    });
  }

  // Authorization header helper (if no global interceptor)
  private authHeaders() {
    const t = localStorage.getItem('mm_jwt');
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  }

  ngOnInit(): void {
    this.loadLists();
  }

  loadLists(): void {
    this.loading.set(true);
    const params = new HttpParams().set('page', '1').set('limit', '20');
    this.http.get<PaginatedResponse<ShoppingList>>(`${this.api}/shopping-lists`, {
      params,
      headers: this.authHeaders()
    }).subscribe({
      next: (resp) => {
        if (resp.success) {
          this.lists.set(resp.data);
          if (!this.selectedList() && resp.data.length > 0) {
            this.selectedList.set(resp.data[0]);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Failed to load shopping lists', 'Close', { duration: 3000 });
      }
    });
  }

  selectList(l: ShoppingList): void {
    this.selectedList.set(l);
  }

  generateFromMealPlan(): void {
    const mealPlanId = (this.generateForm.value.mealPlanId || '').trim();
    const name = (this.generateForm.value.name || '').trim();

    if (!mealPlanId) {
      this.snack.open('Enter a Meal Plan ID', 'Close', { duration: 2000 });
      return;
    }

    this.loading.set(true);
    this.http.post<ApiResponse<ShoppingList>>(
      `${this.api}/shopping-lists/from-meal-plan/${mealPlanId}`,
      { name: name || undefined },
      { headers: this.authHeaders() }
    ).subscribe({
      next: (resp) => {
        if (resp.success) {
          this.snack.open('Shopping list generated', 'Close', { duration: 2500 });
          this.lists.set([resp.data, ...this.lists()]);
          this.selectedList.set(resp.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Failed to generate list', 'Close', { duration: 3000 });
      }
    });
  }

  toggleItem(item: ShoppingItem): void {
    const list = this.selectedList();
    if (!list) return;

    this.loading.set(true);
    this.http.patch<ApiResponse<ShoppingList>>(
      `${this.api}/shopping-lists/${list._id}/items/${item._id}/toggle`,
      {},
      { headers: this.authHeaders() }
    ).subscribe({
      next: (resp) => {
        if (resp.success) {
          this.selectedList.set(resp.data);
          this.lists.set(this.lists().map(l => l._id === resp.data._id ? resp.data : l));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Failed to toggle item', 'Close', { duration: 3000 });
      }
    });
  }

  nudgeQuantity(item: ShoppingItem, delta: number): void {
    const q = Math.max(0, (item.quantity || 0) + delta);
    item.quantity = Number(q.toFixed(2));
  }

  recalculateTotals(): void {
    const list = this.selectedList();
    if (!list) return;
    list.totalEstimatedCost = (list.items || []).reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
    this.snack.open(`Estimated total: ${list.totalEstimatedCost.toFixed(2)}`, 'Close', { duration: 2500 });
  }

  saveList(): void {
    const list = this.selectedList();
    if (!list) return;

    this.loading.set(true);
    this.http.put<ApiResponse<ShoppingList>>(
      `${this.api}/shopping-lists/${list._id}`,
      list,
      { headers: this.authHeaders() }
    ).subscribe({
      next: (resp) => {
        if (resp.success) {
          this.selectedList.set(resp.data);
          this.lists.set(this.lists().map(l => l._id === resp.data._id ? resp.data : l));
          this.snack.open('List saved', 'Close', { duration: 2000 });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Failed to save list', 'Close', { duration: 3000 });
      }
    });
  }
}
