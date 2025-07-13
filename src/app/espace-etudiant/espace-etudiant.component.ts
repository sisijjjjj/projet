import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Etudiant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  classe?: Classe;
}

interface Classe {
  id: number;
  nom: string;
  niveau: string;
}

interface Cours {
  id: number;
  nom: string;
  description: string;
  enseignant?: Enseignant;
}

interface Enseignant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

interface Note {
  id: number;
  valeur: number;
  type: string;
  cours: Cours;
}

interface Absence {
  id: number;
  date: string;
  justifiee: boolean;
  motif?: string;
  cours: Cours;
}

interface EmailRequest {
  teacherEmail: string;
  subject?: string;
  message: string;
}

@Component({
  selector: 'app-espace-etudiant',
  templateUrl: './espace-etudiant.component.html',
  styleUrls: ['./espace-etudiant.component.css']
})
export class EspaceEtudiantComponent implements OnInit {
  private readonly API_URL = 'http://localhost:8081/api/etudiants';
  
  etudiants: Etudiant[] = [];
  currentStudent: Etudiant | null = null;
  coursList: Cours[] = [];
  notesList: Note[] = [];
  absencesList: Absence[] = [];
  allCoursList: Cours[] = [];
  selectedCourse: Cours | null = null;
  
  emailForm: FormGroup;
  emailSuccess = false;
  emailError: string | null = null;
  isLoading = false;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.emailForm = this.fb.group({
      teacherEmail: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.maxLength(100)],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.loadAllStudents();
  }

  loadAllStudents(): void {
    this.isLoading = true;
    this.http.get<Etudiant[]>(this.API_URL).pipe(
      catchError(err => {
        console.error('Error loading students:', err);
        return of([]);
      })
    ).subscribe({
      next: (etudiants) => {
        this.etudiants = etudiants;
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError('Erreur lors du chargement des étudiants', err);
        this.isLoading = false;
      }
    });
  }

  onStudentSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const etudiantId = selectElement.value;
    
    if (!etudiantId) {
      this.currentStudent = null;
      return;
    }

    this.isLoading = true;
    this.currentStudent = this.etudiants.find(e => e.id === +etudiantId) || null;
    
    if (!this.currentStudent) {
      this.isLoading = false;
      return;
    }

    forkJoin({
      cours: this.http.get<Cours[]>(`${this.API_URL}/${etudiantId}/cours`).pipe(
        catchError(err => {
          console.error('Error loading courses:', err);
          return of([]);
        })
      ),
      notes: this.http.get<Note[]>(`${this.API_URL}/${etudiantId}/notes`).pipe(
        catchError(err => {
          console.error('Error loading notes:', err);
          return of([]);
        })
      ),
      absences: this.http.get<Absence[]>(`${this.API_URL}/${etudiantId}/absences`).pipe(
        catchError(err => {
          console.error('Error loading absences:', err);
          return of([]);
        })
      ),
      allCours: this.http.get<Cours[]>(`${this.API_URL}/all/cours`).pipe(
        catchError(err => {
          console.error('Error loading all courses:', err);
          return of([]);
        })
      )
    }).subscribe({
      next: ({cours, notes, absences, allCours}) => {
        this.coursList = cours;
        this.notesList = notes;
        this.absencesList = absences;
        this.allCoursList = allCours;
        this.selectedCourse = cours.length > 0 ? cours[0] : null;
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError('Erreur lors du chargement des données étudiant', err);
        this.isLoading = false;
      }
    });
  }

  selectCourse(cours: Cours): void {
    this.selectedCourse = cours;
  }

  getEnseignantName(): string {
    if (!this.selectedCourse?.enseignant) {
      return 'Enseignant non spécifié';
    }
    return `${this.selectedCourse.enseignant.prenom} ${this.selectedCourse.enseignant.nom}`;
  }

  getEnseignantEmail(): string {
    return this.selectedCourse?.enseignant?.email || '';
  }

  sendEmail(): void {
    if (this.emailForm.invalid || !this.currentStudent || !this.selectedCourse) {
      return;
    }

    const teacherEmail = this.getEnseignantEmail();
    if (!teacherEmail) {
      this.emailError = 'Email enseignant non disponible';
      return;
    }

    this.isLoading = true;
    this.emailError = null;
    this.emailSuccess = false;

    const payload: EmailRequest = {
      teacherEmail: teacherEmail,
      subject: this.emailForm.value.subject,
      message: this.emailForm.value.message
    };

    this.http.post(
      `${this.API_URL}/${this.currentStudent.id}/send-email`,
      payload,
      { responseType: 'text' }
    ).subscribe({
      next: () => {
        this.emailSuccess = true;
        this.emailForm.reset();
        setTimeout(() => this.emailSuccess = false, 5000);
      },
      error: (err) => {
        this.emailError = err.error || 'Erreur lors de l\'envoi de l\'email';
        setTimeout(() => this.emailError = null, 5000);
      },
      complete: () => this.isLoading = false
    });
  }

  getNotesForCourse(courseId: number): Note[] {
    return this.notesList.filter(note => note.cours.id === courseId);
  }

  getAbsencesForCourse(courseId: number): Absence[] {
    return this.absencesList.filter(absence => absence.cours.id === courseId);
  }

  calculateCourseAverage(courseId: number): number | null {
    const notes = this.getNotesForCourse(courseId);
    if (notes.length === 0) return null;
    
    const sum = notes.reduce((acc, note) => acc + note.valeur, 0);
    return parseFloat((sum / notes.length).toFixed(2));
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.emailError = message;
    setTimeout(() => this.emailError = null, 5000);
  }
}