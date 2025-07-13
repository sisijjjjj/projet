import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of, throwError } from 'rxjs';

import { catchError, finalize, map, switchMap } from 'rxjs/operators';

const API_URL = 'http://localhost:8081/api/admin';

interface ClasseResponse {
  id: number;
  nom: string;
  niveau: string | undefined;
  classeId?: number;
  classeNom?: string;
  classeNiveau?: string;
  message?: string;
}

interface Admin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: string;
}
interface EtudiantAbsence {
  id: number;
  date: string;
  motif: string;
  justifiee: boolean;
}

interface Etudiant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  dateNaissance: string;
  status: 'ACTIF' | 'INACTIF' | 'DIPLOME';
  classe?: number | { id: number; nom: string; niveau?: string };
  enseignant?: {
    id: number;
    nom: string;
    prenom: string;
  };
  eliminated?: boolean;
  deleted?: boolean;
  absences?: number;
  moyenneGenerale?: number;
  niveauScolaire?: string;
  absencesDetails?: EtudiantAbsence[]; // Nouveau champ pour les détails d'absence
}

interface Enseignant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  dateNaissance: string;
  diplome: string;
  nbAnneeExperience: number;
  matieresEnseignees: string[];
  status: 'ACTIVE' | 'INACTIVE';
  classes?: number[] | { id: number; nom: string; niveau?: string }[];
  statutConge?: 'EN_CONGE' | 'ACTIF';
}

interface Note {
  valeur: number;
  id?: number;
  tp: number;
  type?: string;
  exam: number;
  date?: string;
  absences: number;
  moyenne: number;
  deleted?: boolean;
  cours?: Cours | number;
  etudiant?: Etudiant | number;
  enseignant?: Enseignant;
  etudiantId?: number;
  coursId?: number;
  enseignantId?: number;
}

interface Absence {
  id: number;
  etudiantId: number;
  coursId: number;
 matiere?: string; 
  date: string; // Format: YYYY-MM-DD
  motif: string;
  justifiee: boolean;
  createdAt?: string;
  updatedAt?: string;
  etudiant?: {
    id: number;
    nom: string;
    prenom: string;
  };
  cours?: {
    id: number;
    nom: string;
    matiere: string;
  };
}

interface Cours {
  matiere: string;
  id: number;
  nom: string;
  description: string;
  enseignant?: Enseignant;
  classe?: Classe;
}

interface Emploi {
  id: number;
  dateDebut: string;
  dateFin: string;
  contenu: string;
  classe?: Classe;
}

interface Conge {
  id: number;
  type: 'ANNUEL' | 'MALADIE' | 'MATERNITE' | 'PATERNITE' | 'FORMATION';
  dateDebut: string;
  dateFin: string;
  motif: string;
  statut: 'EN_ATTENTE' | 'APPROUVE' | 'REJETE';
  enseignant?: Enseignant;
  etudiant?: Etudiant;
  motifRejet?: string;
  demandeurType: 'ENSEIGNANT' | 'ETUDIANT';
}

interface Classe {
  id: number;
  nom: string;
  niveau: string;
  moyenneGenerale: number | null;
  nombreAbsences: number;
  studentCount: number;
 enseignants: { id: number, nomComplet: string }[];
  moyenneFormatted: string;
  absencesFormatted: string;
  enseignantsNoms?: string;
  moyenneClasse?: number;
}

interface Reunion {
  id: number;
  sujet: string;
  dateHeure: string;
  lieu: string;
  description: string;
  enseignant?: Enseignant | null;
  statut: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
}

interface DashboardStats {
  activeStudents: number;
  teachersCount: number;
  inactiveStudents: number;
  lateStudents: number;
  studentsWithExcessiveAbsences: number;
  totalMeetings: number;
  pendingLeaves: number;
  lockedAccounts: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  activeSection = 'dashboard';
  showModal = false;
  modalContent = '';
  isProcessing = false;
  isLoading = false;
  isRefreshing = false;

  stats: DashboardStats = {
    activeStudents: 0,
    teachersCount: 0,
    inactiveStudents: 0,
    lateStudents: 0,
    studentsWithExcessiveAbsences: 0,
    totalMeetings: 0,
    pendingLeaves: 0,
    lockedAccounts: 0
  };

  admins: Admin[] = [];
  students: Etudiant[] = [];
  teachers: Enseignant[] = [];
  meetings: Reunion[] = [];
  leaves: Conge[] = [];
  classes: Classe[] = [];
  notes: Note[] = [];
  absences: Absence[] = [];
  courses: Cours[] = [];
  schedules: Emploi[] = [];

  selectedStudents: number[] = [];
  selectedTeachers: number[] = [];
  selectedMeetings: number[] = [];
  selectAllStudents = false;
  selectAllTeachers = false;
  selectAllMeetings = false;

  // Form data
  studentForm: Partial<Etudiant> & { passwordConfirm?: string, classeId?: number, niveauScolaire?: string } = this.createEmptyStudent();
  teacherForm: Partial<Enseignant> & { passwordConfirm?: string } = this.createEmptyTeacher();
  meetingForm: Partial<Reunion> & { sendEmail?: boolean } = this.createEmptyMeeting();
  leaveForm: Partial<Conge> & { demandeurType?: 'ENSEIGNANT' | 'ETUDIANT' } = this.createEmptyLeave();
  noteForm: Partial<Note> & { etudiantId?: number, coursId?: number } = this.createEmptyNote();
  absenceForm: Partial<Absence> & { etudiantId?: number, coursId?: number } = this.createEmptyAbsence();
  classForm: Partial<Classe> & { enseignantIds?: number[] } = this.createEmptyClass();

  // Options for forms
  statusOptions = [
    { value: 'ACTIF', label: 'Actif' },
    { value: 'INACTIF', label: 'Inactif' },
    { value: 'DIPLOME', label: 'Diplômé' }
  ];
 
  teacherStatusOptions = [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'INACTIVE', label: 'Inactif' }
  ];

  leaveTypes = [
    { value: 'ANNUEL', label: 'Congé annuel' },
    { value: 'MALADIE', label: 'Congé maladie' },
    { value: 'MATERNITE', label: 'Congé maternité' },
    { value: 'PATERNITE', label: 'Congé paternité' },
    { value: 'FORMATION', label: 'Congé formation' }
  ];

  noteTypes = [
    { value: 'CONTROLE', label: 'Contrôle' },
    { value: 'EXAMEN', label: 'Examen' },
    { value: 'DEVOIR', label: 'Devoir' }
  ];

  meetingStatusOptions = [
    { value: 'PLANNED', label: 'Planifiée' },
    { value: 'COMPLETED', label: 'Terminée' },
    { value: 'CANCELLED', label: 'Annulée' }
  ];

  subjects = ['Mathématiques', 'Physique', 'Chimie', 'Français', 'Anglais', 'Histoire', 'Géographie', 'Philosophie', 'SVT', 'EPS'];
  meetingRooms = ['Salle A', 'Salle B', 'Salle C', 'Amphithéâtre'];
  classLevels = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'];

  @ViewChild('activityChart') activityChartRef!: ElementRef;
  @ViewChild('classChart') classChartRef!: ElementRef;
  @ViewChild('absenceChart') absenceChartRef!: ElementRef;
  @ViewChild('statusChart') statusChartRef!: ElementRef;
  @ViewChild('performanceChart') performanceChartRef!: ElementRef;

  private activityChart?: Chart;
  private classChart?: Chart;
  private absenceChart?: Chart;
  private statusChart?: Chart;
  private performanceChart?: Chart;
  filteredTeachers: any;
  allTeachers: any;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCharts(), 500);
  }

