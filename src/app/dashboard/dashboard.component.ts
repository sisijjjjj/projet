import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { forkJoin, throwError, Observable, of, timer } from 'rxjs';
import { catchError, map, tap, delayWhen } from 'rxjs/operators';

const API_URL = 'http://localhost:8080/api/admin';

// Définissez les endpoints de votre API
const API_ENDPOINTS = {
  students: '/etudiants',
  teachers: '/enseignants',
  meetings: '/reunions',
  leaves: '/conges',
  additionalData: '/additional-data',
  settings: '/settings'
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
 
}


interface Note {
  id: number;
  date: string;
  valeur: number;
  matiere: string;
  type: string;
}

interface Cours {
  id: number;
  nom: string;
  enseignantId: number;
  classe: string;
}

interface Student {
  id: number;
  version: number;
  nom: string;
  prenom: string;
  email: string;
  status: 'active' | 'locked';
  classe: string | null;
  dateNaissance: string | null;
  niveauScolaire: string | null;
  notes: Note[] | null;
  cours: Cours[] | null;
  enseignant: Enseignant | null;
  absences?: number;
}

interface Enseignant {
  id: number;
  version: number;
  nom: string;
  prenom: string;
  email: string;
  matieres: string[];
  nbAnneeExperience: number;
  nbClasse: number;
  status?: 'active' | 'inactive';
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  room: string;
  description: string;
  participants: number[];
  status?: 'planned' | 'completed' | 'cancelled';
}

interface Conge {
  id: number;
  type: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  statut: 'en_attente' | 'approuve' | 'rejete';
  enseignantId: number;
  enseignantNom?: string;
}

interface AdditionalData {
  id: number;
  title: string;
  value: number;
  date: string;
  category: string;
  description?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // UI State
  activeSection: string = 'dashboard';
  showModal: boolean = false;
  modalContent: string = '';
  isSaving: boolean = false;
  isLoading: boolean = false;

  // Statistics
  stats = {
    activeStudents: 0,
    teachersCount: 0,
    lockedAccounts: 0,
    lateStudents: 0,
    studentsWithExcessiveAbsences: 0,
    totalAdditionalData: 0
  };

  // Data Collections
  students: Student[] = [];
  teachers: Enseignant[] = [];
  meetings: Meeting[] = [];
  conges: Conge[] = [];
  additionalDataList: AdditionalData[] = [];

  // Selections
  selectedStudents: number[] = [];
  selectedTeachers: number[] = [];
  selectedData: number[] = [];
  selectAllStudents: boolean = false;
  selectAllTeachers: boolean = false;
  selectAllData: boolean = false;

  // Forms
  studentForm: Partial<Student> = this.createEmptyStudent();
  teacherForm: Partial<Enseignant> = this.createEmptyTeacher();
  meetingForm = {
    title: '',
    date: new Date().toISOString().slice(0, 16),
    description: '',
    participants: [] as number[],
    room: 'Salle A'
  };
  congeForm = {
    type: 'Annuel',
    description: '',
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    enseignantId: 0
  };
  dataForm: AdditionalData = {
    id: 0,
    title: '',
    value: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'default',
    description: ''
  };

  // Options
  typesConge = ['Annuel', 'Maladie', 'Maternité', 'Paternité', 'Formation'];
  meetingRooms = ['Salle A', 'Salle B', 'Salle C', 'Amphithéâtre'];
  categories = ['default', 'important', 'normal', 'urgent'];

  // Chart References
  @ViewChild('activityChart') activityChartRef!: ElementRef;
  @ViewChild('classChart') classChartRef!: ElementRef;
  @ViewChild('absenceChart') absenceChartRef!: ElementRef;
  @ViewChild('statusChart') statusChartRef!: ElementRef;
  @ViewChild('dataChart') dataChartRef!: ElementRef;

  // Charts
  private activityChart?: Chart;
  private classChart?: Chart;
  private absenceChart?: Chart;
  private statusChart?: Chart;
  private dataChart?: Chart;

