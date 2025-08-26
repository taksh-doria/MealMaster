// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { SignupComponent } from './auth/signup.component';
import { RecipeListComponent } from './components/recipe-list.component';
import { MealPlanningComponent } from './components/meal-planning.component';
import { ShoppingListComponent } from './components/shopping-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },   // public
  { path: 'signup', component: SignupComponent }, // public
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'recipes', pathMatch: 'full' },
      { path: 'recipes', component: RecipeListComponent },
      { path: 'plan', component: MealPlanningComponent },
      { path: 'shopping', component: ShoppingListComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
