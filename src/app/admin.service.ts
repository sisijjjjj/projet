import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

// Interfaces pour les modèles de données
export interface Admin {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  password?: string;
}

export interface Etudiant {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: Date | string;
  classe?: Classe;
}

export interface Enseignant {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  fullName?: string;
  nbClasse?: number;
  nbAnneeExperience?: number;
  statutConge?: 'ACTIF' | 'EN_CONGE';
}

export interface Note {
  id?: number;
  valeur: number;
  appreciation?: string;
  etudiant: Etudiant;
  cours: Cours;
  date?: Date | string;
}

export interface Absence {
  id?: number;
  date: Date | string;
  justifiee: boolean;
  motif?: string;
  etudiant: Etudiant;
  cours: Cours;
}

export interface Cours {
  id?: number;
  nom: string;
  description?: string;
  enseignant?: Enseignant;
}

export interface Emploi {
  id?: number;
  nom: string;
  fichier?: string;
  classe?: Classe;
}

export interface Classe {
  id?: number;
  name: string;
  level: string;
  enseignants?: Enseignant[];
  etudiants?: Etudiant[];
}

export interface Conge {
  id?: number;
  type: string;
  dateDebut: Date | string;
  dateFin: Date | string;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  motifRejet?: string;
  enseignant: Enseignant;
}

export interface Reunion {
  id?: number;
  sujet: string;
  dateHeure: Date | string;
  lieu: string;
  enseignant: Enseignant;
}

interface ClasseRequest {
  nom: string;
  niveau: string;
  enseignantIds?: number[];
}

interface EtudiantRequest {
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: Date | string;
  classeId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8081/api/admin';

  constructor(private http: HttpClient) { }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    return throwError(error);
  }

  // ==================== GENERAL METHODS ====================
  getAllAbsences(): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/absences`)
      .pipe(catchError(this.handleError));
  }

  getAllAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${this.apiUrl}/all`)
      .pipe(catchError(this.handleError));
  }

  getAllEmplois(): Observable<Emploi[]> {
    return this.http.get<Emploi[]>(`${this.apiUrl}/emploi`)
      .pipe(catchError(this.handleError));
  }

  getAllNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/notes`)
      .pipe(catchError(this.handleError));
  }

  getAllCours(): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/cours`)
      .pipe(catchError(this.handleError));
  }

  getAllClasses(): Observable<Classe[]> {
    return this.http.get<Classe[]>(`${this.apiUrl}/classes`)
      .pipe(catchError(this.handleError));
  }
