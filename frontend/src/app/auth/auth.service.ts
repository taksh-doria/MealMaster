import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TokenStorage } from './token-storage';

type User = { _id: string; email: string; name?: string; role?: string };
type AuthResp = { success: boolean; message?: string; data?: { token: string; user: User } };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = 'http://localhost:4000/api';
  private tokenSig = signal<string | null>(TokenStorage.get());
  private userSig = signal<User | null>(null);

  token = computed(() => this.tokenSig());
  user = computed(() => this.userSig());
  isAuthenticated = computed(() => !!this.tokenSig());

  constructor(private http: HttpClient, private router: Router) {}

  signup(name: string, email: string, password: string) {
    return this.http.post<AuthResp>(`${this.api}/auth/register`, { name, email, password });
  }

  login(email: string, password: string) {
    return this.http.post<AuthResp>(`${this.api}/auth/login`, { email, password });
  }

  me() {
    return this.http.get<{ success: boolean; data?: User; message?: string }>(`${this.api}/auth/me`);
  }

  async handleAuthSuccess(resp: AuthResp) {
    const t = resp?.data?.token;
    if (!t) throw new Error(resp?.message || 'No token');
    TokenStorage.set(t);
    this.tokenSig.set(t);
    // Optionally fetch profile
    try {
      const me = await this.me().toPromise();
      this.userSig.set(me?.data || null);
    } catch {
      this.userSig.set(resp?.data?.user || null);
    }
    await this.router.navigateByUrl('/');
  }

  logout() {
    TokenStorage.clear();
    this.tokenSig.set(null);
    this.userSig.set(null);
    this.router.navigateByUrl('/login');
  }
}
