import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';

// Components
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { EspaceEtudiantComponent } from './espace-etudiant/espace-etudiant.component';
import { EnseignantComponent } from './enseignant/enseignant.component';
import { HomeComponent } from './home/home.component';
import { AdminDashboardComponent } from './dashboard/dashboard.component';
import { NotificationComponent } from './components/notification/notification.component';
import { HttpClientModule } from '@angular/common/http';
import { AdminComponent } from './admin/admin.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    EspaceEtudiantComponent,
    EnseignantComponent,
    HomeComponent,

    AdminDashboardComponent,
    NotificationComponent,
    AdminComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,         // Pour la gestion des formulaires template-driven (ngModel)
    ReactiveFormsModule, // Pour les formulaires réactifs (FormGroup, FormControl)
    AppRoutingModule,    // Doit être après BrowserModule et FormsModule
  ],
  providers: [
    // Vous pourriez ajouter des services globaux ici si nécessaire
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }