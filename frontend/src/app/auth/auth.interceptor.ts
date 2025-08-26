import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { TokenStorage } from './token-storage';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const token = TokenStorage.get();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