  // Settings
  settingsForm = {
    username: 'admin',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // Cache key for teachers
  private readonly TEACHERS_CACHE_KEY = 'teachers_cache';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCharts(), 500);
  }

  // Cache methods
  private saveTeachersToCache(): void {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data: this.teachers
      };
      localStorage.setItem(this.TEACHERS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Erreur de sauvegarde du cache', e);
    }
  }

  private loadTeachersFromCache(): Enseignant[] {
    try {
      const cached = localStorage.getItem(this.TEACHERS_CACHE_KEY);
      if (!cached) return [];
      
      const parsed = JSON.parse(cached);
      // Ne retournez les données que si elles ont moins de 1 heure
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed.data;
      }
      return [];
    } catch (e) {
      console.error('Erreur de lecture du cache', e);
      return [];
    }
  }

  private fallbackToCache(): void {
    const cachedTeachers = this.loadTeachersFromCache();
    if (cachedTeachers.length > 0) {
      this.teachers = cachedTeachers;
      this.cdr.detectChanges();
    }
  }

  // Data Loading
  private loadAllData(): void {
    this.isLoading = true;
    this.isSaving = true;
    const startTime = Date.now();
    const MIN_LOADING_TIME = 500; // ms

    forkJoin({
      students: this.loadStudents(),
      teachers: this.loadTeachers(),
      meetings: this.loadMeetings(),
      conges: this.loadConges(),
      additionalData: this.loadAdditionalData()
    }).pipe(
      delayWhen(() => {
        const elapsed = Date.now() - startTime;
        return elapsed < MIN_LOADING_TIME 
          ? timer(MIN_LOADING_TIME - elapsed) 
          : of(null);
      })
    ).subscribe({
      next: () => {
        this.updateStats();
        this.initCharts();
        this.isLoading = false;
        this.isSaving = false;
        this.logDataState();
      },
      error: (err) => {
        this.handleError('Chargement initial', err);
        this.isLoading = false;
        this.isSaving = false;
      }
    });
  }

  private loadStudents(): Observable<void> {
    return this.http.get<ApiResponse<Student[]>>(`${API_URL}${API_ENDPOINTS.students}`).pipe(
      tap(response => console.log('Réponse étudiants:', response)),
      map(response => {
        if (response?.success) {
          this.students = this.mapArrayResponse(response.data, this.mapApiStudent);
        } else {
          throw new Error(response?.message || 'Format de réponse invalide');
        }
      }),
      catchError(err => {
        console.error('Erreur chargement étudiants:', err);
        return this.handleError('chargement des étudiants', err);
      })
    );
  }
  
  private loadTeachers(): Observable<void> {
    return this.http.get<any>(`${API_URL}${API_ENDPOINTS.teachers}`).pipe(
      tap(response => console.log('Réponse brute enseignants:', response)),
      map(response => {
        // Gestion des différents formats de réponse
        const teachersData = Array.isArray(response) 
          ? response 
          : (response?.data || []);
        
        this.teachers = teachersData.map((teacher: any) => this.mapApiTeacher(teacher));
        this.saveTeachersToCache();
      }),
      catchError(err => {
        console.error('Détails erreur enseignants:', err);
        this.fallbackToCache();
        return throwError(() => new Error('Échec du chargement des enseignants'));
      })
    );
  }

  private loadMeetings(): Observable<void> {
    return this.http.get<any>(`${API_URL}${API_ENDPOINTS.meetings}`).pipe(
      tap(response => console.log('Réponse réunions:', response)),
      map(response => {
        // Si réponse est un tableau direct
        if (Array.isArray(response)) {
          this.meetings = response.map(m => this.mapApiMeeting(m));
        } else if (response?.success && Array.isArray(response.data)) {
          this.meetings = response.data.map((m: any) => this.mapApiMeeting(m));
        } else {
          throw new Error('Format de réponse invalide pour réunions');
        }
      }),
      catchError(err => this.handleError('chargement des réunions', err))
    );
  }
  
  private loadAdditionalData(): Observable<void> {
    return this.http.get<any>(`${API_URL}${API_ENDPOINTS.additionalData}`).pipe(
      tap(response => console.log('Réponse données additionnelles:', response)),
      map(response => {
        if (Array.isArray(response)) {
          this.additionalDataList = response;
        } else if (response?.success && Array.isArray(response.data)) {
          this.additionalDataList = response.data;
        } else {
          throw new Error('Format de réponse invalide pour données additionnelles');
        }
      }),
      catchError(err => {
        console.error('Erreur chargement données additionnelles:', err);
        return of(void 0); // Continue sans planter
      })
    );
  }
  
  private loadConges(): Observable<void> {
    return this.http.get<any>(`${API_URL}${API_ENDPOINTS.leaves}`).pipe(
      map(response => {
        const congesData = Array.isArray(response) 
          ? response 
          : (response?.data || []);
        
        this.conges = congesData.map((conge: any) => this.mapApiConge(conge));
        this.mapTeacherNamesToConges();
        return;
      }),
      catchError(err => this.handleError('chargement des congés', err))
    );
  }

  
  

  private mapApiStudent(apiData: any): Student {
    return {
      id: apiData.id,
      version: apiData.version || 0,
      nom: apiData.nom,
      prenom: apiData.prenom,
      email: apiData.email,
      status: apiData.status || 'active',
      classe: apiData.classe || null,
      dateNaissance: apiData.dateNaissance || null,
      niveauScolaire: apiData.niveauScolaire || null,
      notes: apiData.notes ? apiData.notes.map((n: any) => ({
        id: n.id,
        date: n.date,
        valeur: n.valeur,
        matiere: n.matiere,
        type: n.type
      })) : null,
      cours: apiData.cours || null,
      enseignant: apiData.enseignant ? this.mapApiTeacher(apiData.enseignant) : null,
      absences: apiData.absences || (apiData.notes ? apiData.notes.length : 0)
    };
  }

  

  private mapApiMeeting(apiData: any): Meeting {
    return {
      id: apiData.id,
      title: apiData.title,
      date: apiData.date,
      room: apiData.room,
      description: apiData.description,
      participants: apiData.participants || [],
      status: apiData.status || 'planned'
    };
  }

  private mapApiConge(apiData: any): Conge {
    return {
      id: apiData.id,
      type: apiData.type,
      description: apiData.description,
      dateDebut: apiData.dateDebut,
      dateFin: apiData.dateFin,
      statut: apiData.statut || 'en_attente',
      enseignantId: apiData.enseignantId,
      enseignantNom: apiData.enseignantNom || ''
    };
  }

  private mapTeacherNamesToConges(): void {
    this.conges.forEach(conge => {
      if (!conge.enseignantNom) {
        const teacher = this.teachers.find(t => t.id === conge.enseignantId);
        if (teacher) {
          conge.enseignantNom = `${teacher.prenom} ${teacher.nom}`;
        }
      }
    });
  }

  // Chart Methods
  private initCharts(): void {
    this.createActivityChart();
    this.createClassDistributionChart();
    this.createAbsenceChart();
    this.createStatusChart();
    this.createDataChart();
  }

  private createActivityChart(): void {
    const ctx = this.getChartContext(this.activityChartRef);
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
    const ctx = this.getChartContext(this.classChartRef);
    if (!ctx) return;

    this.destroyChart(this.classChart);
    
    this.classChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Term'],
        datasets: [{
          data: [12, 19, 15, 20, 18, 25, 22],
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#8AC24A'
          ],
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Répartition par classe')
    });
  }

  private createAbsenceChart(): void {
    const ctx = this.getChartContext(this.absenceChartRef);
    if (!ctx) return;

    this.destroyChart(this.absenceChart);
    
    const classes = [...new Set(this.students.map(s => s.classe).filter((c): c is string => c !== null))];
    const chartLabels = classes.length > 0 ? classes : ['Aucune classe'];
    
    const absenceData = chartLabels.map(classe => {
      const studentsInClass = this.students.filter(s => s.classe === classe);
      return studentsInClass.reduce((sum, student) => sum + (student.absences || 0), 0);
    });

    this.absenceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Absences',
          data: absenceData,
          backgroundColor: chartLabels.map((_, i) => this.getChartColor(i)),
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Absences par classe')
    });
  }

  private createStatusChart(): void {
    const ctx = this.getChartContext(this.statusChartRef);
    if (!ctx) return;

    this.destroyChart(this.statusChart);
    
    const activeCount = this.students.filter(s => s.status === 'active').length;
    const lockedCount = this.students.filter(s => s.status === 'locked').length;

    this.statusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Actifs', 'Verrouillés'],
        datasets: [{
          data: [activeCount, lockedCount],
          backgroundColor: ['#4BC0C0', '#FF6384'],
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Statut des comptes')
    });
  }

  private createDataChart(): void {
    const ctx = this.getChartContext(this.dataChartRef);
    if (!ctx) return;

    this.destroyChart(this.dataChart);
    
    const categories = [...new Set(this.additionalDataList.map(d => d.category))];
    const dataByCategory = categories.map(cat => 
      this.additionalDataList.filter(d => d.category === cat).length
    );

    this.dataChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Données par catégorie',
          data: dataByCategory,
          backgroundColor: categories.map((_, i) => this.getChartColor(i)),
          borderWidth: 1
        }]
      },
      options: this.getChartOptions('Répartition des données')
    });
  }

  private destroyChart(chart?: Chart): void {
    if (chart) {
      chart.destroy();
    }
  }

  private getChartContext(ref: ElementRef): CanvasRenderingContext2D | null {
    return ref?.nativeElement?.getContext('2d') || null;
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

  // Data Management
  addData(): void {
    if (!this.validateForm(this.dataForm, ['title'])) return;

    this.isSaving = true;
    const newData: AdditionalData = {
      ...this.dataForm,
      id: this.generateNewId(this.additionalDataList)
    };

    this.http.post<AdditionalData>(`${API_URL}${API_ENDPOINTS.additionalData}`, newData).subscribe({
      next: (response) => {
        this.additionalDataList.push(response);
        this.resetForm('data');
        this.updateStats();
        this.refreshDataChart();
        this.isSaving = false;
        alert('Donnée ajoutée avec succès');
      },
      error: (err) => {
        this.handleError('ajout de donnée', err);
        this.isSaving = false;
      }
    });
  }

  updateData(): void {
    if (!this.validateForm(this.dataForm, ['title', 'id'])) return;

    this.isSaving = true;
    this.http.put<AdditionalData>(`${API_URL}${API_ENDPOINTS.additionalData}/${this.dataForm.id}`, this.dataForm).subscribe({
      next: (response) => {
        const index = this.additionalDataList.findIndex(d => d.id === response.id);
        if (index !== -1) {
          this.additionalDataList[index] = response;
          this.closeModal();
          this.updateStats();
          this.refreshDataChart();
          this.isSaving = false;
          alert('Donnée mise à jour avec succès');
        }
      },
      error: (err) => {
        this.handleError('mise à jour de donnée', err);
        this.isSaving = false;
      }
    });
  }

  deleteData(id: number): void {
    if (!confirm('Confirmer la suppression ?')) return;

    this.isSaving = true;
    this.http.delete(`${API_URL}${API_ENDPOINTS.additionalData}/${id}`).subscribe({
      next: () => {
        this.additionalDataList = this.additionalDataList.filter(d => d.id !== id);
        this.selectedData = this.selectedData.filter(d => d !== id);
        this.updateStats();
        this.refreshDataChart();
        this.isSaving = false;
        alert('Donnée supprimée avec succès');
      },
      error: (err) => {
        this.handleError('suppression de donnée', err);
        this.isSaving = false;
      }
    });
  }

  deleteSelectedData(): void {
    if (this.selectedData.length === 0) {
      alert('Sélectionnez au moins une donnée');
      return;
    }

    if (!confirm(`Confirmer la suppression de ${this.selectedData.length} donnée(s) ?`)) return;

    this.isSaving = true;
    forkJoin(
      this.selectedData.map(id => 
        this.http.delete(`${API_URL}${API_ENDPOINTS.additionalData}/${id}`)
      )
    ).subscribe({
      next: () => {
        this.additionalDataList = this.additionalDataList.filter(d => !this.selectedData.includes(d.id));
        this.selectedData = [];
        this.selectAllData = false;
        this.updateStats();
        this.refreshDataChart();
        this.isSaving = false;
        alert('Données supprimées avec succès');
      },
      error: (err) => {
        this.handleError('suppression des données', err);
        this.isSaving = false;
      }
    });
  }

  private refreshDataChart(): void {
    if (!this.dataChart) return;
    
    const categories = [...new Set(this.additionalDataList.map(d => d.category))];
    const dataByCategory = categories.map(cat => 
      this.additionalDataList.filter(d => d.category === cat).length
    );

    this.dataChart.data.labels = categories;
    this.dataChart.data.datasets[0].data = dataByCategory;
    this.dataChart.update();
  }

  // Student Management
  saveStudent(): void {
    if (!this.validateForm(this.studentForm, ['nom', 'prenom', 'email'])) return;

    this.isSaving = true;
    const studentData = {
      ...this.studentForm,
      notes: null,
      cours: null,
      enseignant: null
    };

    const request = this.studentForm.id
      ? this.http.put<Student>(`${API_URL}${API_ENDPOINTS.students}/${this.studentForm.id}`, studentData)
      : this.http.post<Student>(`${API_URL}${API_ENDPOINTS.students}`, studentData);

    request.subscribe({
      next: (response) => {
        const savedStudent = this.mapApiStudent(response);
        if (this.studentForm.id) {
          const index = this.students.findIndex(s => s.id === savedStudent.id);
          if (index !== -1) {
            this.students[index] = savedStudent;
            alert('Étudiant mis à jour avec succès');
          }
        } else {
          this.students.push(savedStudent);
          alert('Étudiant créé avec succès');
        }
        this.closeModal();
        this.updateStats();
        this.isSaving = false;
      },
      error: (err) => {
        this.handleError('sauvegarde étudiant', err);
        this.isSaving = false;
      }
    });
  }

  // Teacher Management
  private mapArrayResponse<T>(response: any, mapper: (item: any) => T): T[] {
    // Si la réponse est déjà un tableau
    if (Array.isArray(response)) {
      return response.map(mapper);
    }
    
    // Si la réponse est un objet avec une propriété data qui est un tableau
    if (response?.data && Array.isArray(response.data)) {
      return response.data.map(mapper);
    }
    
    // Si la réponse est un objet avec une propriété data qui est un objet simple
    if (response?.data && typeof response.data === 'object') {
      return [mapper(response.data)];
    }
    
    // Si la réponse est un objet simple (sans propriété data)
    if (response && typeof response === 'object') {
      return [mapper(response)];
    }
    
    // Cas par défaut
    return [];
  }
  deleteTeacher(id: number): void {
    if (confirm('Are you sure you want to delete this teacher?')) {
      this.http.delete(`${API_URL}${API_ENDPOINTS.teachers}/${id}`).subscribe({
        next: () => {
          this.teachers = this.teachers.filter(t => t.id !== id);
          this.saveTeachersToCache();
          this.updateStats();
        },
        error: (err) => this.handleError('deleting teacher', err)
      });
    }
  }

  deleteSelectedTeachers(): void {
    if (this.selectedTeachers.length === 0) return;
    if (!confirm(`Delete ${this.selectedTeachers.length} selected teachers?`)) return;

    forkJoin(
      this.selectedTeachers.map(id => 
        this.http.delete(`${API_URL}${API_ENDPOINTS.teachers}/${id}`)
      )
    ).subscribe({
      next: () => {
        this.teachers = this.teachers.filter(t => !this.selectedTeachers.includes(t.id));
        this.saveTeachersToCache();
        this.selectedTeachers = [];
        this.updateStats();
      },
      error: (err) => this.handleError('deleting teachers', err)
    });
  }

  // Meeting Management
  saveMeeting(): void {
    if (!this.validateForm(this.meetingForm, ['title', 'date', 'room', 'participants'])) return;

    this.isSaving = true;
    const meetingToSend = {
      ...this.meetingForm,
      date: new Date(this.meetingForm.date).toISOString(),
      notifyTeachers: true
    };

    this.http.post<Meeting>(`${API_URL}${API_ENDPOINTS.meetings}`, meetingToSend).subscribe({
      next: (response) => {
        this.meetings.push(this.mapApiMeeting(response));
        this.closeModal();
        this.isSaving = false;
        alert('Réunion planifiée');
      },
      error: (err) => {
        this.handleError('planification réunion', err);
        this.isSaving = false;
      }
    });
  }

  // Leave Management
  saveLeave(): void {
    if (!this.validateForm(this.congeForm, ['type', 'dateDebut', 'dateFin', 'enseignantId'])) return;

    this.isSaving = true;
    this.http.post<Conge>(`${API_URL}${API_ENDPOINTS.leaves}/${this.congeForm.enseignantId}`, this.congeForm).subscribe({
      next: (response) => {
        const savedLeave = this.mapApiConge(response);
        const teacher = this.teachers.find(t => t.id === savedLeave.enseignantId);
        if (teacher) {
          savedLeave.enseignantNom = `${teacher.prenom} ${teacher.nom}`;
        }
        this.conges.push(savedLeave);
        this.closeModal();
        this.isSaving = false;
        alert('Congé enregistré');
      },
      error: (err) => {
        this.handleError('enregistrement congé', err);
        this.isSaving = false;
      }
    });
  }

  // Settings Management
  saveSettings(): void {
    if (!this.settingsForm.email) {
      alert('Email requis');
      return;
    }

    if (this.settingsForm.newPassword !== this.settingsForm.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    this.isSaving = true;
    this.http.post(`${API_URL}${API_ENDPOINTS.settings}`, {
      email: this.settingsForm.email,
      currentPassword: this.settingsForm.currentPassword,
      newPassword: this.settingsForm.newPassword
    }).subscribe({
      next: () => {
        this.resetSettingsForm();
        this.isSaving = false;
        alert('Paramètres sauvegardés');
      },
      error: (err) => {
        this.handleError('sauvegarde paramètres', err);
        this.isSaving = false;
      }
    });
  }

  // Utility Methods
  private validateForm(form: any, requiredFields: string[]): boolean {
    for (const field of requiredFields) {
      if (!form[field]) {
        alert(`Le champ ${field} est requis`);
        return false;
      }
    }
    return true;
  }

  private generateNewId(items: {id: number}[]): number {
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }

  getChartColor(index: number): string {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8AC24A'];
    return colors[index % colors.length];
  }

  private updateStats(): void {
    this.stats = {
      activeStudents: this.students.filter(s => s.status === 'active').length,
      teachersCount: this.teachers.length,
      lockedAccounts: this.students.filter(s => s.status === 'locked').length,
      lateStudents: this.students.filter(s => (s.absences || 0) > 0).length,
      studentsWithExcessiveAbsences: this.students.filter(s => (s.absences || 0) >= 3).length,
      totalAdditionalData: this.additionalDataList.length
    };
  }

  // UI Methods
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
        this.studentForm = {...item};
        break;
      case 'add-teacher':
        this.teacherForm = this.createEmptyTeacher();
        break;
      case 'edit-teacher':
        this.teacherForm = {...item};
        break;
      case 'meeting':
        this.meetingForm = {
          title: '',
          date: new Date().toISOString().slice(0, 16),
          description: '',
          participants: [...this.selectedTeachers],
          room: 'Salle A'
        };
        break;
      case 'conge':
        this.congeForm = {
          type: 'Annuel',
          description: '',
          dateDebut: new Date().toISOString().slice(0, 10),
          dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          enseignantId: this.selectedTeachers[0]
        };
        break;
      case 'add-data':
        this.dataForm = {
          id: 0,
          title: '',
          value: 0,
          date: new Date().toISOString().split('T')[0],
          category: 'default',
          description: ''
        };
        break;
      case 'edit-data':
        this.dataForm = {...item};
        break;
    }

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalContent = '';
    this.isSaving = false;
  }

  private resetForm(formType: string): void {
    switch(formType) {
      case 'student':
        this.studentForm = this.createEmptyStudent();
        break;
      case 'teacher':
        this.teacherForm = this.createEmptyTeacher();
        break;
      case 'meeting':
        this.meetingForm = {
          title: '',
          date: new Date().toISOString().slice(0, 16),
          description: '',
          participants: [],
          room: 'Salle A'
        };
        break;
      case 'conge':
        this.congeForm = {
          type: 'Annuel',
          description: '',
          dateDebut: new Date().toISOString().slice(0, 10),
          dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          enseignantId: 0
        };
        break;
      case 'data':
        this.dataForm = {
          id: 0,
          title: '',
          value: 0,
          date: new Date().toISOString().split('T')[0],
          category: 'default',
          description: ''
        };
        break;
    }
  }

  resetSettingsForm(): void {
    this.settingsForm = {
      username: 'admin',
      email: this.settingsForm.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  refreshAll(): void {
    this.loadAllData();
    alert('Données rafraîchies');
  }

  // Selection Methods
  toggleSelectAll(type: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;

    switch(type) {
      case 'students':
        this.selectAllStudents = checked;
        this.selectedStudents = checked ? this.students.map(s => s.id) : [];
        break;
      case 'teachers':
        this.selectAllTeachers = checked;
        this.selectedTeachers = checked ? this.teachers.map(t => t.id) : [];
        break;
      case 'data':
        this.selectAllData = checked;
        this.selectedData = checked ? this.additionalDataList.map(d => d.id) : [];
        break;
    }
  }

  toggleSelection(type: string, id: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;

    switch(type) {
      case 'student':
        if (checked) {
          this.selectedStudents.push(id);
        } else {
          this.selectedStudents = this.selectedStudents.filter(s => s !== id);
        }
        this.selectAllStudents = this.selectedStudents.length === this.students.length;
        break;
      case 'teacher':
        if (checked) {
          this.selectedTeachers.push(id);
        } else {
          this.selectedTeachers = this.selectedTeachers.filter(t => t !== id);
        }
        this.selectAllTeachers = this.selectedTeachers.length === this.teachers.length;
        break;
      case 'data':
        if (checked) {
          this.selectedData.push(id);
        } else {
          this.selectedData = this.selectedData.filter(d => d !== id);
        }
        this.selectAllData = this.selectedData.length === this.additionalDataList.length;
        break;
    }
  }

  // Formatting Methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatDateTime(dateTimeString: string): string {
    return new Date(dateTimeString).toLocaleString('fr-FR');
  }

  getTeacherName(id: number): string {
    const teacher = this.teachers.find(t => t.id === id);
    return teacher ? `${teacher.prenom} ${teacher.nom}` : 'Inconnu';
  }

  // Error Handling
  private handleError(context: string, error: any): Observable<never> {
    let errorMessage = 'Erreur inconnue';
    
    if (error instanceof HttpErrorResponse) {
      try {
        const errorBody = error.error;
        if (typeof errorBody === 'object' && errorBody.message) {
          errorMessage = errorBody.message;
        } else if (typeof errorBody === 'string') {
          errorMessage = errorBody;
        } else {
          errorMessage = `${error.status} ${error.statusText}`;
        }
      } catch (e) {
        errorMessage = error.message || `${error.status} ${error.statusText}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    console.error(`[${context}]`, errorMessage, error);
    alert(`Erreur ${context}: ${errorMessage}`);
    return throwError(() => new Error(errorMessage));
  }

  // Debug Methods
  private logDataState(): void {
    console.group('État des données');
    console.log('Étudiants:', this.students);
    console.log('Enseignants:', this.teachers);
    console.log('Réunions:', this.meetings);
    console.log('Congés:', this.conges);
    console.log('Données additionnelles:', this.additionalDataList);
    console.groupEnd();
  }

  private createEmptyStudent(): Partial<Student> {
    return {
      id: 0,
      version: 0,
      status: 'active',
      notes: null,
      cours: null,
      enseignant: null
    };
  }

  private createEmptyTeacher(): Partial<Enseignant> {
    return {
      id: 0,
      version: 0,
      matieres: [],
      nbAnneeExperience: 0,
      nbClasse: 0
    };
  }

  // Student methods
  toggleStudentLockStatus(id: number): void {
    const student = this.students.find(s => s.id === id);
    if (student) {
      student.status = student.status === 'active' ? 'locked' : 'active';
      this.saveStudent();
    }
  }

  deleteStudent(id: number): void {
    if (confirm('Are you sure you want to delete this student?')) {
      this.http.delete(`${API_URL}${API_ENDPOINTS.students}/${id}`).subscribe({
        next: () => {
          this.students = this.students.filter(s => s.id !== id);
          this.updateStats();
        },
        error: (err) => this.handleError('deleting student', err)
      });
    }
  }

  unlockSelectedStudents(): void {
    this.updateSelectedStudentsStatus('active');
  }

  lockSelectedStudents(): void {
    this.updateSelectedStudentsStatus('locked');
  }

  private updateSelectedStudentsStatus(status: 'active' | 'locked'): void {
    this.selectedStudents.forEach(id => {
      const student = this.students.find(s => s.id === id);
      if (student) {
        student.status = status;
      }
    });
  }

  deleteSelectedStudents(): void {
    if (this.selectedStudents.length === 0) return;
    if (!confirm(`Delete ${this.selectedStudents.length} selected students?`)) return;

    forkJoin(
      this.selectedStudents.map(id => 
        this.http.delete(`${API_URL}${API_ENDPOINTS.students}/${id}`)
      )
    ).subscribe({
      next: () => {
        this.students = this.students.filter(s => !this.selectedStudents.includes(s.id));
        this.selectedStudents = [];
        this.updateStats();
      },
      error: (err) => this.handleError('deleting students', err)
    });
  }

  // Meeting methods
  removeMeetingParticipant(teacherId: number): void {
    this.meetingForm.participants = this.meetingForm.participants.filter(id => id !== teacherId);
  }

  confirmMeeting(): void {
    this.saveMeeting();
  }

  // Conge methods
  confirmConge(): void {
    this.saveLeave();
  }

  // Data methods
  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'default': '#6c757d',
      'important': '#dc3545',
      'normal': '#28a745', 
      'urgent': '#ffc107'
    };
    return colors[category] || colors['default'];
  }

  // Other methods
  checkAbsencesAndSendAlerts(): void {
    const studentsWithExcessiveAbsences = this.students.filter(s => (s.absences || 0) >= 3);
    if (studentsWithExcessiveAbsences.length === 0) {
      alert('No students with excessive absences found');
      return;
    }
    
    this.http.post(`${API_URL}/admin/send-absence-alerts`, {
      studentIds: studentsWithExcessiveAbsences.map(s => s.id)
    }).subscribe({
      next: () => alert('Absence alerts sent successfully'),
      error: (err) => this.handleError('sending absence alerts', err)
    });
  }
  addStudent(student: Omit<Student, 'id'>): Observable<Student> {
    return this.http.post<ApiResponse<Student>>(`${API_URL}/students`, student).pipe(
      map(response => {
        if (response.success && response.data) {
          this.students = [...this.students, response.data];
          return response.data;
        }
        throw new Error(response.message || 'Erreur inconnue');
      })
    );
  }
  refreshChartData() {
    console.log('Refreshing chart data...');
    this.initCharts();
  }
  saveTeacher(): void {
    if (!this.validateForm(this.teacherForm, ['nom', 'prenom', 'email'])) return;
  
    this.isSaving = true;
    const request = this.teacherForm.id
      ? this.http.put<any>(`${API_URL}${API_ENDPOINTS.teachers}/${this.teacherForm.id}`, this.teacherForm)
      : this.http.post<any>(`${API_URL}${API_ENDPOINTS.teachers}`, this.teacherForm);
  
    request.subscribe({
      next: (response) => {
        // Gestion des différents formats de réponse
        const responseData = response.data || response;
        const savedTeacher = this.mapApiTeacher(responseData);
        
        if (this.teacherForm.id) {
          const index = this.teachers.findIndex(t => t.id === savedTeacher.id);
          if (index !== -1) {
            this.teachers[index] = savedTeacher;
          }
        } else {
          this.teachers.push(savedTeacher);
        }
  
        this.saveTeachersToCache();
        this.updateStats();
        this.cdr.detectChanges();
        this.closeModal();
        this.isSaving = false;
        alert(this.teacherForm.id ? 'Enseignant mis à jour' : 'Enseignant créé');
      },
      error: (err) => {
        this.handleError('sauvegarde enseignant', err);
        this.isSaving = false;
      }
    });
  }
  private mapApiTeacher(apiData: any): Enseignant {
    console.log('Données reçues pour enseignant:', apiData); // <-- Ajoutez cette ligne
    
    return {
      id: apiData.id,
      version: apiData.version || 0,
      nom: apiData.nom,
      prenom: apiData.prenom,
      email: apiData.email,
      matieres: apiData.matieres || [],
      nbAnneeExperience: apiData.nbAnneeExperience || 0,
      nbClasse: apiData.nbClasse || 0,
      status: apiData.status || 'active'
    };
  }
} 