getStudentClassName(studentId: number): Observable<ClasseResponse> {
  return this.http.get<ClasseResponse>(`${API_URL}/etudiants/${studentId}/classe/nom`).pipe(
    catchError(() => of({ 
      id: 0,           // Default ID
      nom: 'Inconnu',  // Default class name
      niveau: ''       // Default level
    }))
  );
}

  getTeacherClassNames(teacherId: number): Observable<ClasseResponse[]> {
    return this.http.get<ClasseResponse[]>(`${API_URL}/enseignants/${teacherId}/classes/noms`).pipe(
      catchError(() => of([]))
    );
  }

  getClassName(student: Etudiant): string {
    if (!student.classe) {
      if (student.id) {
        this.getStudentClassName(student.id).subscribe({
          next: (response) => {
            if (response.classeNom) {
              const studentIndex = this.students.findIndex(s => s.id === student.id);
              if (studentIndex !== -1) {
                this.students[studentIndex].classe = {
                  id: response.classeId || 0,
                  nom: response.classeNom,
                  niveau: response.classeNiveau || ''
                };
                this.cdr.detectChanges();
              }
            }
          }
        });
      }
      return 'Chargement...';
    }
   
    if (typeof student.classe === 'object') {
      return student.classe.nom || 'Non assigné';
    } else {
      const foundClass = this.classes.find(c => c.id === student.classe);
      return foundClass?.nom || 'Non assigné';
    }
  }

  getTeacherClassNamesDisplay(teacher: Enseignant): string {
    if (!teacher.classes || teacher.classes.length === 0) {
      if (teacher.id) {
        this.getTeacherClassNames(teacher.id).subscribe({
          next: (response) => {
            if (Array.isArray(response) && response.length > 0) {
              const teacherIndex = this.teachers.findIndex(t => t.id === teacher.id);
              if (teacherIndex !== -1) {
                this.teachers[teacherIndex].classes = response.map(classe => ({
                  id: classe.classeId || 0,
                  nom: classe.classeNom || '',
                  niveau: classe.classeNiveau || ''
                }));
                this.cdr.detectChanges();
              }
            }
          }
        });
      }
      return 'Chargement...';
    }
   
    if (typeof teacher.classes[0] === 'object') {
      return (teacher.classes as { id: number; nom: string }[])
        .map(c => c.nom)
        .join(', ');
    } else {
      return (teacher.classes as number[])
        .map(classId => {
          const foundClass = this.classes.find(c => c.id === classId);
          return foundClass?.nom || '';
        })
        .filter(name => name)
        .join(', ') || 'Non assignée';
    }
  }

  private loadAllData(): void {
    if (this.isLoading) return;
   
    this.isLoading = true;
    this.isRefreshing = true;

    this.loadClasses().pipe(
      switchMap(classes => {
        this.classes = classes;
        return forkJoin({
          admins: this.loadAdmins(),
          students: this.loadStudents(),
          teachers: this.loadTeachers(),
          meetings: this.loadMeetings(),
          leaves: this.loadLeaves(),
          notes: this.loadNotes(),
          absences: this.loadAbsences(),
          courses: this.loadCourses(),
          schedules: this.loadSchedules()
        });
      })
    ).subscribe({
      next: (results) => {
        this.admins = results.admins;
        this.students = results.students;
        this.teachers = results.teachers;
        this.meetings = results.meetings;
        this.leaves = results.leaves;
        this.notes = results.notes;
        this.absences = results.absences;
        this.courses = results.courses;
        this.schedules = results.schedules;

        this.updateStats();
        this.initCharts();
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.handleError('Chargement initial', err);
        this.isLoading = false;
        this.isRefreshing = false;
      }
    });
  }

  private loadAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${API_URL}/all`).pipe(
      catchError(err => this.handleErrorAndReturn('admins', err, [])))
  }

  private loadStudents(): Observable<Etudiant[]> {
  return this.http.get<Etudiant[]>(`${API_URL}/etudiants`).pipe(
    switchMap(students => {
      return forkJoin(
        students.map(student => {
          // Préparer les requêtes pour chaque étudiant
          const requests: [
            Observable<ClasseResponse | null>,
            Observable<EtudiantAbsence[]>
          ] = [
            student.classe && typeof student.classe === 'number' 
              ? this.getClasseDetails(student.classe).pipe(
                  catchError(() => of(null))
                )
              : of(null),
            
            this.getStudentAbsences(student.id).pipe(
              catchError(() => of([]))
            )
          ];

          return forkJoin(requests).pipe(
            map(([classeDetails, absences]) => {
              const updatedStudent: Etudiant = {
                ...student,
                status: student.status || 'ACTIF',
                absences: absences.length,
                absencesDetails: absences,
              };

              // Gestion de la classe
              if (classeDetails) {
                updatedStudent.classe = {
                  id: classeDetails.id,
                  nom: classeDetails.nom,
                  niveau: classeDetails.niveau
                };
              }

              return updatedStudent;
            })
          );
        })
      );
    }),
    catchError(err => this.handleErrorAndReturn('students', err, []))
  );
}

private getClasseDetails(classeId: number): Observable<ClasseResponse> {
  return this.http.get<ClasseResponse>(`${API_URL}/classes/${classeId}`);
}



// Méthode pour récupérer les absences d'un étudiant
private getStudentAbsences(studentId: number): Observable<any[]> {
  return this.http.get<any[]>(`${API_URL}/etudiants/${studentId}/absences`).pipe(
    map(absences => absences || []), // Garantit un tableau même si null
    catchError(() => of([])) // Retourne un tableau vide en cas d'erreur
  );
}
  private loadTeachers(): Observable<Enseignant[]> {
    return this.http.get<Enseignant[]>(`${API_URL}/enseignants`).pipe(
      switchMap(teachers => {
        return forkJoin(
          teachers.map(teacher => {
            if (teacher.classes && teacher.classes.length > 0 && typeof teacher.classes[0] === 'number') {
              return this.getTeacherClassNames(teacher.id).pipe(
                map(classesResponse => ({
                  ...teacher,
                  classes: classesResponse.map(cr => ({
                    id: cr.classeId || 0,
                    nom: cr.classeNom || 'Inconnu',
                    niveau: cr.classeNiveau || ''
                  })),
                  status: teacher.status || 'ACTIVE',
                  matieresEnseignees: teacher.matieresEnseignees || []
                })),
                catchError(() => of({
                  ...teacher,
                  classes: [],
                  status: teacher.status || 'ACTIVE',
                  matieresEnseignees: teacher.matieresEnseignees || []
                }))
              );
            }
            return of({
              ...teacher,
              status: teacher.status || 'ACTIVE',
              matieresEnseignees: teacher.matieresEnseignees || [],
              classes: teacher.classes || []
            });
          })
        );
      }),
      catchError(err => this.handleErrorAndReturn('teachers', err, [])))
  }

private loadClasses(): Observable<Classe[]> {
  return this.http.get<any[]>(`${API_URL}/classes`).pipe(
    map((classes: any[]) => classes.map(c => {
      // Définir explicitement le type pour les enseignants avec gestion plus robuste des noms
      const enseignants = Array.isArray(c.enseignants)
        ? c.enseignants.map((e: {id: number, nomComplet?: string, prenom?: string, nom?: string}) => {
            // Gestion plus complète du nom complet
            let nomComplet = e.nomComplet;
            if (!nomComplet) {
              const prenom = e.prenom || '';
              const nom = e.nom || '';
              nomComplet = `${prenom} ${nom}`.trim();
              if (!nomComplet) nomComplet = 'Enseignant sans nom';
            }
            return {
              id: e.id,
              nomComplet: nomComplet
            };
          })
        : [];

      // Gestion du niveau avec valeur par défaut plus explicite
      const niveau = c.niveau || 'Niveau non spécifié';
      
      return {
        id: c.id,
        nom: c.nom || c.name || 'Classe sans nom',
        niveau: niveau,
        moyenneGenerale: c.moyenneGenerale ?? null,
        nombreAbsences: c.nombreAbsences ?? 0,
        studentCount: c.studentCount ?? 0,
        enseignants: enseignants,
        moyenneFormatted: c.moyenneGenerale?.toFixed(2) ?? 'N/A',
        absencesFormatted: (c.nombreAbsences ?? 0).toString(),
        enseignantsNoms: enseignants.length > 0
          ? enseignants.map((e: { nomComplet: any; }) => e.nomComplet).join(', ')
          : 'Aucun enseignant',
        moyenneClasse: c.moyenneGenerale ?? 0
      } as Classe;
    })),
    catchError(err => this.handleErrorAndReturn('classes', err, []))
  );
}
  private loadMeetings(): Observable<Reunion[]> {
    return this.http.get<Reunion[]>(`${API_URL}/reunions`).pipe(
      catchError(err => this.handleErrorAndReturn('meetings', err, [])))
  }

  private loadLeaves(): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${API_URL}/conges`).pipe(
      catchError(error => {
        console.error('Error fetching leaves:', error);
        return of([]);
      })
    );
  }

  private loadNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_URL}/notes`).pipe(
      switchMap(notes => {
        if (notes.length > 0 && typeof notes[0].cours === 'object' && typeof notes[0].etudiant === 'object') {
          return of(notes.map(note => this.mapNote(note)));
        }
       
        return forkJoin(
          notes.map(note => {
            const requests = {
              note: of(note),
              cours: note.coursId ? this.getCourseDetails(note.coursId) : of(null),
              etudiant: note.etudiantId ? this.getStudentDetails(note.etudiantId) : of(null)
            };
            return forkJoin(requests).pipe(
              map(({note, cours, etudiant}) => this.mapNote(note, cours, etudiant))
            );
          })
        );
      }),
      catchError(err => this.handleErrorAndReturn('notes', err, []))
    );
  }

  private mapNote(note: Note, cours?: Cours | null, etudiant?: Etudiant | null): Note {
    return {
      ...note,
      cours: cours || note.cours,
      etudiant: etudiant || note.etudiant,
      coursId: note.coursId || (note.cours as Cours)?.id,
      etudiantId: note.etudiantId || (note.etudiant as Etudiant)?.id,
      type: note.type || 'DEVOIR',
      date: note.date || new Date().toISOString().split('T')[0]
    };
  }

  private getCourseDetails(courseId: number): Observable<Cours> {
    return this.http.get<Cours>(`${API_URL}/cours/${courseId}`).pipe(
      catchError(() => of({ id: courseId, nom: 'Inconnu', description: '' } as Cours))
    );
  }

  private getStudentDetails(studentId: number): Observable<Etudiant> {
    return this.http.get<Etudiant>(`${API_URL}/etudiants/${studentId}`).pipe(
      catchError(() => of({
        id: studentId,
        nom: 'Inconnu',
        prenom: '',
        email: '',
        dateNaissance: '',
        status: 'ACTIF'
      } as Etudiant))
    );
  }

  addNote(): void {
    if (!this.validateNoteForm()) return;

    this.isProcessing = true;
    const noteData = this.prepareNoteData();

    this.http.post<Note>(`${API_URL}/notes`, noteData).pipe(
      switchMap(() => this.loadNotes())
    ).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.handleSaveSuccess('note');
      },
      error: (err) => this.handleSaveError('note', err)
    });
  }

  private validateNoteForm(): boolean {
    const requiredFields = ['tp', 'exam', 'etudiantId', 'coursId', 'enseignantId'];
    const missingFields = requiredFields.filter(field => !this.noteForm[field as keyof typeof this.noteForm]);
   
    if (missingFields.length > 0) {
      this.showNotification(`Champs obligatoires manquants : ${missingFields.join(', ')}`);
      return false;
    }

    if (this.noteForm.tp! < 0 || this.noteForm.tp! > 20 ||
        this.noteForm.exam! < 0 || this.noteForm.exam! > 20) {
      this.showNotification('Les notes doivent être comprises entre 0 et 20');
      return false;
    }

    return true;
  }
private loadAbsences(etudiantId?: number): Observable<Absence[]> {
  const url = etudiantId 
    ? `${API_URL}/etudiants/${etudiantId}/absences`
    : `${API_URL}/absences`;

  return this.http.get<Absence[]>(url).pipe(
    map((absences: Absence[]) => absences.map((absence: Absence) => {
      const formattedDate = absence.date 
        ? this.formatDateForBackend(absence.date) 
        : new Date().toISOString().split('T')[0];

      return {
        ...absence,
        date: formattedDate,
        status: absence.justifiee ? 'Justifiée' : 'Non justifiée',
        displayDate: this.formatDateForDisplay(formattedDate),
        etudiant: absence.etudiant || this.getStudentInfo(absence.etudiantId),
        cours: absence.cours || this.getCourseInfo(absence.coursId)
      };
    })),
    map((absences: Absence[]) => absences.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )),
    catchError((err: any) => {
      console.error('Erreur lors du chargement des absences:', err);
      return this.handleErrorAndReturn<Absence[]>('absences', err, []); // Now passing 3 arguments
    }))
  ;
}
  private prepareNoteData(): Note {
    const moyenne = (this.noteForm.tp! * 0.4) + (this.noteForm.exam! * 0.6);

    return {
      tp: this.noteForm.tp!,
      exam: this.noteForm.exam!,
      absences: this.noteForm.absences || 0,
      moyenne: parseFloat(moyenne.toFixed(2)),
      etudiantId: this.noteForm.etudiantId!,
      coursId: this.noteForm.coursId!,
      enseignantId: this.noteForm.enseignantId!,
      valeur: 0,
      type: this.noteForm.type || 'DEVOIR',
      date: this.noteForm.date || new Date().toISOString().split('T')[0]
    };
  }

 
// Méthodes utilitaires

private formatDateForDisplay(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

private getStudentInfo(studentId: number): { id: number, nom: string, prenom: string } {
  // Implémentez la logique pour récupérer les infos étudiant si nécessaire
  return { id: studentId, nom: 'Inconnu', prenom: '' };
}

private getCourseInfo(courseId: number): { id: number, nom: string, matiere: string } {
  // Implémentez la logique pour récupérer les infos cours si nécessaire
  return { id: courseId, nom: 'Cours inconnu', matiere: '' };
}

  private loadCourses(): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${API_URL}/cours`).pipe(
      map(courses => courses.map(course => ({
        ...course,
        enseignant: course.enseignant ? this.teachers.find(t => t.id === course.enseignant?.id) : undefined,
        classe: course.classe ? this.classes.find(c => c.id === course.classe?.id) : undefined
      }))),
      catchError(err => this.handleErrorAndReturn('courses', err, [])))
  }

  private loadSchedules(): Observable<Emploi[]> {
    return this.http.get<Emploi[]>(`${API_URL}/emploi`).pipe(
      catchError(err => this.handleErrorAndReturn('schedules', err, []))
    );
  }

  private handleErrorAndReturn<T>(context: string, error: any, defaultValue: T): Observable<T> {
    this.handleError(context, error);
    return of(defaultValue);
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  private formatDateTimeForBackend(dateTimeString: string): string {
    if (!dateTimeString) return '';
   
    if (!dateTimeString.includes('T')) {
      dateTimeString = `${dateTimeString}T00:00`;
    }
   
    if (dateTimeString.length === 16) {
      dateTimeString += ':00';
    }
   
    return dateTimeString;
  }

  getTeacherName(id?: number): string {
    if (!id) return 'Non attribué';
    const teacher = this.teachers.find(t => t.id === id);
    return teacher ? `${teacher.prenom} ${teacher.nom}` : 'Non attribué';
  }

  getRequesterName(leave: Conge): string {
    if (leave.demandeurType === 'ENSEIGNANT') {
      return leave.enseignant ? `${leave.enseignant.prenom} ${leave.enseignant.nom}` : 'Enseignant inconnu';
    } else {
      return leave.etudiant ? `${leave.etudiant.prenom} ${leave.etudiant.nom}` : 'Étudiant inconnu';
    }
  }

  formatDateTime(dateTimeString: string): string {
    return new Date(dateTimeString).toLocaleString('fr-FR');
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  getSectionTitle(): string {
    switch(this.activeSection) {
      case 'dashboard': return 'Tableau de bord';
      case 'students': return 'Gestion des étudiants';
      case 'teachers': return 'Gestion des enseignants';
      case 'classes': return 'Gestion des classes';
      case 'meetings': return 'Gestion des réunions';
      case 'leaves': return 'Gestion des congés';
      case 'notes': return 'Gestion des notes';
      default: return 'Tableau de bord';
    }
  }

  getModalTitle(): string {
    switch(this.modalContent) {
      case 'add-student': return 'Ajouter un étudiant';
      case 'edit-student': return 'Modifier un étudiant';
      case 'add-teacher': return 'Ajouter un enseignant';
      case 'edit-teacher': return 'Modifier un enseignant';
      case 'add-meeting': return 'Planifier une réunion';
      case 'edit-meeting': return 'Modifier une réunion';
      case 'add-leave': return 'Demander un congé';
      case 'add-note': return 'Ajouter une note';
      case 'add-absence': return 'Ajouter une absence';
      case 'add-class': return 'Ajouter une classe';
      case 'edit-class': return 'Modifier une classe';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'ACTIF': 'Actif',
      'INACTIF': 'Inactif',
      'DIPLOME': 'Diplômé',
      'ACTIVE': 'Actif',
      'INACTIVE': 'Inactif',
      'EN_ATTENTE': 'En attente',
      'APPROUVE': 'Approuvé',
      'REJETE': 'Rejeté',
      'PLANNED': 'Planifiée',
      'COMPLETED': 'Terminée',
      'CANCELLED': 'Annulée',
      'EN_CONGE': 'En congé'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      'ACTIF': 'success',
      'INACTIF': 'danger',
      'DIPLOME': 'secondary',
      'ACTIVE': 'success',
      'INACTIVE': 'danger',
      'EN_ATTENTE': 'warning',
      'APPROUVE': 'success',
      'REJETE': 'danger',
      'PLANNED': 'info',
      'COMPLETED': 'success',
      'CANCELLED': 'danger',
      'EN_CONGE': 'secondary'
    };
    return statusColors[status] || 'secondary';
  }

  getLeaveTypeLabel(type: string): string {
    const typeLabels: Record<string, string> = {
      'ANNUEL': 'Congé annuel',
      'MALADIE': 'Congé maladie',
      'MATERNITE': 'Congé maternité',
      'PATERNITE': 'Congé paternité',
      'FORMATION': 'Congé formation'
    };
    return typeLabels[type] || type;
  }

  getNoteTypeLabel(type?: string): string {
    if (!type) return 'Non spécifié';
    const typeLabels: Record<string, string> = {
      'CONTROLE': 'Contrôle',
      'EXAMEN': 'Examen',
      'DEVOIR': 'Devoir'
    };
    return typeLabels[type] || type;
  }

  saveStudent(): void {
    if (!this.validateStudentForm()) return;

    this.isProcessing = true;
    const studentData = this.prepareStudentData();

    this.http.post<Etudiant>(`${API_URL}/etudiants`, studentData).pipe(
      switchMap((savedStudent) => {
        return this.http.get<Etudiant>(`${API_URL}/etudiants/${savedStudent.id}?expand=classe`);
      })
    ).subscribe({
      next: (fullStudent) => {
        let studentWithClass: Etudiant;
       
        if (fullStudent.classe && typeof fullStudent.classe === 'object') {
          studentWithClass = {
            ...fullStudent,
            classe: {
              id: fullStudent.classe.id,
              nom: fullStudent.classe.nom
            }
          };
        } else if (typeof fullStudent.classe === 'number') {
          const foundClass = this.classes.find(c => c.id === fullStudent.classe);
          studentWithClass = {
            ...fullStudent,
            classe: foundClass ? {
              id: foundClass.id,
              nom: foundClass.nom
            } : undefined
          };
        } else {
          studentWithClass = {
            ...fullStudent,
            classe: undefined
          };
        }
       
        const index = this.students.findIndex(s => s.id === fullStudent.id);
        if (index !== -1) {
          this.students[index] = studentWithClass;
        } else {
          this.students.unshift(studentWithClass);
        }
       
        this.handleSaveSuccess('student');
        this.updateStats();
      },
      error: (err) => this.handleSaveError('student', err)
    });
  }

  private validateStudentForm(): boolean {
    const requiredFields = ['nom', 'prenom', 'email', 'dateNaissance'];
    const missingFields = requiredFields.filter(field => !this.studentForm[field as keyof typeof this.studentForm]);
   
    if (missingFields.length > 0) {
      this.showNotification(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
      return false;
    }

    if (!this.validateEmail(this.studentForm.email!)) {
      this.showNotification('Veuillez entrer une adresse email valide');
      return false;
    }

    if (this.studentForm.password !== this.studentForm.passwordConfirm) {
      this.showNotification('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  }

  private prepareStudentData(): any {
    return {
      nom: this.studentForm.nom,
      prenom: this.studentForm.prenom,
      email: this.studentForm.email,
      password: this.studentForm.password,
      dateNaissance: this.formatDateForBackend(this.studentForm.dateNaissance!),
      classeId: this.studentForm.classeId,
      niveauScolaire: this.studentForm.niveauScolaire
    };
  }

  toggleStudentStatus(studentId: number): void {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return;

    const newStatus = student.status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
   
    this.http.patch(`${API_URL}/etudiants/${studentId}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          student.status = newStatus;
          this.updateStats();
        },
        error: (err) => {
          console.error(err);
          this.showNotification('Échec de la modification du statut');
        }
      });
  }

  deleteStudent(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cet étudiant?')) return;
   
    this.http.delete(`${API_URL}/etudiants/${id}`).pipe(
      switchMap(() => this.loadStudents())
    ).subscribe({
      next: (students) => {
        this.students = students;
        this.updateStats();
        this.showNotification('Étudiant supprimé avec succès');
      },
      error: (err) => {
        this.handleError('deleting student', err);
      }
    });
  }
 

  saveTeacher(): void {
    if (!this.validateTeacherForm()) return;

    this.isProcessing = true;
    const teacherData = this.prepareTeacherData();

    const request = this.teacherForm.id
      ? this.http.put<Enseignant>(`${API_URL}/enseignants/${this.teacherForm.id}`, teacherData)
      : this.http.post<Enseignant>(`${API_URL}/enseignants`, teacherData);

    request.pipe(
      switchMap(teacher => {
        if (this.teacherForm.id) {
          const index = this.teachers.findIndex(t => t.id === teacher.id);
          if (index !== -1) {
            this.teachers[index] = teacher;
          }
        } else {
          this.teachers.unshift(teacher);
        }
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.handleSaveSuccess('teacher');
      },
      error: (err) => this.handleSaveError('teacher', err)
    });
  }

  private validateTeacherForm(): boolean {
    const requiredFields = ['nom', 'prenom', 'email', 'matieresEnseignees'];
    const missingFields = requiredFields.filter(field => {
      const value = this.teacherForm[field as keyof typeof this.teacherForm];
      return Array.isArray(value) ? value.length === 0 : !value;
    });

    if (missingFields.length > 0) {
      this.showNotification(`Veuillez remplir les champs obligatoires: ${missingFields.join(', ')}`);
      return false;
    }

    if (!this.validateEmail(this.teacherForm.email!)) {
      this.showNotification('Veuillez entrer une adresse email valide');
      return false;
    }

    if (!this.teacherForm.id && (!this.teacherForm.password || this.teacherForm.password !== this.teacherForm.passwordConfirm)) {
      this.showNotification('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  }

  private prepareTeacherData(): any {
    return {
      nom: this.teacherForm.nom,
      prenom: this.teacherForm.prenom,
      email: this.teacherForm.email,
      password: this.teacherForm.password,
      dateNaissance: this.formatDateForBackend(this.teacherForm.dateNaissance!),
      diplome: this.teacherForm.diplome,
      nbAnneeExperience: this.teacherForm.nbAnneeExperience || 0,
      matieresEnseignees: this.teacherForm.matieresEnseignees || [],
      status: this.teacherForm.status || 'ACTIVE'
    };
  }

  toggleTeacherStatus(id: number): void {
    const teacher = this.teachers.find(t => t.id === id);
    if (!teacher) return;

    const newStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.http.patch(`${API_URL}/enseignants/${id}/status`, { status: newStatus }).pipe(
      switchMap(() => this.loadTeachers())
    ).subscribe({
      next: (teachers) => {
        this.teachers = teachers;
        this.updateStats();
      },
      error: (err) => {
        this.handleError('changing teacher status', err);
      }
    });
  }

  deleteTeacher(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cet enseignant?')) return;
   
    this.http.delete(`${API_URL}/enseignants/${id}`).pipe(
      switchMap(() => this.loadTeachers())
    ).subscribe({
      next: (teachers) => {
        this.teachers = teachers;
        this.updateStats();
        this.showNotification('Enseignant supprimé avec succès');
      },
      error: (err) => {
        this.handleError('deleting teacher', err);
      }
    });
  }

 
 
toggleTeacherSelection(teacherId: number): void {
  if (!this.classForm.enseignantIds) {
    this.classForm.enseignantIds = [];
  }

  const index = this.classForm.enseignantIds.indexOf(teacherId);
  if (index === -1) {
    this.classForm.enseignantIds.push(teacherId);
  } else {
    this.classForm.enseignantIds.splice(index, 1);
  }
}

  deleteClass(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cette classe?')) return;
   
    this.http.delete(`${API_URL}/classes/${id}`).pipe(
      switchMap(() => this.loadClasses())
    ).subscribe({
      next: (classes) => {
        this.classes = classes;
        this.showNotification('Classe supprimée avec succès');
      },
      error: (err) => {
        this.handleError('deleting class', err);
      }
    });
  }

 

  private validateMeetingForm(): boolean {
  if (!this.meetingForm.sujet || !this.meetingForm.dateHeure || !this.meetingForm.lieu) {
    this.showNotification('Sujet, date et lieu sont obligatoires');
    return false;
  }

  if (!this.meetingForm.enseignant?.id) {
    this.showNotification('Vous devez sélectionner un enseignant');
    return false;
  }

  return true;
}
// Ajoutez cette méthode dans votre composant
formatDisplayDate(dateString: string): string {
  if (!dateString) return 'Non défini';
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
  private prepareMeetingData(): any {
    return {
      sujet: this.meetingForm.sujet,
      dateHeure: this.formatDateTimeForBackend(this.meetingForm.dateHeure!),
      lieu: this.meetingForm.lieu || 'Salle A',
      description: this.meetingForm.description || '',
      enseignantId: this.meetingForm.enseignant?.id,
      statut: this.meetingForm.statut || 'PLANNED'
    };
  }

  sendMeetingNotification(meetingId: number, customMessage?: string): Observable<void> {
    return this.http.post<void>(
      `${API_URL}/reunions/${meetingId}/send-email`,
      { customMessage }
    );
  }

  deleteMeeting(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cette réunion?')) return;
   
    this.http.delete(`${API_URL}/reunions/${id}`).pipe(
      switchMap(() => this.loadMeetings())
    ).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
        this.showNotification('Réunion supprimée avec succès');
      },
      error: (err) => {
        this.handleError('deleting meeting', err);
      }
    });
  }

  saveLeave(): void {
    if (!this.validateLeaveForm()) return;

    this.isProcessing = true;
    const leaveData = this.prepareLeaveData();

    const url = this.leaveForm.demandeurType === 'ENSEIGNANT'
      ? `${API_URL}/conges/enseignants`
      : `${API_URL}/conges/etudiants`;

    this.http.post<Conge>(url, leaveData).pipe(
      switchMap(() => this.loadLeaves())
    ).subscribe({
      next: (leaves) => {
        this.leaves = leaves;
        this.handleSaveSuccess('leave');
      },
      error: (err) => this.handleSaveError('leave', err)
    });
  }

  approveLeave(leaveId: number): void {
    this.isProcessing = true;
    this.http.put<Conge>(`${API_URL}/conges/${leaveId}/approve`, {}).pipe(
      switchMap(() => this.loadLeaves())
    ).subscribe({
      next: (leaves) => {
        this.leaves = leaves;
        this.isProcessing = false;
        this.updateStats();
        this.showNotification('Congé approuvé et notification envoyée');
      },
      error: (err) => this.handleSaveError('leave approval', err)
    });
  }

  rejectLeave(leaveId: number, reason: string): void {
    this.isProcessing = true;
    this.http.put<Conge>(`${API_URL}/conges/${leaveId}/reject`, { raison: reason }).pipe(
      switchMap(() => this.loadLeaves())
    ).subscribe({
      next: (leaves) => {
        this.leaves = leaves;
        this.isProcessing = false;
        this.updateStats();
        this.showNotification('Congé rejeté et notification envoyée');
      },
      error: (err) => this.handleSaveError('leave rejection', err)
    });
  }

  openRejectDialog(leaveId: number): void {
    const reason = prompt('Raison du rejet?');
    if (reason !== null) {
      this.rejectLeave(leaveId, reason);
    }
  }

  private validateLeaveForm(): boolean {
    if (!this.leaveForm.type || !this.leaveForm.dateDebut || !this.leaveForm.dateFin || !this.leaveForm.demandeurType) {
      this.showNotification('Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (this.leaveForm.demandeurType === 'ENSEIGNANT' && !this.leaveForm.enseignant) {
      this.showNotification('Veuillez sélectionner un enseignant');
      return false;
    }

    if (this.leaveForm.demandeurType === 'ETUDIANT' && !this.leaveForm.etudiant) {
      this.showNotification('Veuillez sélectionner un étudiant');
      return false;
    }

    return true;
  }

  private prepareLeaveData(): any {
    const baseData = {
      type: this.leaveForm.type,
      dateDebut: this.formatDateForBackend(this.leaveForm.dateDebut!),
      dateFin: this.formatDateForBackend(this.leaveForm.dateFin!),
      motif: this.leaveForm.motif || '',
      statut: 'EN_ATTENTE'
    };

    if (this.leaveForm.demandeurType === 'ENSEIGNANT') {
      return {
        ...baseData,
        enseignantId: this.leaveForm.enseignant?.id
      };
    } else {
      return {
        ...baseData,
        etudiantId: this.leaveForm.etudiant?.id
      };
    }
  }

  addAbsence(): void {
    if (!this.validateAbsenceForm()) return;

    this.isProcessing = true;
    const absenceData = this.prepareAbsenceData();

    this.http.post<Absence>(
      `${API_URL}/etudiants/${absenceData.etudiantId}/cours/${absenceData.coursId}/absences`,
      absenceData
    ).pipe(
      switchMap(() => this.loadAbsences())
    ).subscribe({
      next: (absences) => {
        this.absences = absences;
        this.handleSaveSuccess('absence');
      },
      error: (err) => this.handleSaveError('absence', err)
    });
  }

  justifyAbsence(absenceId: number): void {
    this.isProcessing = true;
    this.http.put<Absence>(
      `${API_URL}/absences/${absenceId}/justify`,
      {}
    ).pipe(
      switchMap(() => this.loadAbsences())
    ).subscribe({
      next: (absences) => {
        this.absences = absences;
        this.isProcessing = false;
        this.updateStats();
        this.showNotification('Absence justifiée');
      },
      error: (err) => this.handleSaveError('absence justification', err)
    });
  }

  private validateAbsenceForm(): boolean {
    if (!this.absenceForm.date || !this.absenceForm.etudiantId || !this.absenceForm.coursId) {
      this.showNotification('Veuillez remplir tous les champs obligatoires');
      return false;
    }
    return true;
  }

  private prepareAbsenceData(): any {
    return {
      date: this.formatDateForBackend(this.absenceForm.date!),
      justifie: this.absenceForm.justifiee || false,
      motif: this.absenceForm.motif || '',
      etudiantId: this.absenceForm.etudiantId!,
      coursId: this.absenceForm.coursId!
    };
  }

  lockSelectedStudents(): void {
    if (this.selectedStudents.length === 0) return;
   
    if (!confirm(`Voulez-vous vraiment verrouiller ${this.selectedStudents.length} compte(s) étudiant?`)) return;

    this.isProcessing = true;
    forkJoin(
      this.selectedStudents.map(id =>
        this.http.patch(`${API_URL}/etudiants/${id}/status`, { status: 'INACTIF' })
      )
    ).pipe(
      switchMap(() => this.loadStudents())
    ).subscribe({
      next: (students) => {
        this.students = students;
        this.handleBatchOperationSuccess('students');
        this.showNotification(`${this.selectedStudents.length} comptes étudiants verrouillés`);
      },
      error: (err) => this.handleSaveError('student locking', err)
    });
  }

  unlockSelectedStudents(): void {
    if (this.selectedStudents.length === 0) return;
   
    if (!confirm(`Voulez-vous vraiment déverrouiller ${this.selectedStudents.length} compte(s) étudiant?`)) return;

    this.isProcessing = true;
    forkJoin(
      this.selectedStudents.map(id =>
        this.http.patch(`${API_URL}/etudiants/${id}/status`, { status: 'ACTIF' })
      )
    ).pipe(
      switchMap(() => this.loadStudents())
    ).subscribe({
      next: (students) => {
        this.students = students;
        this.handleBatchOperationSuccess('students');
        this.showNotification(`${this.selectedStudents.length} comptes étudiants déverrouillés`);
      },
      error: (err) => this.handleSaveError('student unlocking', err)
    });
  }

  deleteSelectedStudents(): void {
    if (this.selectedStudents.length === 0) return;
   
    if (!confirm(`Voulez-vous vraiment supprimer ${this.selectedStudents.length} étudiant(s)? Cette action est irréversible.`)) return;

    this.isProcessing = true;
    forkJoin(
      this.selectedStudents.map(id =>
        this.http.delete(`${API_URL}/etudiants/${id}`)
      )
    ).pipe(
      switchMap(() => this.loadStudents())
    ).subscribe({
      next: (students) => {
        this.students = students;
        this.handleBatchOperationSuccess('students');
        this.showNotification(`${this.selectedStudents.length} étudiants supprimés`);
      },
      error: (err) => this.handleSaveError('student deletion', err)
    });
  }

  deleteSelectedTeachers(): void {
    if (this.selectedTeachers.length === 0) return;
   
    if (!confirm(`Voulez-vous vraiment supprimer ${this.selectedTeachers.length} enseignant(s)?`)) return;

    this.isProcessing = true;
    forkJoin(
      this.selectedTeachers.map(id =>
        this.http.delete(`${API_URL}/enseignants/${id}`)
      )
    ).pipe(
      switchMap(() => this.loadTeachers())
    ).subscribe({
      next: (teachers) => {
        this.teachers = teachers;
        this.selectedTeachers = [];
        this.selectAllTeachers = false;
        this.isProcessing = false;
        this.updateStats();
        this.showNotification(`${this.selectedTeachers.length} enseignants supprimés`);
      },
      error: (err) => {
        this.isProcessing = false;
        this.handleError('deleting teachers', err);
      }
    });
  }

  deleteSelectedMeetings(): void {
    if (this.selectedMeetings.length === 0) return;
   
    if (!confirm(`Voulez-vous vraiment supprimer ${this.selectedMeetings.length} réunion(s)?`)) return;

    this.isProcessing = true;
    forkJoin(
      this.selectedMeetings.map(id =>
        this.http.delete(`${API_URL}/reunions/${id}`)
      )
    ).pipe(
      switchMap(() => this.loadMeetings())
    ).subscribe({
      next: (meetings) => {
        this.meetings = meetings;
        this.selectedMeetings = [];
        this.selectAllMeetings = false;
        this.isProcessing = false;
        this.showNotification(`${this.selectedMeetings.length} réunions supprimées`);
      },
      error: (err) => {
        this.isProcessing = false;
        this.handleError('deleting meetings', err);
      }
    });
  }

  toggleSelectAll(type: 'students' | 'teachers' | 'meetings', event: any): void {
    const isChecked = event.target.checked;
    switch(type) {
      case 'students':
        this.selectAllStudents = isChecked;
        this.selectedStudents = isChecked
          ? this.students.map(s => s.id).filter((id): id is number => id !== undefined)
          : [];
        break;
      case 'teachers':
        this.selectAllTeachers = isChecked;
        this.selectedTeachers = isChecked
          ? this.teachers.map(t => t.id).filter((id): id is number => id !== undefined)
          : [];
        break;
      case 'meetings':
        this.selectAllMeetings = isChecked;
        this.selectedMeetings = isChecked
          ? this.meetings.map(m => m.id).filter((id): id is number => id !== undefined)
          : [];
        break;
    }
  }

  toggleSelection(type: 'student' | 'teacher' | 'meeting', id: number, event: any): void {
    const isChecked = event.target.checked;
    switch(type) {
      case 'student':
        if (isChecked) {
          this.selectedStudents.push(id);
        } else {
          this.selectedStudents = this.selectedStudents.filter(i => i !== id);
          this.selectAllStudents = false;
        }
        break;
      case 'teacher':
        if (isChecked) {
          this.selectedTeachers.push(id);
        } else {
          this.selectedTeachers = this.selectedTeachers.filter(i => i !== id);
          this.selectAllTeachers = false;
        }
        break;
      case 'meeting':
        if (isChecked) {
          this.selectedMeetings.push(id);
        } else {
          this.selectedMeetings = this.selectedMeetings.filter(i => i !== id);
          this.selectAllMeetings = false;
        }
        break;
    }
  }

  private initCharts(): void {
    this.createActivityChart();
    this.createClassDistributionChart();
    this.createAbsenceChart();
    this.createStatusChart();
    this.createPerformanceChart();
  }

  private createActivityChart(): void {
    const ctx = this.activityChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.destroyChart(this.activityChart);
   
    this.activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
        datasets: [{
          label: 'Activité',
          data: [65, 59, 80, 81, 56, 55],
          borderColor: '#3e95cd',
          backgroundColor: 'rgba(62, 149, 205, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: this.getChartOptions('Activité hebdomadaire')
    });
  }

  private createClassDistributionChart(): void {
    const ctx = this.classChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.destroyChart(this.classChart);
   
    const classNames = this.classes.map(c => c.nom);
    const studentCounts = this.classes.map(c =>
      this.students.filter(s => {
        if (!s.classe) return false;
        if (typeof s.classe === 'object') return s.classe.id === c.id;
        return s.classe === c.id;
      }).length
    );

    this.classChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: classNames,
        datasets: [{
          data: studentCounts,
          backgroundColor: classNames.map((_, i) => this.getChartColor(i)),
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Répartition par classe')
    });
  }

  private createAbsenceChart(): void {
    const ctx = this.absenceChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.destroyChart(this.absenceChart);
   
    const justified = this.absences.filter(a => a.justifiee).length;
    const unjustified = this.absences.filter(a => !a.justifiee).length;

    this.absenceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Justifiées', 'Non justifiées'],
        datasets: [{
          data: [justified, unjustified],
          backgroundColor: ['#36A2EB', '#FFCE56'],
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Répartition des absences')
    });
  }

  private createStatusChart(): void {
    const ctx = this.statusChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.destroyChart(this.statusChart);
   
    const activeCount = this.students.filter(s => s.status === 'ACTIF').length;
    const inactiveCount = this.students.filter(s => s.status === 'INACTIF').length;

    this.statusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Actifs', 'Inactifs'],
        datasets: [{
          data: [activeCount, inactiveCount],
          backgroundColor: ['#4BC0C0', '#FF6384'],
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Statut des comptes étudiants')
    });
  }

  private createPerformanceChart(): void {
    const ctx = this.performanceChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.destroyChart(this.performanceChart);
   
    const classNames = this.classes.map(c => c.nom);
    const averages = classNames.map(className => {
      const classStudents = this.students.filter(s => {
        if (!s.classe) return false;
        if (typeof s.classe === 'object') return s.classe.nom === className;
        const foundClass = this.classes.find(c => c.id === s.classe);
        return foundClass?.nom === className;
      });
     
      if (classStudents.length === 0) return 0;
     
      const total = classStudents.reduce((sum, student) => {
        const studentNotes = this.notes.filter(n => {
          if (typeof n.etudiant === 'number') {
            return n.etudiant === student.id;
          } else if (n.etudiant) {
            return n.etudiant.id === student.id;
          }
          return false;
        });

        if (studentNotes.length === 0) return sum;
       
        const studentAverage = studentNotes.reduce((s, n) => s + n.valeur, 0) / studentNotes.length;
        return sum + studentAverage;
      }, 0);
     
      return total / classStudents.length;
    });

    this.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: classNames,
        datasets: [{
          label: 'Moyenne par classe',
          data: averages,
          backgroundColor: classNames.map((_, i) => this.getChartColor(i)),
          borderWidth: 1
        }]
      },
      options: {
        ...this.getChartOptions('Performance des classes'),
        scales: {
          y: {
            beginAtZero: true,
            max: 20
          }
        }
      }
    });
  }

  getStudentName(studentId: number): string {
    const student = this.students.find(s => s.id === studentId);
    return student ? `${student.prenom} ${student.nom}` : 'Inconnu';
  }

  getCourseName(courseId: number): string {
    const course = this.courses.find(c => c.id === courseId);
    return course?.nom || 'Inconnu';
  }

  getStudentAverage(studentId: number): number {
    const studentNotes = this.notes.filter(n => {
      if (typeof n.etudiant === 'number') {
        return n.etudiant === studentId;
      } else if (n.etudiant) {
        return n.etudiant.id === studentId;
      }
      return false;
    });

    if (studentNotes.length === 0) return 0;
   
    return parseFloat(
      (studentNotes.reduce((sum, note) => sum + note.valeur, 0) /
      studentNotes.length
    ).toFixed(2));
  }

  getStudentAbsencesCount(studentId: number): number {
    return this.absences.filter(a => a.etudiant?.id === studentId).length;
  }

  getStudentUnjustifiedAbsencesCount(studentId: number): number {
    return this.absences.filter(a => a.etudiant?.id === studentId && !a.justifiee).length;
  }

  getClassAverage(classId: number): number {
    const classStudents = this.students.filter(s => {
      if (!s.classe) return false;
      if (typeof s.classe === 'object') return s.classe.id === classId;
      return s.classe === classId;
    });

    if (classStudents.length === 0) return 0;

    const total = classStudents.reduce((sum, student) => {
      const studentNotes = this.notes.filter(n => {
        if (typeof n.etudiant === 'number') {
          return n.etudiant === student.id;
        } else if (n.etudiant) {
          return n.etudiant.id === student.id;
        }
        return false;
      });

      if (studentNotes.length === 0) return sum;
     
      const studentAverage = studentNotes.reduce((s, n) => s + n.valeur, 0) / studentNotes.length;
      return sum + studentAverage;
    }, 0);

    return parseFloat((total / classStudents.length).toFixed(2));
  }

  getClassStudentCount(classId: number): number {
    return this.students.filter(student => {
      if (!student.classe) return false;
      if (typeof student.classe === 'object') return student.classe.id === classId;
      return student.classe === classId;
    }).length;
  }

  getClassAbsencesCount(classId: number): number {
    const classStudentIds = this.students
      .filter(student => {
        if (!student.classe) return false;
        if (typeof student.classe === 'object') return student.classe.id === classId;
        return student.classe === classId;
      })
      .map(student => student.id);
   
    return this.absences.filter(absence =>
      absence.etudiantId && classStudentIds.includes(absence.etudiantId)
    ).length;
  }

  toggleTeacherSubject(subject: string): void {
    if (!this.teacherForm.matieresEnseignees) {
      this.teacherForm.matieresEnseignees = [];
    }
   
    const index = this.teacherForm.matieresEnseignees.indexOf(subject);
    if (index === -1) {
      this.teacherForm.matieresEnseignees.push(subject);
    } else {
      this.teacherForm.matieresEnseignees.splice(index, 1);
    }
  }

  deleteNoteById(noteId: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) {
      return;
    }

    this.isProcessing = true;
    this.http.delete(`${API_URL}/notes/${noteId}`).pipe(
      switchMap(() => this.loadNotes()),
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur lors de la suppression:', error);
        this.showNotification('Échec de la suppression de la note');
        return of(null);
      }),
      finalize(() => this.isProcessing = false)
    ).subscribe({
      next: () => {
        this.showNotification('Note supprimée avec succès');
      }
    });
  }

  private destroyChart(chart?: Chart): void {
    chart?.destroy();
  }

  private getChartOptions(title: string): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16 }
        },
        legend: {
          position: 'bottom'
        }
      }
    };
  }

  private getChartColor(index: number): string {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC24A'];
    return colors[index % colors.length];
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private handleSaveSuccess(context: string): void {
    this.isProcessing = false;
    this.showModal = false;
    this.showNotification(`${context} enregistré avec succès`);
    this.cdr.detectChanges();
  }

  private handleBatchOperationSuccess(context: string): void {
    this.resetSelections(context);
    this.updateStats();
    this.isProcessing = false;
    this.cdr.detectChanges();
  }

  private resetSelections(context: string): void {
    switch(context) {
      case 'students':
        this.selectedStudents = [];
        this.selectAllStudents = false;
        break;
      case 'teachers':
        this.selectedTeachers = [];
        this.selectAllTeachers = false;
        break;
      case 'meetings':
        this.selectedMeetings = [];
        this.selectAllMeetings = false;
        break;
    }
  }

  private handleSaveError(context: string, error: any): void {
    this.handleError(`saving ${context}`, error);
    this.isProcessing = false;
    this.cdr.detectChanges();
  }

  private createEmptyStudent(): Partial<Etudiant> & { passwordConfirm?: string, classeId?: number, niveauScolaire?: string } {
    return {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      passwordConfirm: '',
      dateNaissance: '',
      status: 'ACTIF',
      classeId: undefined,
      niveauScolaire: ''
    };
  }

  private createEmptyTeacher(): Partial<Enseignant> & { passwordConfirm?: string } {
    return {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      passwordConfirm: '',
      dateNaissance: '',
      diplome: '',
      nbAnneeExperience: 0,
      matieresEnseignees: [],
      status: 'ACTIVE'
    };
  }

  private createEmptyClass(): Partial<Classe> & { enseignantIds?: number[] } {
    return {
      nom: '',
      niveau: '',
      enseignantIds: []
    };
  }

  private createEmptyMeeting(): Partial<Reunion> & { sendEmail?: boolean } {
    return {
      sujet: '',
      dateHeure: new Date().toISOString().slice(0, 16),
      lieu: 'Salle A',
      description: '',
      enseignant: null,
      statut: 'PLANNED',
      sendEmail: true
    };
  }

  private createEmptyLeave(): Partial<Conge> & { demandeurType?: 'ENSEIGNANT' | 'ETUDIANT' } {
    return {
      type: 'ANNUEL',
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      motif: '',
      enseignant: undefined,
      etudiant: undefined,
      statut: 'EN_ATTENTE',
      demandeurType: 'ENSEIGNANT'
    };
  }

  private createEmptyNote(): Partial<Note> & { etudiantId?: number, coursId?: number } {
    return {
      valeur: 0,
      date: new Date().toISOString().split('T')[0],
      etudiantId: undefined,
      coursId: undefined
    };
  }

private createEmptyAbsence(): Partial<Absence> & { etudiantId?: number, coursId?: number } {
  return {
    date: new Date().toISOString().split('T')[0],
    justifiee: false,  // Corrected property name
    motif: '',
    etudiantId: undefined,
    coursId: undefined
  };
}

  showSection(section: string): void {
    this.activeSection = section;
  }

  openModal(content: string, item?: any): void {
    this.modalContent = content;
   
    switch(content) {
      case 'add-student':
        this.studentForm = this.createEmptyStudent();
        break;
      case 'edit-student':
        if (item) {
          this.studentForm = {
            ...item,
            passwordConfirm: item.password,
            classeId: item.classe?.id,
            niveauScolaire: item.niveauScolaire
          };
        }
        break;
      case 'add-teacher':
        this.teacherForm = this.createEmptyTeacher();
        break;
      case 'edit-teacher':
        if (item) {
          this.teacherForm = {
            ...item,
            passwordConfirm: item.password
          };
        }
        break;
      case 'add-class':
        this.classForm = this.createEmptyClass();
        break;
      case 'edit-class':
        if (item) {
          this.classForm = {
            ...item,
            enseignantIds: item.enseignants?.map((t: Enseignant) => t.id) || []
          };
        }
        break;
      case 'add-meeting':
        this.meetingForm = {
          ...this.createEmptyMeeting(),
          enseignant: this.teachers.find(t => t.id === this.selectedTeachers[0]) || null
        };
        break;
      case 'edit-meeting':
        if (item) {
          this.meetingForm = {
            ...item,
            sendEmail: true
          };
        }
        break;
      case 'add-leave':
        const demandeurType = item?.type === 'teacher' ? 'ENSEIGNANT' : 'ETUDIANT';
        this.leaveForm = {
          ...this.createEmptyLeave(),
          demandeurType: demandeurType,
          enseignant: demandeurType === 'ENSEIGNANT' ?
            this.teachers.find(t => t.id === (item?.id || this.selectedTeachers[0])) : undefined,
          etudiant: demandeurType === 'ETUDIANT' ?
            this.students.find(s => s.id === (item?.id || this.selectedStudents[0])) : undefined
        };
        break;
      case 'add-note':
        this.noteForm = {
          ...this.createEmptyNote(),
          etudiant: this.students.find(s => s.id === (item?.id || this.selectedStudents[0])) || undefined,
          etudiantId: item?.id || this.selectedStudents[0],
          cours: this.courses[0] || undefined,
          coursId: this.courses[0]?.id
        };
        break;
case 'add-absence':
  this.absenceForm = {
    ...this.createEmptyAbsence(),
    etudiant: this.students.find(s => s.id === item?.id) || undefined,
    etudiantId: item?.id,
    cours: this.courses[0] ? {
      ...this.courses[0],
      matiere: this.courses[0].matiere || 'Non spécifiée'
    } : {
      id: 0,
      nom: 'Sélectionnez un cours',
      matiere: 'Non spécifiée'
    },
    coursId: this.courses[0]?.id
  };
  break;
    }

    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.modalContent = '';
  }

  refreshAll(): void {
    if (this.isRefreshing) return;
    this.loadAllData();
  }

  private updateStats(): void {
    this.stats = {
      activeStudents: this.students.filter(s => s.status === 'ACTIF').length,
      teachersCount: this.teachers.length,
      inactiveStudents: this.students.filter(s => s.status === 'INACTIF').length,
      lateStudents: this.students.filter(s => (s.moyenneGenerale || 0) < 10).length,
      studentsWithExcessiveAbsences: this.students.filter(s => (s.absences || 0) > 5).length,
      totalMeetings: this.meetings.length,
      pendingLeaves: this.leaves.filter(l => l.statut === 'EN_ATTENTE').length,
      lockedAccounts: this.students.filter(s => s.status === 'INACTIF').length
    };
  }

  saveForm(): void {
    switch(this.modalContent) {
      case 'add-student':
      case 'edit-student':
        this.saveStudent();
        break;
      case 'add-teacher':
      case 'edit-teacher':
        this.saveTeacher();
        break;
      case 'add-meeting':
      case 'edit-meeting':
        this.saveMeeting();
        break;
      case 'add-leave':
        this.saveLeave();
        break;
      case 'add-note':
        this.addNote();
        break;
      case 'add-absence':
        this.addAbsence();
        break;
      case 'add-class':
      case 'edit-class':
        this.saveClass();
        break;
    }
  }

  saveMeeting(): void {
  if (!this.validateMeetingForm()) return;

  this.isProcessing = true;
 
  // Récupérez l'ID de l'enseignant (1 dans votre exemple, ou dynamique)
  const enseignantId = this.meetingForm.enseignant?.id || 1; // À adapter selon votre logique
 
  // Préparez les données correctement formatées
  const meetingData = {
    sujet: this.meetingForm.sujet,
    dateHeure: this.formatDateTimeForBackend(this.meetingForm.dateHeure!),
    lieu: this.meetingForm.lieu,
    description: this.meetingForm.description,
    statut: this.meetingForm.statut || 'PLANNED'
  };

  // Utilisez l'URL correcte avec l'ID enseignant
  const url = `${API_URL}/enseignants/${enseignantId}/reunions`;

  this.http.post<Reunion>(url, meetingData)
    .pipe(
      finalize(() => this.isProcessing = false)
    )
    .subscribe({
      next: (savedMeeting) => {
        this.meetings.unshift(savedMeeting);
        this.showNotification('Réunion créée avec succès');
        this.closeModal();
      },
      error: (err) => {
        console.error('Erreur création réunion:', err);
        this.showNotification(`Échec de la création: ${err.message}`);
      }
    });
}
  private showNotification(message: string): void {
    alert(message);
  }
  private handleError(context: string, error: any): void {
  let errorMessage = 'Une erreur inconnue est survenue';
 
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré et accessible.';
      if (error.error instanceof ErrorEvent) {
        errorMessage += ' Erreur CORS possible - configurez le backend pour autoriser les requêtes depuis cette origine.';
      }
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur interne';
    } else {
      errorMessage = error.error?.message || error.message || `Erreur HTTP ${error.status}`;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  console.error(`[${context}]`, errorMessage, error);
  alert(errorMessage);
}
validateClassForm(): boolean {
  if (!this.classForm.nom?.trim()) {
    this.showNotification('Le nom de la classe est requis');
    return false;
  }
  if (!this.classForm.niveau?.trim()) {
    this.showNotification('Le niveau est requis');
    return false;
  }
  return true;
}
saveClass(): void {
  if (!this.validateClassForm()) return;

  this.isProcessing = true;
  const classData = {
    name: this.classForm.nom!.trim(),  // Changed from 'nom' to 'name' to match backend
    level: this.classForm.niveau!.trim(),  // Changed from 'niveau' to 'level'
    average: this.classForm.moyenneGenerale ?? 0.0,
    absenceCount: this.classForm.nombreAbsences ?? 0,
    teacherIds: this.classForm.enseignantIds || []
  };

  const isUpdate = !!this.classForm.id;
  const request = isUpdate
    ? this.http.put<Classe>(`${API_URL}/classes/${this.classForm.id}`, classData)
    : this.http.post<Classe>(`${API_URL}/classes`, classData);

  request.pipe(
    finalize(() => this.isProcessing = false)
  ).subscribe({
    next: (savedClass) => {
      const mappedClass = this.mapClassResponse(savedClass);
      if (isUpdate) {
        const index = this.classes.findIndex(c => c.id === mappedClass.id);
        if (index !== -1) {
          this.classes[index] = mappedClass;
        }
      } else {
        this.classes.unshift(mappedClass);
      }
      this.showNotification(`Classe ${isUpdate ? 'modifiée' : 'créée'} avec succès`);
      this.closeModal();
    },
    error: (error: HttpErrorResponse) => {
      this.handleClassError(error);
    }
  });
}
filterTeachers(event: Event) {
  const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
  this.filteredTeachers = this.allTeachers.filter((teacher: { name: string; }) => 
    teacher.name.toLowerCase().includes(searchTerm)
  );
}
removeTeacher(teacherId: number) {
    if (!this.classForm.enseignantIds) {
      this.classForm.enseignantIds = [];
    }
    const index = this.classForm.enseignantIds.indexOf(teacherId);
    if (index > -1) {
      this.classForm.enseignantIds.splice(index, 1);
    }
  }
  isTeacherSelected(teacherId: number): boolean {
    return (this.classForm.enseignantIds || []).includes(teacherId);
  }
private handleClassError(error: HttpErrorResponse): void {
  let errorMessage = 'Erreur lors de la sauvegarde de la classe';
 
  if (error.status === 400) {
    if (error.error?.errors) {
      errorMessage = Object.entries(error.error.errors)
        .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
        .join('\n');
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
  } else if (error.status === 409) {
    errorMessage = 'Une classe avec ce nom existe déjà';
  }

  console.error('Erreur classe:', error);
  this.showNotification(errorMessage);
}
private mapClassResponse(response: any = {}): Classe {
  console.log('Class response:', response); // Debug logging

  // Gestion des enseignants avec plusieurs alternatives de noms
  const enseignants = Array.isArray(response.enseignants) 
    ? response.enseignants 
    : Array.isArray(response.teachers) 
      ? response.teachers 
      : [];

  const enseignantsFormatted = enseignants.map((e: any = {}) => {
    if (e.nomComplet) return e.nomComplet;
    
    const prenom = e.prenom || e.firstName || '';
    const nom = e.nom || e.lastName || '';
    return `${prenom} ${nom}`.trim();
  });

  // Valeurs par défaut complètes
  return {
    id: response.id || 0, // 0 comme valeur par défaut pour un ID
    nom: response.name || response.nom || 'Classe sans nom',
    niveau: response.level || response.niveau || 'Non spécifié',
    moyenneGenerale: this.getSafeNumber(response.average, response.moyenneGenerale, 0),
    nombreAbsences: this.getSafeNumber(response.absenceCount, response.nombreAbsences, 0),
    studentCount: this.getSafeNumber(response.studentCount, 0),
    enseignants: enseignants,
    moyenneFormatted: this.getSafeNumber(response.average, response.moyenneGenerale, 0).toFixed(2),
    absencesFormatted: this.getSafeNumber(response.absenceCount, response.nombreAbsences, 0).toString(),
    enseignantsNoms: enseignantsFormatted.length > 0 
      ? enseignantsFormatted.join(', ') 
      : 'Aucun enseignant',
    moyenneClasse: this.getSafeNumber(response.average, response.moyenneGenerale, 0)
  };
}

// Méthode helper pour gérer les nombres en toute sécurité
private getSafeNumber(...values: (number | undefined | null)[]): number {
  for (const value of values) {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
  }
  return 0; // Valeur par défaut
}
}
