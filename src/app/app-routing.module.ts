import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { EspaceEtudiantComponent } from './espace-etudiant/espace-etudiant.component';
import { EnseignantComponent } from './enseignant/enseignant.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component'; // Importez votre composant Dashboard

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'espace-etudiant', component: EspaceEtudiantComponent },
  { path: 'enseignant', component: EnseignantComponent },
  
  // Nouvelle route pour le dashboard admin
  
  { path: 'dashboard', component: DashboardComponent },
  
  { path: '**', redirectTo: '', pathMatch: 'full' } // Redirection pour les routes inconnues
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }