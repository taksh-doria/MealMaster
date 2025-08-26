import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, RouterOutlet],
  template: `
    <mat-toolbar color="primary">
      <span (click)="goHome()"><mat-icon>restaurant</mat-icon>&nbsp;MealMaster</span>
      <span style="flex:1 1 auto"></span>
      <span style="flex:1 1 auto"></span>
      <!-- Meal Plan and Shopping navigation -->
      <button mat-button (click)="plan()" *ngIf="isAuthed$ | async">
        <mat-icon>event_note</mat-icon>&nbsp;Meal Plan
      </button>
      <button mat-button (click)="shop()" *ngIf="isAuthed$ | async">
        <mat-icon>shopping_cart</mat-icon>&nbsp;Shopping
      </button>

      <!-- Show Login if not authenticated -->
      <button mat-button *ngIf="!(isAuthed$ | async)" (click)="login()">
        <mat-icon>login</mat-icon>&nbsp;Login
      </button>

      <!-- Show Logout if authenticated -->
      <button mat-button *ngIf="isAuthed$ | async" (click)="logout()">
        <mat-icon>logout</mat-icon>&nbsp;Logout
      </button>
      &nbsp;
      &nbsp;
      <button mat-button *ngIf="!(isAuthed$ | async)" (click)="register()">
        <mat-icon>logout</mat-icon>&nbsp;Register
      </button>
    </mat-toolbar>

    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  isAuthed$: Observable<boolean>;

  constructor(private auth: AuthService, private router: Router) {
    this.isAuthed$ = toObservable(this.auth.isAuthenticated);
    // Alternatively, if isAuthenticated is already an Observable, use:
    // this.isAuthed$ = this.auth.isAuthenticated;
  }

  register(): void {
    this.router.navigateByUrl('/signup');
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  plan(): void {
    this.router.navigateByUrl('/plan');
  }

  shop(): void {
    this.router.navigateByUrl('/shopping');
  }

  login(): void {
    // Delegate to existing AuthService logic (navigate to /login or start OAuth)
    this.router.navigateByUrl('/login');
  }

  logout(): void {
    // Delegate to existing AuthService logic (clear token, navigate to /login)
    this.auth.logout();
  }
}
