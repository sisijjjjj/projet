import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor() { }

  // Exemple de méthode signIn
  signIn(username: string, password: string): boolean {
    // Logique de validation ici, par exemple une simple vérification
    if (username === 'user' && password === 'password') {
      return true; // Connexion réussie
    }
    return false; // Connexion échouée
  }

  // Méthode d'inscription
  signUp(username: string, password: string, email: string, role: string) {
    // Logique d'inscription ici
  }
}
