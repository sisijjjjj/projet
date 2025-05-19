import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';

interface Student {
  name: string;
  tp?: number;
  exam?: number;
  absences?: number;
}

interface Course {
  id?: number;
  name: string;
  students: Student[];
}

interface LeaveRequest {
  id: number;
  teacherId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Enseignant {
  id: number;
  version?: number;
  name?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  subject?: string;
  dateNaissance?: string;
  niveauScolaire?: string;
  diplome?: string;
  nbAnneeExperience?: number;
  nbClasse?: number;
  emploiTemps?: string;
  absences?: number;
  cours: Course[];
  reunions?: any[];
  demandesConge?: LeaveRequest[];
}

interface ApiResponse {
  success: boolean;
  data: Enseignant[] | Enseignant;
  message?: string;
}

@Component({
  selector: 'app-enseignant',
  templateUrl: './enseignant.component.html',
  styleUrls: ['./enseignant.component.css']
})
export class EnseignantComponent implements OnInit {
  enseignants: Enseignant[] = [];
  leaveRequests: LeaveRequest[] = [];
  
  isLoading = false;
  congeLoading = false;
  errorMessage = '';
  congeError = '';

  isDetailView = false;
  selectedEnseignant: Enseignant = {
    id: 0,
    cours: []
  };
  showNotesSection = false;
  showAbsenceSection = false;
  showLeaveRequestSection = false;

  newLeaveRequest = {
    startDate: '',
    endDate: '',
    reason: ''
  };

  constructor(private http: HttpClient) { }
  ngOnInit(): void {
    this.loadEnseignants();
  }
  
  loadEnseignants(): void {
    this.isLoading = true;
    this.errorMessage = '';
  
    this.http.get<any>('http://localhost:8080/api/admin/enseignants')
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur HTTP:', error);
          this.errorMessage = `Erreur serveur: ${error.status} - ${error.statusText}`;
          this.isLoading = false;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
  
          try {
            console.log('Réponse reçue:', response);
  
            if (Array.isArray(response)) {
              this.enseignants = response;
            } else if (response?.data && Array.isArray(response.data)) {
              this.enseignants = response.data;
            } else if (response && typeof response === 'object') {
              this.enseignants = [response];
            } else {
              this.enseignants = [];
              this.errorMessage = 'Format inattendu de la réponse.';
            }
  
            console.log('Liste enseignants:', this.enseignants);
  
          } catch (e) {
            console.error('Erreur de parsing:', e);
            this.errorMessage = 'Erreur lors de l’analyse des données.';
            this.enseignants = [];
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erreur dans le subscribe:', error);
          this.errorMessage = 'Une erreur est survenue lors de la récupération des données.';
        }
      });
  }
  
  private normalizeTeacherData(teacher: any): Enseignant {
    return {
      id: teacher.id || 0,
      nom: teacher.nom || teacher.name || 'Inconnu',
      prenom: teacher.prenom || '',
      email: teacher.email || '',
      subject: teacher.subject || '',
      nbAnneeExperience: teacher.nbAnneeExperience || 0,
      nbClasse: teacher.nbClasse || 0,
      cours: Array.isArray(teacher.cours) ? teacher.cours.map((c: any) => ({
        id: c.id,
        name: c.nom || c.name || 'Cours sans nom',
        students: []
      })) : [],
      demandesConge: Array.isArray(teacher.demandesConge) ? teacher.demandesConge : []
    };
  }

  afficherDetail(enseignant: Enseignant): void {
    this.selectedEnseignant = this.normalizeTeacherData(enseignant);
    this.isDetailView = true;
    this.resetSections();
    this.loadTeacherLeaveRequests(enseignant.id);
  }

  loadTeacherLeaveRequests(teacherId: number): void {
    this.congeLoading = true;
    this.congeError = '';
    
    this.http.get<LeaveRequest[]>(`http://localhost:8080/api/enseignants/${teacherId}/conges`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.congeError = `Erreur lors du chargement des congés: ${error.status}`;
          this.congeLoading = false;
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (requests) => {
          this.leaveRequests = requests || [];
          this.congeLoading = false;
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.congeLoading = false;
        }
      });
  }

  submitLeaveRequest(): void {
    if (!this.isLeaveRequestValid()) {
      alert('Veuillez remplir tous les champs obligatoires et vérifier les dates');
      return;
    }
  
    this.congeLoading = true;
    this.congeError = '';
    
    const newRequest = {
      teacherId: this.selectedEnseignant.id,
      startDate: this.newLeaveRequest.startDate,
      endDate: this.newLeaveRequest.endDate,
      reason: this.newLeaveRequest.reason,
      status: 'pending' as const
    };
  
    this.http.post<LeaveRequest>(
      `http://localhost:8080/api/enseignants/conges`,
      newRequest
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        this.congeLoading = false;
        this.congeError = `Erreur serveur: ${error.status} - ${error.message}`;
        return throwError(() => error);
      })
    ).subscribe({
      next: (response) => {
        this.leaveRequests.push(response);
        if (this.selectedEnseignant.demandesConge) {
          this.selectedEnseignant.demandesConge.push(response);
        } else {
          this.selectedEnseignant.demandesConge = [response];
        }
        alert('Demande de congé envoyée avec succès !');
        this.resetLeaveRequestForm();
        this.congeLoading = false;
      },
      error: (error) => {
        this.congeLoading = false;
        console.error('Erreur complète:', error);
      }
    });
  }

  updateLeaveRequestStatus(requestId: number, newStatus: 'approved' | 'rejected'): void {
    this.http.patch(
      `http://localhost:8080/api/conges/${requestId}/status`,
      { status: newStatus }
    ).subscribe({
      next: () => {
        const request = this.leaveRequests.find(r => r.id === requestId);
        if (request) {
          request.status = newStatus;
          alert('Statut mis à jour avec succès');
        }
      },
      error: (error) => {
        alert(`Erreur lors de la mise à jour: ${error.message}`);
      }
    });
  }

