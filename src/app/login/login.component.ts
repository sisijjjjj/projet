import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  signUpUsername: string = '';
  signUpPassword: string = '';
  confirmPassword: string = '';
  signUpEmail: string = '';
  role: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  onSignIn() {
    const isAuthenticated = this.authService.signIn(this.username, this.password);

    if (isAuthenticated) {
      this.router.navigate(['/accueil']);
    } else {
      alert('Identifiants incorrects.');
    }
  }

  onSignUp() {
    if (this.signUpPassword === this.confirmPassword) {
      this.authService.signUp(this.signUpUsername, this.signUpPassword, this.signUpEmail, this.role);
      alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
    } else {
      alert('Les mots de passe ne correspondent pas.');
    }
  }
}