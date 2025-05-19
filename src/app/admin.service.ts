import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8080/api/admin';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) {}

  // ==============================================
  // GESTION DES ÉTUDIANTS
  // ==============================================

  getStudents(): Observable<any> {
    return this.http.get(`${API_URL}/etudiants`);
  }

  getStudentById(id: number): Observable<any> {
    return this.http.get(`${API_URL}/etudiants/${id}`);
  }

  createStudent(studentData: any): Observable<any> {
    return this.http.post(`${API_URL}/etudiants`, studentData);
  }

  updateStudent(id: number, studentData: any): Observable<any> {
    return this.http.put(`${API_URL}/etudiants/${id}`, studentData);
  }

  deleteStudent(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/etudiants/${id}`);
  }

  lockStudentAccount(id: number): Observable<any> {
    return this.http.patch(`${API_URL}/etudiants/${id}/lock`, {});
  }

  unlockStudentAccount(id: number): Observable<any> {
    return this.http.patch(`${API_URL}/etudiants/${id}/unlock`, {});
  }

  // ==============================================
  // GESTION DES ENSEIGNANTS
  // ==============================================

  getTeachers(): Observable<any> {
    return this.http.get(`${API_URL}/enseignants`);
  }

  getTeacherById(id: number): Observable<any> {
    return this.http.get(`${API_URL}/enseignants/${id}`);
  }

  createTeacher(teacherData: any): Observable<any> {
    return this.http.post(`${API_URL}/enseignants`, teacherData);
  }

  updateTeacher(id: number, teacherData: any): Observable<any> {
    return this.http.put(`${API_URL}/enseignants/${id}`, teacherData);
  }

  deleteTeacher(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/enseignants/${id}`);
  }

  // ==============================================
  // GESTION DES RÉUNIONS
  // ==============================================

  getMeetings(): Observable<any> {
    return this.http.get(`${API_URL}/reunions`);
  }

  getMeetingById(id: number): Observable<any> {
    return this.http.get(`${API_URL}/reunions/${id}`);
  }

  createMeeting(meetingData: any): Observable<any> {
    return this.http.post(`${API_URL}/reunions`, meetingData);
  }

  updateMeeting(id: number, meetingData: any): Observable<any> {
    return this.http.put(`${API_URL}/reunions/${id}`, meetingData);
  }

  deleteMeeting(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/reunions/${id}`);
  }

  cancelMeeting(id: number): Observable<any> {
    return this.http.patch(`${API_URL}/reunions/${id}/cancel`, {});
  }

  // ==============================================
  // GESTION DES CONGÉS
  // ==============================================

  getLeaveRequests(): Observable<any> {
    return this.http.get(`${API_URL}/conges`);
  }

  getLeaveRequestById(id: number): Observable<any> {
    return this.http.get(`${API_URL}/conges/${id}`);
  }

  createLeaveRequest(leaveData: any): Observable<any> {
    return this.http.post(`${API_URL}/conges`, leaveData);
  }

  updateLeaveRequest(id: number, leaveData: any): Observable<any> {
    return this.http.put(`${API_URL}/conges/${id}`, leaveData);
  }

  deleteLeaveRequest(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/conges/${id}`);
  }

  approveLeaveRequest(id: number): Observable<any> {
    return this.http.patch(`${API_URL}/conges/${id}/approve`, {});
  }

  rejectLeaveRequest(id: number): Observable<any> {
    return this.http.patch(`${API_URL}/conges/${id}/reject`, {});
  }
}