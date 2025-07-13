import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';

/* ==================== MODÈLES ==================== */
export enum StatutEnseignant {
  ACTIF = 'ACTIF',
  EN_CONGE = 'EN_CONGE',
  INACTIF = 'INACTIF'
}

export enum StatutConge {
  EN_ATTENTE = 'EN_ATTENTE',
  APPROUVE = 'APPROUVE',
  REJETE = 'REJETE'
}

export interface Admin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
}

export interface Etudiant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: Date;
  classe?: Classe;
}

export interface Enseignant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  nbClasse?: number;
  nbAnneeExperience?: number;
  statutConge?: StatutEnseignant;
}

export interface Classe {
  id: number;
  nom: string;
  niveau?: string;
  enseignants?: Enseignant[];
  etudiants?: Etudiant[];
}

export interface Note {
  id: number;
  valeur: number;
  etudiant?: Etudiant;
  cours?: Cours;
}

export interface Absence {
  id: number;
  date: Date;
  justifiee: boolean;
  etudiant?: Etudiant;
  cours?: Cours;
}

export interface Cours {
  id: number;
  nom: string;
  description?: string;
  enseignant?: Enseignant;
}

export interface Emploi {
  id: number;
  jours?: JourEmploi[];
}

export interface JourEmploi {
  jour: string;
  creneaux: CreneauEmploi[];
}

export interface CreneauEmploi {
  heureDebut: string;
  heureFin: string;
  cours?: Cours;
}

export interface Conge {
  id: number;
  type: string;
  dateDebut: Date;
  dateFin: Date;
  statut: StatutConge;
  motifRejet?: string;
  enseignant?: Enseignant;
}

export interface Reunion {
  id: number;
  sujet: string;
  dateHeure: Date;
  lieu: string;
  enseignant?: Enseignant;
}

/* ==================== SERVICE ==================== */
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = 'http://localhost:8081/api/admin';

  constructor(private http: HttpClient) { }

  private handleError(error: any): Observable<never> {
    console.error('Une erreur est survenue:', error);
    return throwError(() => new Error('Une erreur est survenue. Veuillez réessayer.'));
  }

  /* ============ ADMINISTRATEURS ============ */
  getAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${this.apiUrl}/all`).pipe(
      catchError(this.handleError)
    );
  }

  /* ============ ÉTUDIANTS ============ */
  getEtudiants(): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.apiUrl}/etudiants`).pipe(
      catchError(this.handleError)
    );
  }

  createEtudiant(etudiant: Omit<Etudiant, 'id'>): Observable<Etudiant> {
    return this.http.post<Etudiant>(`${this.apiUrl}/etudiants`, etudiant).pipe(
      catchError(this.handleError)
    );
  }

  updateEtudiant(id: number, etudiant: Partial<Etudiant>): Observable<Etudiant> {
    return this.http.put<Etudiant>(`${this.apiUrl}/etudiants/${id}`, etudiant).pipe(
      catchError(this.handleError)
    );
  }

  deleteEtudiant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/etudiants/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /* ============ ENSEIGNANTS ============ */
  getEnseignants(): Observable<Enseignant[]> {
    return this.http.get<Enseignant[]>(`${this.apiUrl}/enseignants`).pipe(
      catchError(this.handleError)
    );
  }

  createEnseignant(enseignant: Omit<Enseignant, 'id'>): Observable<Enseignant> {
    return this.http.post<Enseignant>(`${this.apiUrl}/enseignants`, enseignant).pipe(
      catchError(this.handleError)
    );
  }

  updateEnseignant(id: number, enseignant: Partial<Enseignant>): Observable<Enseignant> {
    return this.http.put<Enseignant>(`${this.apiUrl}/enseignants/${id}`, enseignant).pipe(
      catchError(this.handleError)
    );
  }

  deleteEnseignant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/enseignants/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /* ============ CLASSES ============ */
  getClasses(): Observable<Classe[]> {
    return this.http.get<Classe[]>(`${this.apiUrl}/classes`).pipe(
      catchError(this.handleError)
    );
  }

  createClasse(classe: Omit<Classe, 'id'>): Observable<Classe> {
    return this.http.post<Classe>(`${this.apiUrl}/classes`, classe).pipe(
      catchError(this.handleError)
    );
  }

  updateClasse(id: number, classe: Partial<Classe>): Observable<Classe> {
    return this.http.put<Classe>(`${this.apiUrl}/classes/${id}`, classe).pipe(
      catchError(this.handleError)
    );
  }

  deleteClasse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/classes/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /* ============ NOTES ============ */
  addNote(etudiantId: number, coursId: number, note: Omit<Note, 'id'>): Observable<Note> {
    return this.http.post<Note>(
      `${this.apiUrl}/etudiants/${etudiantId}/cours/${coursId}/notes`, 
      note
    ).pipe(catchError(this.handleError));
  }

  deleteNote(etudiantId: number, noteId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/etudiants/${etudiantId}/notes/${noteId}`
    ).pipe(catchError(this.handleError));
  }

  /* ============ ABSENCES ============ */
  justifyAbsence(etudiantId: number, absenceId: number): Observable<Absence> {
    return this.http.put<Absence>(
      `${this.apiUrl}/etudiants/${etudiantId}/absences/${absenceId}/justifier`, 
      {}
    ).pipe(catchError(this.handleError));
  }

  deleteAbsence(etudiantId: number, absenceId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/etudiants/${etudiantId}/absences/${absenceId}`
    ).pipe(catchError(this.handleError));
  }

  /* ============ CONGÉS ============ */
  getCongesEnAttente(): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/conges/en-attente`).pipe(
      catchError(this.handleError)
    );
  }

  approuverConge(congeId: number): Observable<Conge> {
    return this.http.put<Conge>(
      `${this.apiUrl}/conges/${congeId}/approve`, 
      {}
    ).pipe(catchError(this.handleError));
  }

  rejeterConge(congeId: number, motif: string): Observable<Conge> {
    return this.http.put<Conge>(
      `${this.apiUrl}/conges/${congeId}/reject`, 
      { raison: motif }
    ).pipe(catchError(this.handleError));
  }

  /* ============ RÉUNIONS ============ */
  getReunions(): Observable<Reunion[]> {
    return this.http.get<Reunion[]>(`${this.apiUrl}/reunions`).pipe(
      catchError(this.handleError)
    );
  }

  createReunion(reunion: Omit<Reunion, 'id'>): Observable<Reunion> {
    return this.http.post<Reunion>(`${this.apiUrl}/reunions`, reunion).pipe(
      catchError(this.handleError)
    );
  }

  sendReunionEmail(reunionId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/reunions/${reunionId}/send-email`, 
      {}
    ).pipe(catchError(this.handleError));
  }
}

