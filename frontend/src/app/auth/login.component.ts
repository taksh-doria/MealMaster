import { Component } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, NgIf, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSnackBarModule
  ],
  template: `
    <div style="display:flex; justify-content:center; padding:32px;">
      <mat-card style="width:100%; max-width:420px;">
        <mat-card-title>Sign in</mat-card-title>
        <mat-card-content>
          <form [formGroup]="form" style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="username">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" autocomplete="current-password">
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid || loading">
              Sign in
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class LoginComponent {
  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private snack: MatSnackBar) {}

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value as { email: string; password: string };
    this.auth.login(email, password).subscribe({
      next: async (resp) => {
        this.loading = false;
        if (!resp?.success) {
          this.snack.open(resp?.message || 'Invalid credentials', 'Close', { duration: 2500 });
          return;
        }
        try {
          await this.auth.handleAuthSuccess(resp);
        } catch (e) {
          this.snack.open('Login failed', 'Close', { duration: 2500 });
        }
      },
      error: () => {
        this.loading = false;
        this.snack.open('Login failed', 'Close', { duration: 2500 });
      }
    });
  }
}
