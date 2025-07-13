import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, BehaviorSubject, tap, throwError } from 'rxjs';

export interface User {
  id?: number;
  username: string;
  password: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  [x: string]: any;
  private apiUrl = 'http://localhost:8080/api/users';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { }

  login(email: string, password: string, role: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, { email, password, role }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError(this.handleError)
    );
  }

  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user).pipe(
      catchError(this.handleError)
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  getUserRole(): string | null {
    return this.getCurrentUser()?.role || null;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.status === 400 || error.status === 401) {
        errorMessage = error.error || 'Email ou mot de passe incorrect';
      } else if (error.status === 404) {
        errorMessage = 'Service non disponible';
      } else if (error.status === 500) {
        errorMessage = 'Erreur interne du serveur';
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}