/* ==================== COMPOSANT ==================== */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  // État de l'UI
  activeTab: 'dashboard' | 'etudiants' | 'enseignants' | 'classes' | 'conges' | 'reunions' = 'dashboard';
  isLoading = false;
  errorMessage: string | null = null;

  // Données
  etudiants: Etudiant[] = [];
  enseignants: Enseignant[] = [];
  classes: Classe[] = [];
  notes: Note[] = [];
  absences: Absence[] = [];
  reunions: Reunion[] = [];
  
  // Alias pour la template
  get pendingConges(): Conge[] {
    return this.congesEnAttente;
  }
  congesEnAttente: Conge[] = [];

  // Sélections
  selectedEtudiant: Etudiant | null = null;
  selectedEnseignant: Enseignant | null = null;
  selectedClasse: Classe | null = null;

  // Formulaires
  newEtudiant: Omit<Etudiant, 'id'> = {
    nom: '',
    prenom: '',
    email: '',
    dateNaissance: new Date()
  };

  newEnseignant: Omit<Enseignant, 'id'> = {
    nom: '',
    prenom: '',
    email: ''
  };

  newClasse: Omit<Classe, 'id'> = {
    nom: '',
    niveau: ''
  };

  newNote: Omit<Note, 'id'> = {
    valeur: 0
  };

  newReunion: Omit<Reunion, 'id'> = {
    sujet: '',
    dateHeure: new Date(),
    lieu: ''
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.chargerDonneesInitiales();
  }

  /* ============ CHARGEMENT DES DONNÉES ============ */
  private chargerDonneesInitiales(): void {
    this.isLoading = true;
    this.errorMessage = null;

    forkJoin([
      this.adminService.getEtudiants(),
      this.adminService.getEnseignants(),
      this.adminService.getClasses(),
      this.adminService.getCongesEnAttente(),
      this.adminService.getReunions()
    ]).subscribe({
      next: ([etudiants, enseignants, classes, conges, reunions]) => {
        this.etudiants = etudiants;
        this.enseignants = enseignants;
        this.classes = classes;
        this.congesEnAttente = conges;
        this.reunions = reunions;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des données';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  /* ============ GESTION DES ONGLETS ============ */
  selectTab(tab: 'dashboard' | 'etudiants' | 'enseignants' | 'classes' | 'conges' | 'reunions'): void {
    this.activeTab = tab;
    this.errorMessage = null;
  }

  /* ============ GESTION ÉTUDIANTS ============ */
  selectEtudiant(etudiant: Etudiant): void {
    this.selectedEtudiant = { ...etudiant };
    this.chargerNotesEtAbsences(etudiant.id);
  }

  private chargerNotesEtAbsences(etudiantId: number): void {
    // Implémentation simulée - à adapter avec vos vrais endpoints
    this.notes = [];
    this.absences = [];
  }

  createEtudiant(): void {
    if (!this.validerEtudiant()) return;

    this.isLoading = true;
    this.adminService.createEtudiant(this.newEtudiant).subscribe({
      next: (etudiant) => {
        this.etudiants.push(etudiant);
        this.reinitialiserFormulaireEtudiant();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la création de l\'étudiant';
        this.isLoading = false;
      }
    });
  }

  updateEtudiant(id: number, etudiant: Etudiant): void {
    if (!this.selectedEtudiant) return;

    this.isLoading = true;
    this.adminService.updateEtudiant(id, etudiant).subscribe({
      next: (updatedEtudiant) => {
        const index = this.etudiants.findIndex(e => e.id === updatedEtudiant.id);
        if (index !== -1) {
          this.etudiants[index] = updatedEtudiant;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la mise à jour de l\'étudiant';
        this.isLoading = false;
      }
    });
  }

  deleteEtudiant(id: number): void {
    if (!confirm('Confirmer la suppression de cet étudiant ?')) return;

    this.isLoading = true;
    this.adminService.deleteEtudiant(id).subscribe({
      next: () => {
        this.etudiants = this.etudiants.filter(e => e.id !== id);
        if (this.selectedEtudiant?.id === id) {
          this.selectedEtudiant = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la suppression de l\'étudiant';
        this.isLoading = false;
      }
    });
  }

  private validerEtudiant(): boolean {
    if (!this.newEtudiant.nom || !this.newEtudiant.prenom || !this.newEtudiant.email) {
      this.errorMessage = 'Tous les champs sont obligatoires';
      return false;
    }
    return true;
  }

  private reinitialiserFormulaireEtudiant(): void {
    this.newEtudiant = {
      nom: '',
      prenom: '',
      email: '',
      dateNaissance: new Date()
    };
    this.errorMessage = null;
  }

  /* ============ GESTION NOTES ============ */
  addNoteToEtudiant(etudiantId: number, note: Omit<Note, 'id'>): void {
    if (!this.selectedEtudiant || !note.valeur) return;

    this.isLoading = true;
    const coursId = 1; // À remplacer par la sélection réelle
    this.adminService.addNote(etudiantId, coursId, note).subscribe({
      next: (newNote) => {
        this.notes.push(newNote);
        this.newNote = { valeur: 0 };
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de l\'ajout de la note';
        this.isLoading = false;
      }
    });
  }

  deleteNote(etudiantId: number, noteId: number): void {
    if (!this.selectedEtudiant) return;

    this.isLoading = true;
    this.adminService.deleteNote(etudiantId, noteId).subscribe({
      next: () => {
        this.notes = this.notes.filter(n => n.id !== noteId);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la suppression de la note';
        this.isLoading = false;
      }
    });
  }

  /* ============ GESTION ABSENCES ============ */
  justifyAbsence(etudiantId: number, absenceId: number): void {
    if (!this.selectedEtudiant) return;

    this.isLoading = true;
    this.adminService.justifyAbsence(etudiantId, absenceId).subscribe({
      next: (absence) => {
        const index = this.absences.findIndex(a => a.id === absenceId);
        if (index !== -1) {
          this.absences[index] = absence;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la justification de l\'absence';
        this.isLoading = false;
      }
    });
  }

  deleteAbsence(etudiantId: number, absenceId: number): void {
    if (!this.selectedEtudiant) return;

    this.isLoading = true;
    this.adminService.deleteAbsence(etudiantId, absenceId).subscribe({
      next: () => {
        this.absences = this.absences.filter(a => a.id !== absenceId);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la suppression de l\'absence';
        this.isLoading = false;
      }
    });
  }

  /* ============ GESTION ENSEIGNANTS ============ */
  selectEnseignant(enseignant: Enseignant): void {
    this.selectedEnseignant = { ...enseignant };
  }

  createEnseignant(): void {
    if (!this.validerEnseignant()) return;

    this.isLoading = true;
    this.adminService.createEnseignant(this.newEnseignant).subscribe({
      next: (enseignant) => {
        this.enseignants.push(enseignant);
        this.reinitialiserFormulaireEnseignant();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la création de l\'enseignant';
        this.isLoading = false;
      }
    });
  }

  updateEnseignant(id: number, enseignant: Enseignant): void {
    if (!this.selectedEnseignant) return;

    this.isLoading = true;
    this.adminService.updateEnseignant(id, enseignant).subscribe({
      next: (updatedEnseignant) => {
        const index = this.enseignants.findIndex(e => e.id === updatedEnseignant.id);
        if (index !== -1) {
          this.enseignants[index] = updatedEnseignant;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la mise à jour de l\'enseignant';
        this.isLoading = false;
      }
    });
  }

  deleteEnseignant(id: number): void {
    if (!confirm('Confirmer la suppression de cet enseignant ?')) return;

    this.isLoading = true;
    this.adminService.deleteEnseignant(id).subscribe({
      next: () => {
        this.enseignants = this.enseignants.filter(e => e.id !== id);
        if (this.selectedEnseignant?.id === id) {
          this.selectedEnseignant = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la suppression de l\'enseignant';
        this.isLoading = false;
      }
    });
  }

  private validerEnseignant(): boolean {
    if (!this.newEnseignant.nom || !this.newEnseignant.prenom || !this.newEnseignant.email) {
      this.errorMessage = 'Tous les champs sont obligatoires';
      return false;
    }
    return true;
  }

  private reinitialiserFormulaireEnseignant(): void {
    this.newEnseignant = {
      nom: '',
      prenom: '',
      email: ''
    };
    this.errorMessage = null;
  }

  /* ============ GESTION CLASSES ============ */
  selectClasse(classe: Classe): void {
    this.selectedClasse = { ...classe };
  }

  createClasse(): void {
    if (!this.validerClasse()) return;

    this.isLoading = true;
    this.adminService.createClasse(this.newClasse).subscribe({
      next: (classe) => {
        this.classes.push(classe);
        this.reinitialiserFormulaireClasse();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la création de la classe';
        this.isLoading = false;
      }
    });
  }

  updateClasse(id: number, classe: Classe): void {
    if (!this.selectedClasse) return;

    this.isLoading = true;
    this.adminService.updateClasse(id, classe).subscribe({
      next: (updatedClasse) => {
        const index = this.classes.findIndex(c => c.id === updatedClasse.id);
        if (index !== -1) {
          this.classes[index] = updatedClasse;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la mise à jour de la classe';
        this.isLoading = false;
      }
    });
  }

  deleteClasse(id: number): void {
    if (!confirm('Confirmer la suppression de cette classe ?')) return;

    this.isLoading = true;
    this.adminService.deleteClasse(id).subscribe({
      next: () => {
        this.classes = this.classes.filter(c => c.id !== id);
        if (this.selectedClasse?.id === id) {
          this.selectedClasse = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la suppression de la classe';
        this.isLoading = false;
      }
    });
  }

  private validerClasse(): boolean {
    if (!this.newClasse.nom) {
      this.errorMessage = 'Le nom de la classe est obligatoire';
      return false;
    }
    return true;
  }

  private reinitialiserFormulaireClasse(): void {
    this.newClasse = {
      nom: '',
      niveau: ''
    };
    this.errorMessage = null;
  }

  /* ============ GESTION CONGÉS ============ */
  approveConge(conge: Conge): void {
    this.isLoading = true;
    this.adminService.approuverConge(conge.id).subscribe({
      next: () => {
        this.congesEnAttente = this.congesEnAttente.filter(c => c.id !== conge.id);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de l\'approbation du congé';
        this.isLoading = false;
      }
    });
  }

  rejectConge(conge: Conge, motif: string): void {
    this.isLoading = true;
    this.adminService.rejeterConge(conge.id, motif).subscribe({
      next: () => {
        this.congesEnAttente = this.congesEnAttente.filter(c => c.id !== conge.id);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du rejet du congé';
        this.isLoading = false;
      }
    });
  }

  /* ============ GESTION RÉUNIONS ============ */
  createReunion(): void {
    if (!this.newReunion.sujet || !this.newReunion.dateHeure || !this.newReunion.lieu) {
      this.errorMessage = 'Tous les champs sont obligatoires';
      return;
    }

    this.isLoading = true;
    this.adminService.createReunion(this.newReunion).subscribe({
      next: (reunion) => {
        this.reunions.push(reunion);
        this.newReunion = {
          sujet: '',
          dateHeure: new Date(),
          lieu: ''
        };
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de la création de la réunion';
        this.isLoading = false;
      }
    });
  }

  sendReunionEmail(reunion: Reunion): void {
    if (!reunion.id) return;

    this.isLoading = true;
    this.adminService.sendReunionEmail(reunion.id).subscribe({
      next: () => {
        this.isLoading = false;
        alert('Email de rappel envoyé avec succès');
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors de l\'envoi de l\'email';
        this.isLoading = false;
      }
    });
  }

  /* ============ UTILITAIRES ============ */
  formaterDate(date: Date | string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }
}