import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

export const CheckAuth = (): boolean | UrlTree => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);

  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser();
    console.log('CheckAuth: User authenticated, role:', user?.role);
    switch (user?.role) {
      case 'admin':
        return router.createUrlTree(['/admin']);
      case 'cadre':
        return router.createUrlTree(['/cadre']);
      case 'nurse':
        return router.createUrlTree(['/sec']);
      default:
        authService.logout().subscribe();
        return true; // Allow access to /login or /
    }
  }
  console.log('CheckAuth: User not authenticated, allowing access to login');
  return true; // Allow access if not authenticated (e.g., /login)
};

export const AuthGuard = (): boolean | UrlTree => {
  const router: Router = inject(Router);
  const authService: AuthService = inject(AuthService);

  if (authService.isAuthenticated()) {
    console.log('AuthGuard: User authenticated, allowing access');
    return true; // Allow access to protected routes
  }
  console.log('AuthGuard: User not authenticated, redirecting to login');
  return router.createUrlTree(['/login']);
};