// Remplacer la méthode privée par une méthode publique
public isLeaveRequestValid(): boolean {
  if (!this.newLeaveRequest.startDate || !this.newLeaveRequest.endDate || !this.newLeaveRequest.reason) {
    return false;
  }
  
  const startDate = new Date(this.newLeaveRequest.startDate);
  const endDate = new Date(this.newLeaveRequest.endDate);
  
  return startDate <= endDate;
}

  private resetLeaveRequestForm(): void {
    this.newLeaveRequest = {
      startDate: '',
      endDate: '',
      reason: ''
    };
  }

  private resetSections(): void {
    this.showNotesSection = false;
    this.showAbsenceSection = false;
    this.showLeaveRequestSection = false;
  }

  // Méthodes pour la gestion des notes et absences
  addTp(student: Student, newTp: number | undefined): void {
    if (newTp !== undefined && newTp >= 0 && newTp <= 20) {
      student.tp = newTp;
    }
  }

  addExam(student: Student, newExam: number | undefined): void {
    if (newExam !== undefined && newExam >= 0 && newExam <= 20) {
      student.exam = newExam;
    }
  }

  markPresent(student: Student): void {
    student.absences = Math.max(0, (student.absences || 0) - 1);
    this.checkAbsences(student);
  }

  markAbsent(student: Student): void {
    student.absences = (student.absences || 0) + 1;
    this.checkAbsences(student);
  }

  private checkAbsences(student: Student): void {
    if ((student.absences || 0) > 3) {
      student.tp = 0;
      student.exam = 0;
      alert(`${student.name} a trop d'absences! Notes réinitialisées.`);
    }
  }

  retourListe(): void {
    this.isDetailView = false;
    this.resetSections();
  }

  showNotes(): void {
    this.showNotesSection = true;
    this.showAbsenceSection = false;
    this.showLeaveRequestSection = false;
  }

  showAbsences(): void {
    this.showNotesSection = false;
    this.showAbsenceSection = true;
    this.showLeaveRequestSection = false;
  }

  showLeaveRequest(): void {
    this.showNotesSection = false;
    this.showAbsenceSection = false;
    this.showLeaveRequestSection = true;
    this.resetLeaveRequestForm();
  }

  calculateAverage(tp: number | undefined, exam: number | undefined): number {
    const tpValue = tp || 0;
    const examValue = exam || 0;
    return (tpValue + examValue) / 2;
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  }

  isAdminView(): boolean {
    return false; // À adapter selon votre logique d'authentification
  }

  removeStudentFromCourse(course: Course, student: Student): void {
    course.students = course.students.filter(s => s !== student);
  }

  logout(): void {
    console.log('Déconnexion effectuée');
    alert('Vous avez été déconnecté(e)');
  }

  updateEnseignantInfo(updatedData: Partial<Enseignant>): void {
    if (!this.selectedEnseignant.id) {
      alert('Aucun enseignant sélectionné');
      return;
    }
  
    this.http.put<Enseignant>(
      `http://localhost:8080/api/enseignants/${this.selectedEnseignant.id}`,
      updatedData
    ).subscribe({
      next: (response) => {
        Object.assign(this.selectedEnseignant, response);
        // Mettre à jour aussi dans la liste principale
        const index = this.enseignants.findIndex(e => e.id === response.id);
        if (index !== -1) {
          this.enseignants[index] = { ...this.enseignants[index], ...response };
        }
        alert('Informations mises à jour avec succès');
      },
      error: (error) => {
        alert(`Erreur lors de la mise à jour: ${error.message}`);
      }
    });
  }
  
}