import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { AbsenceService } from '../../../services/absence/absence.service';
import { UserService } from '../../../services/user/user.service';
import { ServiceService } from '../../../services/service/service.service';
import { AuthService } from '../../../services/auth/auth.service';
import { Absence } from '../../../models/absence';
import { User } from '../../../models/User';
import { Service } from '../../../models/services';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import {BoxPlan} from '../../../models/box_plan';
import {BoxPlanService} from '../../../services/box_plan/box-plan.service';
import {Room} from '../../../models/services';
import {Pole} from '../../../models/services';
import {Speciality} from '../../../models/services';
import {PoleService} from '../../../services/pole/pole.service';
import {RoomService} from '../../../services/room/room.service';
import {SpecialityService} from '../../../services/speciality/speciality.service';

@Component({
  selector: 'app-cadre-home',
  imports: [
    CommonModule, 
    TableModule, 
    CardModule,
    ChartModule,
    BadgeModule,
    ToastModule,
    TagModule
  ],
  standalone: true,
  templateUrl: './cadre-home.component.html',
  styleUrls: ['./cadre-home.component.css'],
  providers: [MessageService]
})
export class CadreHomeComponent implements OnInit {
  // Tableau des absences
  /*cols: any[] = [
    { field: 'staffName', header: 'Nom employé' },
    { field: 'startDate', header: 'Date début' },
    { field: 'endDate', header: 'Date Fin' },
    { field: 'replacementName', header: 'Remplaçant' },
    { field: 'status', header: 'Statut' }
  ];*/

  cols1: any[] = [
    { field: 'matricule', header: 'Matricule' },
    { field: 'doctors', header: 'Médecins' },
    { field: 'room', header: 'Salle' },
    { field: 'hours', header: 'Heure' },
    { field: 'num_consult', header: 'N° de cs' },
    { field: 'status', header: 'Statut' }
  ];

  // Données pour les cartes
  stats = {
    todayAbsences: 0,
    monthAbsences: 0,
    todayReservation: 0,
    monthReservation: 0,
    serviceStaff: 0,
    availableReplacements: 0
  };

  // Données pour les graphiques
  chartData: any;
  chartOptions: any;

  absences: any[] = [];
  todayAbsences: any[] = [];
  allAbsences: Absence[] = [];
  todayReservations: any[] = [];
  allBoxPlans: BoxPlan[] = [];
  allUsers: User[] = [];
  allServices: Service[] = [];
  loggedInUser: User | null = null;
  services: Service[] = [];
  rooms: Room[] = [];
  poles: Pole[] = [];
  specialities: Speciality[] = [];

  constructor(
    private absenceService: AbsenceService,
    private boxPlanService: BoxPlanService,
    private userService: UserService,
    private serviceService: ServiceService,
    private authService: AuthService,
    private messageService: MessageService,
    private  poleService: PoleService,
    private  roomService: RoomService,
    private  specialityService: SpecialityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserAndData();
    this.initChart();

    this.serviceService.findAllServices().subscribe(data => {
      this.services = data.data || [];
    });

    this.poleService.findAllPoles().subscribe(data => {
      this.poles = data.data || [];
    });

    this.roomService.findAllRooms().subscribe(data => {
      this.rooms = data.data || [];
    });

    this.specialityService.findAllSpecialities().subscribe(data => {
      this.specialities = data.data || [];
    });
  }

    // Propriétés calculées pour chaque rôle
  get cadreCount(): number {
    return this.allUsers.filter(user => user.role === 'cadre').length;
  }

  get nurseCount(): number {
    return this.allUsers.filter(user => user.role === 'nurse').length;
  }

  get doctorCount(): number {
    return this.allUsers.filter(user => user.role === 'doctor').length;
  }

