import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Login Form
  username: string = '';
  password: string = '';
  loginRole: string = '';
  rememberMe: boolean = false;

  // SignUp Form
  signUpUsername: string = '';
  signUpPassword: string = '';
  confirmPassword: string = '';
  signUpEmail: string = '';
  signUpRole: string = '';

  // States
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSignIn(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.username.trim() || !this.password.trim() || !this.loginRole) {
      this.showError('Veuillez remplir tous les champs');
      return;
    }

    this.isLoading = true;
    const role = this.convertRole(this.loginRole);

    this.authService.login(this.username, this.password, role)
      .pipe(
        catchError(error => {
          this.isLoading = false;
          this.handleError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Login response:', response);
          if (response === null) {
            // Si l'API renvoie null mais que l'authentification est réussie
            this.handleLoginSuccess({
              username: this.username,
              role: role
            });
          } else {
            this.handleLoginResponse(response);
          }
        },
        error: (err) => {
          console.error('Login error:', err);
          this.handleError(err);
        }
      });
  }

  onSignUp(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.signUpUsername.trim() || !this.signUpPassword.trim() || 
        !this.confirmPassword.trim() || !this.signUpEmail.trim() || !this.signUpRole) {
      this.showError('Veuillez remplir tous les champs');
      return;
    }

    if (this.signUpPassword !== this.confirmPassword) {
      this.showError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!this.isValidEmail(this.signUpEmail)) {
      this.showError('Veuillez entrer une adresse email valide');
      return;
    }

    this.isLoading = true;
    const role = this.convertRole(this.signUpRole);

    const newUser = {
      username: this.signUpUsername,
      password: this.signUpPassword,
      email: this.signUpEmail,
      role: role
    };

    this.authService.register(newUser)
      .pipe(
        catchError(error => {
          this.isLoading = false;
          this.handleError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Signup success:', response);
          this.handleSignupSuccess();
        },
        error: (err) => {
          console.error('Signup error:', err);
          this.handleError(err);
        }
      });
  }

  private handleLoginResponse(response: any): void {
    // Si la réponse est null mais que le login est réussi
    if (response === null) {
      this.handleLoginSuccess({
        username: this.username,
        role: this.loginRole
      });
      return;
    }

    let user = response?.user || response?.data || response;
    
    if (!user) {
      console.error('Invalid response format:', response);
      this.showError('Erreur de connexion: format de réponse invalide');
      return;
    }

    const role = user.role || user.userRole || user.roles?.[0] || this.loginRole;
    
    if (!role) {
      this.showError('Erreur de connexion: rôle non défini');
      return;
    }

    const userWithRole = { 
      ...user, 
      role: this.convertRole(role),
      username: user.username || this.username
    };

    this.handleLoginSuccess(userWithRole);
  }

  private handleLoginSuccess(user: any): void {
    this.isLoading = false;
    
    if (this.rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    this.redirectUser(user.role);
  }

  private handleSignupSuccess(): void {
    this.isLoading = false;
    this.showSuccess('Inscription réussie! Vous pouvez maintenant vous connecter.');
    
    // Reset signup form
    this.signUpUsername = '';
    this.signUpPassword = '';
    this.confirmPassword = '';
    this.signUpEmail = '';
    this.signUpRole = '';
    
    // Switch to login tab
    const loginTab = document.getElementById('tab-1') as HTMLInputElement;
    if (loginTab) loginTab.checked = true;
  }

  private handleError(error: any): void {
    this.isLoading = false;
    let errorMsg = 'Une erreur est survenue';
    
    if (error.error) {
      errorMsg = error.error.message || JSON.stringify(error.error);
    } else if (error.message) {
      errorMsg = error.message;
    }
    
    this.showError(errorMsg);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.successMessage = '', 5000);
  }

  private convertRole(role: string): string {
    const roleMap: Record<string, string> = {
      'student': 'etudiant',
      'teacher': 'enseignant',
      'admin': 'admin',
      'administrator': 'admin'
    };
    return roleMap[role.toLowerCase()] || role;
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private redirectUser(role: string): void {
    const routes: Record<string, string> = {
      'admin': '/admin',
      'etudiant': '/student',
      'enseignant': '/teacher',
      'student': '/student',
      'teacher': '/teacher'
    };
    
    const route = routes[role.toLowerCase()] || '/';
    this.router.navigate([route]);
  }
} 