import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSnackBarModule
  ],
  template: `
    <div style="display:flex; justify-content:center; padding:32px;">
      <mat-card style="width:100%; max-width:420px;">
        <mat-card-title>Create account</mat-card-title>
        <mat-card-content>
          <form [formGroup]="form" style="display:flex; flex-direction:column; gap:12px; margin-top:12px;" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" autocomplete="new-password" />
            </mat-form-field>
            <button mat-raised-button color="primary" [disabled]="form.invalid || loading" type="submit">Sign up</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class SignupComponent {
  loading = false;
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private snack: MatSnackBar, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { name, email, password } = this.form.value as any;
    this.auth.signup(name, email, password).subscribe({
      next: (resp) => {
        this.loading = false;
        if (!resp?.success) {
          this.snack.open(resp?.message || 'Signup failed', 'Close', { duration: 2500 });
          return;
        }
        this.auth.handleAuthSuccess(resp)
          .catch(() => this.snack.open('Signup failed', 'Close', { duration: 2500 }));
      },
      error: () => { this.loading = false; this.snack.open('Signup failed', 'Close', { duration: 2500 }); }
    });
  }
}