// Dans admin.service.ts
getAllConges(): Observable<Conge[]> {
  return this.http.get<Conge[]>(`${this.apiUrl}/conges`)
    .pipe(
      tap((data: any) => console.log('Congés reçus:', data)), // Ajoutez ce log
      catchError(this.handleError)
    );
}
  // ==================== ADMIN CRUD ====================
  createAdmin(admin: Admin): Observable<Admin> {
    return this.http.post<Admin>(`${this.apiUrl}/add`, admin)
      .pipe(catchError(this.handleError));
  }

  getAdminById(id: number): Observable<Admin> {
    return this.http.get<Admin>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getPendingConges(): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/conges/en-attente`)
      .pipe(catchError(this.handleError));
  }

  approveConge(congeId: number): Observable<Conge> {
    return this.http.post<Conge>(`${this.apiUrl}/conges/${congeId}/approve`, null)
      .pipe(catchError(this.handleError));
  }

  rejectConge(congeId: number, motifRejet?: string): Observable<Conge> {
    return this.http.post<Conge>(`${this.apiUrl}/conges/${congeId}/reject`, { motifRejet })
      .pipe(catchError(this.handleError));
  }

  updateAdmin(id: number, admin: Admin): Observable<Admin> {
    return this.http.put<Admin>(`${this.apiUrl}/update/${id}`, admin)
      .pipe(catchError(this.handleError));
  }

  deleteAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== ETUDIANT CRUD ====================
  getAllEtudiants(): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.apiUrl}/etudiants`)
      .pipe(catchError(this.handleError));
  }

  getEtudiantById(id: number): Observable<Etudiant> {
    return this.http.get<Etudiant>(`${this.apiUrl}/etudiants/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateEtudiant(id: number, etudiant: Etudiant): Observable<Etudiant> {
    return this.http.put<Etudiant>(`${this.apiUrl}/etudiants/${id}`, etudiant)
      .pipe(catchError(this.handleError));
  }

  createEtudiant(etudiantRequest: EtudiantRequest): Observable<Etudiant> {
    return this.http.post<Etudiant>(`${this.apiUrl}/etudiants`, etudiantRequest)
      .pipe(catchError(this.handleError));
  }

  deleteEtudiant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/etudiants/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== ETUDIANT NOTES ====================
  addNoteToEtudiant(etudiantId: number, coursId: number, note: Note): Observable<Note> {
    return this.http.post<Note>(`${this.apiUrl}/etudiants/${etudiantId}/cours/${coursId}/notes`, note)
      .pipe(catchError(this.handleError));
  }

  getNotesByEtudiant(etudiantId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/etudiants/${etudiantId}/notes`)
      .pipe(catchError(this.handleError));
  }

  getNotesByEtudiantAndCours(etudiantId: number, coursId: number): Observable<Note> {
    return this.http.get<Note>(`${this.apiUrl}/etudiants/${etudiantId}/cours/${coursId}/notes`)
      .pipe(catchError(this.handleError));
  }

  updateEtudiantNote(etudiantId: number, noteId: number, note: Note): Observable<Note> {
    return this.http.put<Note>(`${this.apiUrl}/etudiants/${etudiantId}/notes/${noteId}`, note)
      .pipe(catchError(this.handleError));
  }

  deleteNote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/notes/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== ETUDIANT ABSENCES ====================
  addAbsenceToEtudiant(etudiantId: number, coursId: number, absence: Absence): Observable<Absence> {
    return this.http.post<Absence>(`${this.apiUrl}/etudiants/${etudiantId}/cours/${coursId}/absences`, absence)
      .pipe(catchError(this.handleError));
  }

  getJustifiedAbsencesByEtudiant(etudiantId: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/etudiants/${etudiantId}/absences/justifiees`)
      .pipe(catchError(this.handleError));
  }

  getUnjustifiedAbsencesByEtudiant(etudiantId: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/etudiants/${etudiantId}/absences/non-justifiees`)
      .pipe(catchError(this.handleError));
  }

  justifyAbsence(etudiantId: number, absenceId: number, motif: string): Observable<Absence> {
    return this.http.put<Absence>(`${this.apiUrl}/etudiants/${etudiantId}/absences/${absenceId}/justifier`, null)
      .pipe(catchError(this.handleError));
  }

  deleteAbsence(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/absences/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== ENSEIGNANT CRUD ====================
  getAllEnseignants(): Observable<Enseignant[]> {
    return this.http.get<Enseignant[]>(`${this.apiUrl}/enseignants`)
      .pipe(catchError(this.handleError));
  }

  getEnseignantById(id: number): Observable<Enseignant> {
    return this.http.get<Enseignant>(`${this.apiUrl}/enseignants/${id}`)
      .pipe(catchError(this.handleError));
  }

  updateEnseignant(id: number, enseignant: Enseignant): Observable<Enseignant> {
    return this.http.put<Enseignant>(`${this.apiUrl}/enseignants/${id}`, enseignant)
      .pipe(catchError(this.handleError));
  }

  deleteEnseignant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/enseignants/${id}`)
      .pipe(catchError(this.handleError));
  }

  createEnseignant(enseignant: Enseignant): Observable<Enseignant> {
    return this.http.post<Enseignant>(`${this.apiUrl}/enseignants`, enseignant)
      .pipe(catchError(this.handleError));
  }

  // ==================== CLASS ASSIGNMENT ====================
  assignEtudiantToClasse(etudiantId: number, classeId: number): Observable<Etudiant> {
    return this.http.post<Etudiant>(`${this.apiUrl}/etudiants/${etudiantId}/assigner-classe/${classeId}`, null)
      .pipe(catchError(this.handleError));
  }

  removeEtudiantFromClasse(etudiantId: number): Observable<Etudiant> {
    return this.http.post<Etudiant>(`${this.apiUrl}/etudiants/${etudiantId}/retirer-classe`, null)
      .pipe(catchError(this.handleError));
  }

  // ==================== COURS CRUD ====================
  createCours(coursData: Cours): Observable<Cours> {
    return this.http.post<Cours>(`${this.apiUrl}/cours`, coursData)
      .pipe(catchError(this.handleError));
  }

  deleteCours(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cours/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== CLASSES MANAGEMENT ====================
createClasse(classeData: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/classes`, classeData);
}

  addEtudiantsToClasse(classeId: number, etudiantIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/classes/${classeId}/etudiants`, etudiantIds)
      .pipe(catchError(this.handleError));
  }

  updateClasse(id: number, classeRequest: Partial<ClasseRequest>): Observable<Classe> {
    return this.http.put<Classe>(`${this.apiUrl}/classes/${id}`, classeRequest)
      .pipe(catchError(this.handleError));
  }

  getClasseDetails(id: number): Observable<Classe> {
    return this.http.get<Classe>(`${this.apiUrl}/classes/${id}`)
      .pipe(catchError(this.handleError));
  }

  addEnseignantToClasse(classeId: number, enseignantId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/classes/${classeId}/enseignants/${enseignantId}`, null)
      .pipe(catchError(this.handleError));
  }

  removeEnseignantFromClasse(classeId: number, enseignantId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/classes/${classeId}/enseignants/${enseignantId}`)
      .pipe(catchError(this.handleError));
  }

  deleteClasse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/classes/${id}`)
      .pipe(catchError(this.handleError));
  }

  getEtudiantsByClasse(id: number): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.apiUrl}/classes/${id}/etudiants`)
      .pipe(catchError(this.handleError));
  }

  getNotesByCours(id: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/cours/${id}/notes`)
      .pipe(catchError(this.handleError));
  }

  // ==================== OTHER FUNCTIONALITIES ====================
  getCoursForEtudiant(id: number): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/etudiants/${id}/cours`)
      .pipe(catchError(this.handleError));
  }

  getEmploiForEtudiant(id: number): Observable<Emploi> {
    return this.http.get<Emploi>(`${this.apiUrl}/etudiants/${id}/emploi`)
      .pipe(catchError(this.handleError));
  }

  getCongesForEnseignant(id: number): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/enseignants/${id}/conges`)
      .pipe(catchError(this.handleError));
  }

  getAbsencesForEnseignant(id: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/enseignants/${id}/absences`)
      .pipe(catchError(this.handleError));
  }

  getEmploiForEnseignant(id: number): Observable<Emploi> {
    return this.http.get<Emploi>(`${this.apiUrl}/enseignants/${id}/emploi`)
      .pipe(catchError(this.handleError));
  }

  // ==================== REUNIONS MANAGEMENT ====================
  addReunionForEnseignant(id: number, reunion: Reunion, sendEmail: boolean = true): Observable<Reunion> {
    const params = new HttpParams().set('sendEmail', String(sendEmail));
    return this.http.post<Reunion>(`${this.apiUrl}/enseignants/${id}/reunions`, reunion, { params })
      .pipe(catchError(this.handleError));
  }

  sendEmailForReunion(reunionId: number, customMessage?: string): Observable<any> {
    const params = customMessage ? new HttpParams().set('customMessage', customMessage) : new HttpParams();
    return this.http.post(`${this.apiUrl}/reunions/${reunionId}/send-email`, null, { params })
      .pipe(catchError(this.handleError));
  }

  getAllReunions(): Observable<Reunion[]> {
    return this.http.get<Reunion[]>(`${this.apiUrl}/reunions`)
      .pipe(catchError(this.handleError));
  }

  deleteReunion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reunions/${id}`)
      .pipe(catchError(this.handleError));
  }

 
  getCongesByStatut(statut: string): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/conges/statut/${statut}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== ADDITIONAL METHODS ====================
  getNotesByEtudiantId(etudiantId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/etudiants/${etudiantId}/notes`)
      .pipe(catchError(this.handleError));
  }

  getAbsencesByEtudiantId(etudiantId: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/etudiants/${etudiantId}/absences`)
      .pipe(catchError(this.handleError));
  }

  getCoursByEtudiantId(etudiantId: number): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/etudiants/${etudiantId}/cours`)
      .pipe(catchError(this.handleError));
  }

  getEmploiByEtudiantId(etudiantId: number): Observable<Emploi> {
    return this.http.get<Emploi>(`${this.apiUrl}/etudiants/${etudiantId}/emploi`)
      .pipe(catchError(this.handleError));
  }

  getCongesByEnseignantId(enseignantId: number): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/enseignants/${enseignantId}/conges`)
      .pipe(catchError(this.handleError));
  }

  getAbsencesByEnseignantId(enseignantId: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/enseignants/${enseignantId}/absences`)
      .pipe(catchError(this.handleError));
  }

  getEmploiByEnseignantId(enseignantId: number): Observable<Emploi> {
    return this.http.get<Emploi>(`${this.apiUrl}/enseignants/${enseignantId}/emploi`)
      .pipe(catchError(this.handleError));
  }
}