import { Component, OnInit, Inject, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  FormControl,
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { Recipe, CUISINES, DIFFICULTY_LABELS } from '../models/recipe.model';
import { RecipeService } from '../services/recipe.service';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
  ],
  template: `
    <div style="padding:16px; display:flex; flex-direction:column; gap:16px;">
      <div
        style="display:flex; justify-content:space-between; align-items:center; gap:16px;"
      >
        <h2 style="margin:0; display:flex; align-items:center; gap:8px;">
          <mat-icon>book</mat-icon> My Recipes
        </h2>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Add Recipe
        </button>
      </div>

      <!-- Filters -->
      <form
        [formGroup]="filterForm"
        style="display:flex; gap:16px; flex-wrap:wrap;"
      >
        <mat-form-field appearance="outline" style="flex:1; min-width:240px;">
          <mat-label>Search</mat-label>
          <input
            matInput
            placeholder="Name, description, tags"
            formControlName="search"
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" style="min-width:200px;">
          <mat-label>Cuisine</mat-label>
          <mat-select formControlName="cuisine">
            <mat-option value="">All</mat-option>
            <mat-option *ngFor="let c of cuisines" [value]="c">{{
              c
            }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" style="min-width:200px;">
          <mat-label>Difficulty</mat-label>
          <mat-select formControlName="difficulty">
            <mat-option value="">Any</mat-option>
            <mat-option [value]="1">Easy</mat-option>
            <mat-option [value]="2">Medium</mat-option>
            <mat-option [value]="3">Hard</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" style="min-width:200px;">
          <mat-label>Max Prep Time (min)</mat-label>
          <input matInput type="number" formControlName="maxPrepTime" min="0" />
        </mat-form-field>
      </form>

      <!-- Loading -->
      <div
        *ngIf="loading()"
        style="display:flex; align-items:center; gap:12px;"
      >
        <mat-spinner diameter="28"></mat-spinner> Loading recipes...
      </div>

      <!-- Empty -->
      <div
        *ngIf="!loading() && recipes().length === 0"
        style="text-align:center; padding:40px; color:#666;"
      >
        <mat-icon style="font-size:48px;">restaurant</mat-icon>
        <div>No recipes yet</div>
      </div>

      <!-- Grid -->
      <div
        style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;"
      >
        <mat-card *ngFor="let r of recipes()" style="overflow:hidden;">
          <div
            style="height:200px; background:#eee; display:flex; align-items:center; justify-content:center;"
          >
            <img
              *ngIf="r._imageUrl"
              [src]="r._imageUrl"
              [alt]="r.name"
              style="width:100%; height:100%; object-fit:cover;"
            />
            <mat-icon *ngIf="!hasImage(r)" style="font-size:48px;"
              >restaurant</mat-icon
            >
          </div>

          <mat-card-content>
            <div
              style="display:flex; justify-content:space-between; align-items:flex-start;"
            >
              <h3 style="margin:8px 0;">{{ r.name }}</h3>
              <div>
                <button
                  mat-icon-button
                  color="primary"
                  (click)="openEditDialog(r)"
                  aria-label="Edit"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  (click)="remove(r._id!)"
                  aria-label="Delete"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin:8px 0;">
              <mat-chip>{{ r.cuisine }}</mat-chip>
              <mat-chip>{{ difficultyLabel(r.difficulty) }}</mat-chip>
            </div>

            <div style="display:flex; gap:16px; color:#666; font-size:14px;">
              <div style="display:flex; align-items:center; gap:4px;">
                <mat-icon>schedule</mat-icon>{{ r.prepTime + r.cookTime }}m
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <mat-icon>people</mat-icon>{{ r.servings }}
              </div>
            </div>

            <p *ngIf="r.description">{{ r.description }}</p>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button (click)="scale(r)">
              <mat-icon>straighten</mat-icon> Scale
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
})
export class RecipeListComponent implements OnInit {
  cuisines = CUISINES;
  recipes = signal<Recipe[]>([]);
  loading = signal<boolean>(false);
  filterForm: FormGroup;

  constructor(
    private recipeService: RecipeService,
    private snack: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      cuisine: [''],
      difficulty: [''],
      maxPrepTime: [''],
    });
  }

  ngOnInit() {
    this.load();
    this.filterForm.valueChanges.subscribe(() => this.load());
  }

  base64ToBlob(base64: string, type: string) {
    // Remove any newlines or spaces
    const cleanBase64 = base64.replace(/\s/g, '');
    const binary = atob(cleanBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  }

  load() {
    this.loading.set(true);
    this.recipeService.getRecipes(this.filterForm.value).subscribe({
      next: (resp) => {
        const recipesWithUrls = resp.data.map((r: Recipe) => {
          if (r.image?.data) {
            const blob = this.base64ToBlob(r.image.data, r.image.contentType);
            return { ...r, _imageUrl: URL.createObjectURL(blob) };
          }
          return r;
        });
        this.recipes.set(recipesWithUrls);
        this.loading.set(false);
      },
    });
  }

  openCreateDialog() {
    const ref = this.dialog.open(RecipeEditorDialog, {
      width: '900px',
      maxHeight: '90vh',
      data: null,
      disableClose: true,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.load();
    });
  }

  openEditDialog(recipe: Recipe) {
    const ref = this.dialog.open(RecipeEditorDialog, {
      width: '900px',
      maxHeight: '90vh',
      data: recipe,
      disableClose: true,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.load();
    });
  }

  remove(id: string) {
    if (!confirm('Delete this recipe?')) return;
    this.recipeService.deleteRecipe(id).subscribe({
      next: () => {
        this.snack.open('Deleted', 'Close', { duration: 2000 });
        this.load();
      },
      error: () =>
        this.snack.open('Delete failed', 'Close', { duration: 3000 }),
    });
  }

  scale(r: Recipe) {
    const v = prompt(
      `Scale "${r.name}" to how many servings?`,
      String(r.servings)
    );
    const n = Number(v);
    if (!v || Number.isNaN(n) || n <= 0) return;
    this.recipeService.scaleRecipe(r._id!, n).subscribe({
      next: (data) => {
        this.dialog.open(ScaledIngredientsDialog, { width: '520px', data });
      },
      error: () => this.snack.open('Scale failed', 'Close', { duration: 3000 }),
    });
  }

  difficultyLabel(d: 1 | 2 | 3) {
    return DIFFICULTY_LABELS[d];
  }

  hasImage(r: Recipe) {
    // If API returns a hasImage flag, prefer that; otherwise try id
    return !!r?._id;
  }
}

@Component({
  selector: 'app-recipe-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatCardModule,
  ],
  template: `
    <h2
      mat-dialog-title
      style="display:flex; align-items:center; gap:8px; margin:0;"
    >
      <mat-icon>edit</mat-icon> {{ data ? 'Edit Recipe' : 'Create Recipe' }}
    </h2>

    <form [formGroup]="form">
      <div
        mat-dialog-content
        style="display:flex; flex-direction:column; gap:16px; padding-top:8px;"
      >
        <!-- Basic info -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Cuisine</mat-label>
            <mat-select formControlName="cuisine">
              <mat-option *ngFor="let c of cuisines" [value]="c">{{
                c
              }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Prep Time (min)</mat-label>
            <input matInput type="number" min="0" formControlName="prepTime" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Cook Time (min)</mat-label>
            <input matInput type="number" min="0" formControlName="cookTime" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Servings</mat-label>
            <input matInput type="number" min="1" formControlName="servings" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Difficulty</mat-label>
            <mat-select formControlName="difficulty">
              <mat-option [value]="1">Easy</mat-option>
              <mat-option [value]="2">Medium</mat-option>
              <mat-option [value]="3">Hard</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" style="grid-column:1 / span 2;">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              rows="2"
              formControlName="description"
            ></textarea>
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        <!-- Image -->
        <div
          style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;"
        >
          <button
            type="button"
            mat-stroked-button
            color="primary"
            (click)="fileInput.click()"
          >
            <mat-icon>upload</mat-icon> Choose Image
          </button>
          <input
            type="file"
            hidden
            #fileInput
            (change)="onFileSelected($event)"
            accept="image/*"
          />
          <div
            *ngIf="imagePreview"
            style="display:flex; gap:8px; align-items:center;"
          >
            <img
              [src]="imagePreview"
              alt="preview"
              style="width:120px; height:80px; object-fit:cover; border:1px solid #eee; border-radius:4px;"
            />
            <button
              mat-icon-button
              color="warn"
              (click)="clearImage()"
              aria-label="Clear image"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Ingredients -->
        <div formArrayName="ingredients">
          <div
            style="display:flex; justify-content:space-between; align-items:center;"
          >
            <h3 style="margin:0; display:flex; align-items:center; gap:8px;">
              <mat-icon>format_list_bulleted</mat-icon> Ingredients
            </h3>
            <button type="button" mat-stroked-button (click)="addIngredient()">
              <mat-icon>add</mat-icon> Add Ingredient
            </button>
          </div>

          <div
            *ngIf="ingredients.controls.length === 0"
            style="color:#777; margin-top:8px;"
          >
            No ingredients yet.
          </div>

          <div
            *ngFor="let g of ingredients.controls; let i = index"
            [formGroup]="g"
            style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap:8px; align-items:center; margin-top:8px;"
          >
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Qty</mat-label>
              <input
                matInput
                type="number"
                min="0"
                step="0.01"
                formControlName="quantity"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Unit</mat-label>
              <input matInput formControlName="unit" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <input matInput formControlName="category" />
            </mat-form-field>

            <button
              type="button"
              mat-icon-button
              color="warn"
              (click)="removeIngredient(i)"
              aria-label="Remove"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Instructions -->
        <div formArrayName="instructions">
          <div
            style="display:flex; justify-content:space-between; align-items:center;"
          >
            <h3 style="margin:0; display:flex; align-items:center; gap:8px;">
              <mat-icon>format_list_numbered</mat-icon> Instructions
            </h3>
            <button type="button" mat-stroked-button (click)="addInstruction()">
              <mat-icon>add</mat-icon> Add Step
            </button>
          </div>

          <div
            *ngIf="instructions.controls.length === 0"
            style="color:#777; margin-top:8px;"
          >
            No steps yet.
          </div>

          <div
            *ngFor="let s of instructions.controls; let i = index"
            [formGroup]="s"
            style="display:grid; grid-template-columns: 80px 1fr auto; gap:8px; align-items:center; margin-top:8px;"
          >
            <mat-form-field appearance="outline">
              <mat-label>Step</mat-label>
              <input matInput type="number" min="1" formControlName="step" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <input matInput formControlName="description" />
            </mat-form-field>

            <button
              type="button"
              mat-icon-button
              color="warn"
              (click)="removeInstruction(i)"
              aria-label="Remove"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Tags -->
        <div>
          <h3 style="margin:0 0 8px 0;">Tags</h3>
          <div
            style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;"
          >
            <mat-form-field appearance="outline" style="min-width:200px;">
              <mat-label>New tag</mat-label>
              <input
                matInput
                [formControl]="newTagCtrl"
                (keyup.enter)="addTag()"
              />
            </mat-form-field>
            <button type="button" mat-stroked-button (click)="addTag()">
              <mat-icon>add</mat-icon> Add Tag
            </button>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <mat-chip
              *ngFor="let t of tags.value; let i = index"
              (removed)="removeTag(i)"
            >
              {{ t }}
              <button matChipRemove aria-label="Remove tag">
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip>
          </div>
        </div>
      </div>

      <div
        mat-dialog-actions
        style="display:flex; justify-content:flex-end; gap:8px;"
      >
        <button type="button" mat-stroked-button (click)="close()">
          Cancel
        </button>
        <button
          type="button"
          mat-raised-button
          color="primary"
          (click)="save()"
          [disabled]="saving"
        >
          <mat-icon>save</mat-icon> {{ data ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  `,
})
export class RecipeEditorDialog {
  cuisines = CUISINES;
  form: FormGroup;
  imageFile: File | null = null;
  imagePreview: string | null = null;
  saving = false;
  newTagCtrl = new FormControl<string>('');

  get ingredients(): FormArray<FormGroup> {
    return this.form.get('ingredients') as FormArray<FormGroup>;
  }
  get instructions(): FormArray<FormGroup> {
    return this.form.get('instructions') as FormArray<FormGroup>;
  }
  get tags(): FormArray {
    return this.form.get('tags') as FormArray;
  }

  constructor(
    private dialogRef: MatDialogRef<RecipeEditorDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Recipe | null,
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      name: [
        data?.name || '',
        [Validators.required, Validators.maxLength(100)],
      ],
      description: [data?.description || '', [Validators.maxLength(500)]],
      cuisine: [data?.cuisine || 'American', Validators.required],
      prepTime: [data?.prepTime ?? 0, [Validators.required, Validators.min(0)]],
      cookTime: [data?.cookTime ?? 0, [Validators.required, Validators.min(0)]],
      servings: [data?.servings ?? 1, [Validators.required, Validators.min(1)]],
      difficulty: [data?.difficulty ?? 1, [Validators.required]],
      ingredients: this.fb.array<FormGroup>([]),
      instructions: this.fb.array<FormGroup>([]),
      tags: this.fb.array<string>(data?.tags || []),
    });

    (data?.ingredients || []).forEach((i) =>
      this.ingredients.push(
        this.fb.group({
          name: [i.name],
          quantity: [i.quantity],
          unit: [i.unit],
          category: [i.category || ''],
        }) as FormGroup
      )
    );

    (data?.instructions || []).forEach((s) =>
      this.instructions.push(
        this.fb.group({
          step: [s.step],
          description: [s.description],
        }) as FormGroup
      )
    );
  }

  addIngredient() {
    this.ingredients.push(
      this.fb.group({
        name: [''],
        quantity: [0],
        unit: [''],
        category: [''],
      }) as FormGroup
    );
  }
  removeIngredient(i: number) {
    this.ingredients.removeAt(i);
  }

  addInstruction() {
    const nextStep = (this.instructions.value?.length || 0) + 1;
    this.instructions.push(
      this.fb.group({
        step: [nextStep],
        description: [''],
      }) as FormGroup
    );
  }
  removeInstruction(i: number) {
    this.instructions.removeAt(i);
  }

  addTag() {
    const val = (this.newTagCtrl.value || '').trim();
    if (!val) return;
    this.tags.push(new FormControl(val, { nonNullable: true }));
    this.newTagCtrl.setValue('');
  }
  removeTag(i: number) {
    this.tags.removeAt(i);
  }

  private base64ToBlob(base64: string, contentType = 'image/webp'): Blob {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file || file.size === 0) {
      this.clearImage();
      return;
    }

    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.imageFile = null;
    this.imagePreview = null;
  }

  save() {
    if (this.form.invalid) {
      this.snack.open('Please fill required fields', 'Close', {
        duration: 2000,
      });
      return;
    }
    this.saving = true;

    const fd = new FormData();
    const v = this.form.value;

    fd.append('name', v.name);
    fd.append('description', v.description || '');
    fd.append('cuisine', v.cuisine);
    fd.append('prepTime', String(v.prepTime ?? 0));
    fd.append('cookTime', String(v.cookTime ?? 0));
    fd.append('servings', String(v.servings ?? 1));
    fd.append('difficulty', String(v.difficulty ?? 1));

    fd.append('ingredients', JSON.stringify(this.ingredients.value || []));
    fd.append('instructions', JSON.stringify(this.instructions.value || []));
    fd.append('tags', JSON.stringify(this.tags.value || []));
    console.log(this.imageFile);
    if (this.imageFile) {
      fd.append('image', this.imageFile, this.imageFile.name);
    }

    const req$ = this.data?._id
      ? this.recipeService.updateRecipe(this.data._id, fd)
      : this.recipeService.createRecipe(fd);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        console.error(err);
        this.snack.open('Save failed', 'Close', { duration: 3000 });
      },
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}

@Component({
  selector: 'app-scaled-ingredients-dialog',
  standalone: true,
  imports: [
    CommonModule,
    NgFor,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2
      mat-dialog-title
      style="margin:0; display:flex; align-items:center; gap:8px;"
    >
      <mat-icon>straighten</mat-icon> Scaled Ingredients
    </h2>
    <div
      mat-dialog-content
      style="display:flex; flex-direction:column; gap:8px;"
    >
      <div>
        Original servings: <b>{{ data?.data?.originalServings }}</b>
      </div>
      <div>
        New servings: <b>{{ data?.data?.newServings }}</b>
      </div>

      <div
        *ngFor="let ing of data?.data?.scaledIngredients"
        style="display:flex; gap:8px;"
      >
        <div style="width:48px; text-align:right;">{{ ing.quantity }}</div>
        <div style="width:48px;">{{ ing.unit }}</div>
        <div style="flex:1;">{{ ing.name }}</div>
      </div>
    </div>
    <div
      mat-dialog-actions
      style="display:flex; justify-content:flex-end; gap:8px;"
    >
      <button mat-stroked-button mat-dialog-close>Close</button>
    </div>
  `,
})
export class ScaledIngredientsDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