  loadUserAndData(): void {
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        if (user?._id) {
          this.loggedInUser = user;
          this.loadAllData();
        } else {
          this.showError('Impossible de charger les informations utilisateur');
        }
      },
      error: (err) => {
        this.showError('Échec de la connexion au serveur');
      }
    });
  }

  loadAllData(): void {
    forkJoin([
      this.absenceService.findAllAbsences(),
      this.userService.findAllUsers(),
      this.serviceService.findAllServices(),
      this.boxPlanService.findAllBoxPlans()
    ]).subscribe({
      next: ([absencesResponse, usersResponse, servicesResponse, boxPlanResponse]) => {
        this.allAbsences = absencesResponse.data || [];
        this.allUsers = usersResponse.data || [];
        this.allServices = servicesResponse.data || [];
        this.allBoxPlans = boxPlanResponse.data || [];

        this.calculateStats();
        //this.loadFilteredAbsences();
        //this.loadTodayAbsences();
        this.loadTodayReservation();
        //this.updateChart();
        this.updateReservationChart();
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.showError('Échec du chargement des données');
      }
    });
  }

  calculateStats(): void {
    if (!this.loggedInUser?.service_id) return;
  
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
  
    // Compter les absences d'aujourd'hui
    /*const todayAbsencesList = this.allAbsences.filter(absence => 
      absence.start_date <= today && 
      absence.end_date >= today &&
      absence.service_id === this.loggedInUser?.service_id
    );
    
    this.stats.todayAbsences = todayAbsencesList.length;*/

    // Compter les reservation d'aujourd'hui
    const todayReservationList = this.allBoxPlans.filter(reservation => 
      reservation.date == today 
    );
    
    this.stats.todayReservation = todayReservationList.length;
  
    // Compter les absences du mois
    /*this.stats.monthAbsences = this.allAbsences.filter(absence => {
      const absenceDate = new Date(absence.start_date);
      return absenceDate.getMonth() + 1 === currentMonth && 
             absenceDate.getFullYear() === currentYear &&
             absence.service_id === this.loggedInUser?.service_id;
    }).length;*/

    // Compter les reservations du mois
    this.stats.monthReservation = this.allBoxPlans.filter(reservation => {
      const reservationDate = new Date(reservation.date);
      return reservationDate.getMonth() + 1 === currentMonth && 
             reservationDate.getFullYear() === currentYear
    }).length;
  
    // Compter le personnel du service
    /*const serviceStaffList = this.allUsers.filter(user => 
      user.service_id === this.loggedInUser?.service_id
    );
    this.stats.serviceStaff = serviceStaffList.length;*/
  
    // Compter les personnes disponibles (qui ne sont pas en absence aujourd'hui)
    /*const absentStaffIds = todayAbsencesList.map(absence => absence.staff_id);
    this.stats.availableReplacements = serviceStaffList.filter(
      staff => !absentStaffIds.includes(staff._id)
    ).length;*/
  }

  
  calculateEndTime(startTime: string, consultationNumber: string | number, consultationTime: string | number): string {
    if (!startTime || !consultationNumber || !consultationTime) return 'N/A';
    
    try {
      // Convertir en nombres si ce sont des strings
      const numConsultations = typeof consultationNumber === 'string' 
        ? parseInt(consultationNumber, 10) 
        : consultationNumber;
        
      const numConsultationTime = typeof consultationTime === 'string'
        ? parseInt(consultationTime, 10)
        : consultationTime;
  
      // Vérifier que la conversion a réussi
      if (isNaN(numConsultations) || isNaN(numConsultationTime)) {
        return 'N/A';
      }
  
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = numConsultations * numConsultationTime;
      const endDate = new Date();
      endDate.setHours(hours, minutes + totalMinutes);
      
      return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      console.error('Error calculating end time:', e);
      return 'N/A';
    }
  }

  loadTodayReservation(): void {
    if (!this.loggedInUser?.service_id) return;

    const today = new Date().toISOString().split('T')[0];
    
    this.todayReservations = this.allBoxPlans
    .sort((a, b) => {
      // Tri décroissant par date de création (les plus récentes en premier)
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        // Tri décroissant par date de création
      return dateB.getTime() - dateA.getTime();
    })  
    .filter(reservation => 
        reservation.date == today
    )
    .map(this.mapReservationData.bind(this));
  }

  mapReservationData(box_plan: BoxPlan): any {
    const allReservations = this.allBoxPlans;
    const staffUser = this.allUsers.find(user => user.id === box_plan.staff_id);
    
    const pole = this.poles.find(s => s.id === box_plan.poll);
    const room = this.rooms.find(s => s.id === box_plan.room);
    // Récupérer les médecins associés à cette réservation
    const doctors = box_plan.doctors_id
      ? box_plan.doctors_id.map(doctorId => {
          const foundDoctor = this.allUsers.find(user => user.id === doctorId);
          return foundDoctor 
            ? `${foundDoctor.first_name} ${foundDoctor.last_name}`
            : 'Médecin inconnu';
        }).join(', ')
      : 'Aucun médecin spécifié';

    const endTime = allReservations.length > 0 
      ? this.calculateEndTime(
        allReservations[0].period, 
        allReservations[0].consultation_number, 
        allReservations[0].consultation_time
        )
      : 'N/A';

    const time = `${box_plan.period} - ${endTime}`

    return {
      id: box_plan.id,
      matricule: box_plan.matricule,
      pole: pole?.name || 'Non attribué',
      room: room?.name || 'Non attribué',
      doctors: doctors,
      time: time,
      consultation_number: box_plan.consultation_number,
      consultation_time: `${box_plan.consultation_time} mins`,
      staffName: staffUser ? `${staffUser.first_name} ${staffUser.last_name}` : 'Inconnu',
      date: this.formatDate(box_plan.date),
      status: box_plan.status
    };
  }

  /*loadFilteredAbsences(): void {
    if (!this.loggedInUser?.service_id) return;

    this.absences = this.allAbsences
      .filter(absence => absence.service_id === this.loggedInUser?.service_id)
      .map(this.mapAbsenceData.bind(this));
  }

  loadTodayAbsences(): void {
    if (!this.loggedInUser?.service_id) return;

    const today = new Date().toISOString().split('T')[0];
    
    this.todayAbsences = this.allAbsences
      .filter(absence => 
        absence.start_date <= today && 
        absence.end_date >= today &&
        absence.service_id === this.loggedInUser?.service_id
      )
      .map(this.mapAbsenceData.bind(this));
  }

  mapAbsenceData(absence: Absence): any {
    const staffUser = this.allUsers.find(user => user.id === absence.staff_id);
    const replacementUser = absence.replacement_id
      ? this.allUsers.find(user => user.id === absence.replacement_id)
      : null;

    return {
      id: absence.id,
      staffName: staffUser ? `${staffUser.first_name} ${staffUser.last_name}` : 'Inconnu',
      startDate: this.formatDate(absence.start_date),
      endDate: this.formatDate(absence.end_date),
      replacementName: replacementUser
        ? `${replacementUser.first_name} ${replacementUser.last_name}`
        : 'Non spécifié',
      status: absence.status
    };
  }*/

  initChart(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.chartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        }
      }
    };

    this.chartData = {
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
      datasets: [
        {
          label: 'Réservations par mois',
          data: Array(12).fill(0),
          backgroundColor: documentStyle.getPropertyValue('--primary-500'),
          borderColor: documentStyle.getPropertyValue('--primary-500'),
          tension: 0.4
        }
      ]
    };
  }

  updateChart(): void {
    if (!this.allAbsences.length) return;

    const monthlyCounts = Array(12).fill(0);
    const currentYear = new Date().getFullYear();

    this.allAbsences.forEach(absence => {
      const date = new Date(absence.start_date);
      if (date.getFullYear() === currentYear && 
          absence.service_id === this.loggedInUser?.service_id) {
        const month = date.getMonth();
        monthlyCounts[month]++;
      }
    });

    this.chartData = {
      ...this.chartData,
      datasets: [
        {
          ...this.chartData.datasets[0],
          data: monthlyCounts
        }
      ]
    };
  }

  updateReservationChart(): void {
    if (!this.allBoxPlans.length) return;

    const monthlyCounts = Array(12).fill(0);
    const currentYear = new Date().getFullYear();

    this.allBoxPlans.forEach(reservation => {
      const date = new Date(reservation.date);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        monthlyCounts[month]++;
      }
    });

    this.chartData = {
      ...this.chartData,
      datasets: [
        {
          ...this.chartData.datasets[0],
          data: monthlyCounts
        }
      ]
    };
  }

  getBadgeSeverity(status: string): 'success' | 'info' | 'danger' | 'secondary' | 'warn'  {
    switch (status.toLowerCase()) {
      case 'accepté par le remplaçant':
      case 'annulé':
        return 'warn';
      case 'validé par le cadre':
      case 'validé':
      case 'réservé':
        return 'success';
      case 'en cours':
        return 'info';
      case 'refusé':
      case 'refusé par le remplaçant':
      case 'refusé par le cadre':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  viewDetails(absenceId: string): void {
    this.router.navigate(['/cadre/treat-absence', absenceId]);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) 
      ? dateString 
      : date.toLocaleDateString('fr-FR');
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: message
    });
  }
}