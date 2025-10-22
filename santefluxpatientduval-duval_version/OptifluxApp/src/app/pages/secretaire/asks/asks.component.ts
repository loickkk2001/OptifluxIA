import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';
import { AbsenceService } from '../../../services/absence/absence.service';
import { UserService } from '../../../services/user/user.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { ServiceService } from '../../../services/service/service.service'; // Ajouté
import { Absence } from '../../../models/absence';
import { User } from '../../../models/User';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../services/auth/auth.service';
import { BadgeModule } from 'primeng/badge';
import { Service, Pole, Room } from '../../../models/services';
import { BoxPlan } from '../../../models/box_plan';
import { BoxPlanService } from '../../../services/box_plan/box-plan.service';
import { PoleService } from '../../../services/pole/pole.service';
import { RoomService } from '../../../services/room/room.service';
import { ButtonModule } from 'primeng/button';
import { map, switchMap } from 'rxjs/operators';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-asks',
  imports: [TableModule, CommonModule, TabViewModule, ToastModule, BadgeModule, ButtonModule, DropdownModule, FormsModule],
  providers: [MessageService],
  standalone: true,
  templateUrl: './asks.component.html',
  styleUrls: ['./asks.component.css']
})
export class AsksComponent implements OnInit {
  cols: string[] = [
    'Matricule',
    'Demandeur',
    'Date début',
    'Date fin',
    'Heure',
    'Service',
    'Actions'
  ];

  cols1: string[] = [
    'Matricule',
    'Demandeur',
    'Date début',
    'Date fin',
    'Heure',
    'Service',
    'Status'
  ];

  cols2: string[] = [
    'Matricule',
    'Nom remplaçant',
    'Date demande',
    'Date début',
    'Date fin',
    'Service',
    'Status'
  ];

  cols3: string[] = [
    'Matricule',
    'Médecins',
    'Pôle',
    'Salle',
    'Date',
    'Heure',
    'N° de cs',
    'N° temps/cs',
    'Status',
    'Action'
  ];

  cols4: string[] = [
    'Matricule',
    'Médecins',
    'Pôle',
    'Salle',
    'Date',
    'Heure',
    'N° de cs',
    'N° temps/cs',
    'Status'
  ];

  requests: any[] = [];
  requests2: any[] = [];
  requests3: any[] = [];
  requests4: any[] = [];
  requests5: any[] = [];
  loggedInUserId: string | null = null;
  allAbsences: Absence[] = [];
  allPoles: Pole[] = [];
  allRooms: Room[] = [];
  allBoxPlan: BoxPlan[] = [];
  allUsers: User[] = [];
  allServices: Service[] = []; // Ajouté pour stocker les services

  // Ajoutez ces variables à votre classe
  filteredRequests5: any[] = [];
  filteredRequests4: any[] = [];
  searchTerm: string = '';
  selectedStatus: string = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  // Ajoutez cette propriété
  statusOptions = [
    { label: 'En cours', value: 'En cours' },
    { label: 'Réservé', value: 'Réservé' },
    { label: 'Annulé', value: 'Annulé' },
    { label: 'Refusé', value: 'Refusé' },
    { label: 'Plus disponible', value: 'Plus disponible' }
  ];

  constructor(
    private absenceService: AbsenceService,
    private userService: UserService,
    private poleService: PoleService, 
    private boxPlanService: BoxPlanService,
    private roomService: RoomService,
    private serviceService: ServiceService, // Ajouté
    private authService: AuthService,
    private notificationService: NotificationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUserAndAbsences();
  }

  loadUserAndAbsences(): void {
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        if (user?._id) {
          this.loggedInUserId = user._id;
          this.loadAllData();
        } else {
          this.loggedInUserId = null;
          this.showError('Impossible de charger les informations utilisateur');
        }
      },
      error: (err) => {
        this.loggedInUserId = null;
        this.showError('Échec de la connexion au serveur');
      }
    });
  }

  loadAllData(): void {
    forkJoin([
      this.absenceService.findAllAbsences(),
      this.userService.findAllUsers(),
      this.serviceService.findAllServices(), // Chargement des services
      this.poleService.findAllPoles(),
      this.roomService.findAllRooms(),
      this.boxPlanService.findAllBoxPlans(),
    ]).subscribe({
      next: ([absencesResponse, usersResponse, servicesResponse, poleResponse, roomResponse, boxPlanResponse ]) => {
        this.allAbsences = absencesResponse.data || [];
        this.allUsers = usersResponse.data || [];
        this.allServices = servicesResponse.data || [];
        this.allBoxPlan = boxPlanResponse.data || [];
        this.allRooms = roomResponse.data || [];
        this.allPoles = poleResponse.data || [];
        
        // Mettre à jour les statuts des réservations périmées
        this.updateExpiredReservations();

        // Démarrer le monitoring des notifications
        this.notificationService.startMonitoringReservations(this.allBoxPlan);

        this.loadReceivedRequests();
        this.loadSentRequests();
        this.loadSentRequests2();
        this.loadAllReservationEncours();
        this.loadAllReservationBox();
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.showError('Échec du chargement des données');
      }
    });
  }

  /*private updateExpiredReservations(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filtrer et s'assurer que l'ID est bien défini
    const expiredReservations = this.allBoxPlan.filter(boxPlan => {
        try {
            if (!boxPlan.id) {
                console.error('Reservation sans ID:', boxPlan);
                return false;
            }
            
            const reservationDate = new Date(boxPlan.date);
            reservationDate.setHours(0, 0, 0, 0);
            return reservationDate < today && boxPlan.status === 'Réservé';
        } catch (e) {
            console.error('Erreur de date:', boxPlan.date, e);
            return false;
        }
    });

    // Mise à jour en batch si plusieurs réservations à mettre à jour
    if (expiredReservations.length > 0) {
        forkJoin(
            expiredReservations.map(boxPlan => {
                if (!boxPlan.id) {
                    throw new Error('Tentative de mise à jour sans ID');
                }
                return this.boxPlanService.updateBoxPlanStatus(boxPlan.id, 'Plus disponible');
            })
        ).subscribe({
            next: () => {
                // Mettre à jour localement après confirmation serveur
                expiredReservations.forEach(boxPlan => {
                    boxPlan.status = 'Plus disponible';
                });
                console.log(`${expiredReservations.length} réservations mises à jour`);
            },
            error: (err) => {
                console.error('Erreur lors de la mise à jour des statuts:', err);
            }
        });
    }
  }*/

  private updateExpiredReservations(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiredReservations = this.allBoxPlan.filter(boxPlan => {
        try {
            if (!boxPlan.id) {
                console.error('Reservation sans ID:', boxPlan);
                return false;
            }
            
            const reservationDate = new Date(boxPlan.date);
            reservationDate.setHours(0, 0, 0, 0);
            return reservationDate < today && (boxPlan.status === 'Réservé' || boxPlan.status === 'En cours');
        } catch (e) {
            console.error('Erreur de date:', boxPlan.date, e);
            return false;
        }
    });

    if (expiredReservations.length > 0) {
        forkJoin(
            expiredReservations.map(boxPlan => {
                if (!boxPlan.id) {
                    throw new Error('Tentative de mise à jour sans ID');
                }
                
                // Mettre à jour le statut de la réservation
                const updateStatus$ = this.boxPlanService.updateBoxPlanStatus(
                    boxPlan.id, 
                    'Plus disponible'
                );
                
                // Mettre à jour le statut de la salle
                const updateRoom$ = this.roomService.updateRoomStatus(
                    boxPlan.room, 
                    'Disponible'
                );
                
                // Exécuter les deux opérations en parallèle
                return forkJoin([updateStatus$, updateRoom$]);
            })
        ).subscribe({
            next: () => {
                expiredReservations.forEach(boxPlan => {
                    boxPlan.status = 'Plus disponible';
                });
                console.log(`${expiredReservations.length} réservations mises à jour`);
                this.showSuccess(`${expiredReservations.length} réservations périmées marquées comme terminées`);
            },
            error: (err) => {
                console.error('Erreur lors de la mise à jour des statuts:', err);
                this.showError('Erreur lors de la mise à jour des réservations périmées');
            }
        });
    }
  }

  loadReceivedRequests(): void {
    if (!this.loggedInUserId) return;
    
    const receivedAbsences = this.allAbsences.filter(
      absence => absence.replacement_id === this.loggedInUserId
    );

    this.requests = receivedAbsences.map(absence => {
      const staffUser = this.allUsers.find(user => user.id === absence.staff_id);
      const service = this.allServices.find(s => s.id === absence.service_id);
      
      return {
        id: absence.id,
        nom: staffUser ? `${staffUser.first_name} ${staffUser.last_name}` : 'Inconnu',
        dateDebut: this.formatDate(absence.start_date),
        dateFin: this.formatDate(absence.end_date),
        heure: `${absence.start_hour}H - ${absence.end_hour}H`,
        service: service?.name || 'Non attribué',
        status: absence.status,
        matricule: absence.matricule,
        replacementId: absence.replacement_id || 'Non attribué',
      };
    });

    /*if (this.requests.length === 0) {
      this.showInfo('Aucune demande reçue');
    }*/
  }

  loadSentRequests(): void {
    if (!this.loggedInUserId) return;
    
    const sentAbsences = this.allAbsences.filter(
      absence => absence.staff_id === this.loggedInUserId && ['En cours', 'Accepté par le remplaçant', 'Refusé par le remplaçant'].includes(absence.status)
    );

    this.requests2 = sentAbsences.map(absence => {
      const replacementUser = absence.replacement_id 
        ? this.allUsers.find(user => user.id === absence.replacement_id)
        : null;
      const service = this.allServices.find(s => s.id === absence.service_id);
      
      return {
        id: absence.id,
        nom: replacementUser ? `${replacementUser.first_name} ${replacementUser.last_name}` : 'Non spécifié',
        dateDemande: this.formatDate(absence.start_date),
        dateDebut: this.formatDate(absence.start_date),
        dateFin: this.formatDate(absence.end_date),
        service: service?.name || 'Non attribué',
        status: absence.status,
        matricule: absence.matricule,
        replacementId: absence.replacement_id || 'Non attribué',
      };
    });

    /*if (this.requests2.length === 0) {
      this.showInfo('Aucune demande envoyée');
    }*/
  }

  loadSentRequests2(): void {
    if (!this.loggedInUserId) return;
    
    const sentAbsences = this.allAbsences.filter(
      absence => absence.staff_id === this.loggedInUserId && ['Validé par le cadre', 'Refusé par le cadre'].includes(absence.status)
    );

    this.requests3 = sentAbsences.map(absence => {
      const replacementUser = absence.replacement_id 
        ? this.allUsers.find(user => user.id === absence.replacement_id)
        : null;
      const service = this.allServices.find(s => s.id === absence.service_id);
      
      return {
        id: absence.id,
        nom: replacementUser ? `${replacementUser.first_name} ${replacementUser.last_name}` : 'Non spécifié',
        dateDemande: this.formatDate(absence.start_date),
        dateDebut: this.formatDate(absence.start_date),
        dateFin: this.formatDate(absence.end_date),
        heure: `${absence.start_hour}H - ${absence.end_hour}H`,
        service: service?.name || 'Non attribué',
        status: absence.status,
        matricule: absence.matricule,
        replacementId: absence.replacement_id || 'Non attribué',
      };
    });

    /*if (this.requests2.length === 0) {
      this.showInfo('Aucune demande envoyée');
    }*/
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
  }
  
  isActiveTab(index: number): boolean {
    // Implémentez cette méthode pour déterminer quel onglet est actif
    // Cela dépend de votre implémentation d'onglets
    return true; // À adapter
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    
    // Filtrage pour les réservations en cours (requests5)
    this.filteredRequests5 = this.requests5.filter(request => 
      (!this.selectedStatus || request.status === this.selectedStatus) &&
      (term === '' || 
      request.matricule.toLowerCase().includes(term) ||
      request.doctors.toLowerCase().includes(term) ||
      request.pole.toLowerCase().includes(term) ||
      request.room.toLowerCase().includes(term))
    );

    // Filtrage pour l'historique (requests4)
    this.filteredRequests4 = this.requests4.filter(request => 
      (!this.selectedStatus || request.status === this.selectedStatus) &&
      (term === '' || 
      request.matricule.toLowerCase().includes(term) ||
      request.doctors.toLowerCase().includes(term) ||
      request.pole.toLowerCase().includes(term) ||
      request.room.toLowerCase().includes(term))
    );

    this.totalRecords = this.isActiveTab(0) ? this.filteredRequests5.length : this.filteredRequests4.length;
    this.first = 0;
  }

  loadAllReservationBox(): void {
    if (!this.loggedInUserId) return;
    
    const allReservations = this.allBoxPlan.filter(
      //box_plan => box_plan.staff_id === this.loggedInUserId
      box_plan => box_plan.staff_id === this.loggedInUserId && ['Annulé', 'Plus disponible', 'Refusé'].includes(box_plan.status)
    )
    .sort((a, b) => {
      // Gestion des dates undefined avec une valeur par défaut (par exemple, new Date(0))
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      // Tri décroissant par date de création
      return dateB.getTime() - dateA.getTime();
    });

    this.requests4 = allReservations.map(box_plan => {
      const pole = this.allPoles.find(s => s.id === box_plan.poll);
      const room = this.allRooms.find(s => s.id === box_plan.room);

      // Récupérer les médecins associés à cette réservation
      const doctors = box_plan.doctors_id
        ? box_plan.doctors_id.map(doctorId => {
            const foundDoctor = this.allUsers.find(user => user.id === doctorId);
            return foundDoctor 
              ? `${foundDoctor.first_name} ${foundDoctor.last_name}`
              : 'Médecin inconnu';
          }).join(', ')
        : 'Aucun médecin spécifié';
      
      return {
        id: box_plan.id,
        matricule: box_plan.matricule,
        date: this.formatDate(box_plan.date),
        period: this.formatTime(box_plan.period), // Changé de formatDate à formatTime pour l'heure
        pole: pole?.name || 'Non attribué',
        room: room?.name || 'Non attribué',
        doctors: doctors, // Nouvelle propriété pour afficher les médecins
        consultation_number: box_plan.consultation_number,
        consultation_time: `${box_plan.consultation_time} mins`,
        comment: box_plan.comment,
        status: box_plan.status
      };
    });

    this.filteredRequests4 = [...this.requests4];
    this.totalRecords = this.filteredRequests4.length;

    if (this.requests4.length === 0) {
      this.showInfo('Aucune reservation effectuée');
    }
  }

  loadAllReservationEncours(): void {
    if (!this.loggedInUserId) return;
    
    const allReservations = this.allBoxPlan.filter(
      //box_plan => box_plan.staff_id === this.loggedInUserId
      box_plan => box_plan.staff_id === this.loggedInUserId && ['En cours', 'Réservé'].includes(box_plan.status)
    )
    .sort((a, b) => {
      // Gestion des dates undefined avec une valeur par défaut (par exemple, new Date(0))
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      // Tri décroissant par date de création
      return dateB.getTime() - dateA.getTime();
    });

    this.requests5 = allReservations.map(box_plan => {
      const pole = this.allPoles.find(s => s.id === box_plan.poll);
      const room = this.allRooms.find(s => s.id === box_plan.room);

      // Récupérer les médecins associés à cette réservation
      const doctors = box_plan.doctors_id
        ? box_plan.doctors_id.map(doctorId => {
            const foundDoctor = this.allUsers.find(user => user.id === doctorId);
            return foundDoctor 
              ? `${foundDoctor.first_name} ${foundDoctor.last_name}`
              : 'Médecin inconnu';
          }).join(', ')
        : 'Aucun médecin spécifié';
      
      return {
        id: box_plan.id,
        matricule: box_plan.matricule,
        date: this.formatDate(box_plan.date),
        period: this.formatTime(box_plan.period), // Changé de formatDate à formatTime pour l'heure
        pole: pole?.name || 'Non attribué',
        room: room?.name || 'Non attribué',
        doctors: doctors, // Nouvelle propriété pour afficher les médecins
        consultation_number: box_plan.consultation_number,
        consultation_time: `${box_plan.consultation_time} mins`,
        comment: box_plan.comment,
        status: box_plan.status
      };
    });

    this.filteredRequests5 = [...this.requests5];
    this.totalRecords = this.filteredRequests5.length;
  }

  // Helper pour formater la date
  private formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) 
      ? dateString 
      : date.toLocaleDateString('fr-FR');
  }

  formatTime(time: Date | string): string {
    if (typeof time === 'string') {
      return time;
    }
    if (!(time instanceof Date) || isNaN(time.getTime())) {
      return '00:00';
    }
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: message
    });
  }

  private showInfo(message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Information',
      detail: message
    });
  }

  /*cancelRequest(boxPlanId: string): void {
    this.boxPlanService.updateBoxPlanStatus(
      boxPlanId,
      'Annulé'
    ).subscribe({
      next: () => {
        this.loadAllData();
        this.showSuccess('Reservation annulé');
      },
      error: (err) => {
        console.error('Error cancelling request:', err);
        this.showError(err.error?.detail || 'Échec de l\'annulation');
      }
    });
  }*/

  cancelRequest(boxPlanId: string): void {
    // Trouver la réservation à annuler
    const boxPlan = this.allBoxPlan.find(bp => bp.id === boxPlanId);
    if (!boxPlan) {
        this.showError('Réservation introuvable');
        return;
    }

    this.boxPlanService.updateBoxPlanStatus(
        boxPlanId,
        'Annulé'
    ).pipe(
        // Mettre à jour le statut de la salle après l'annulation
        switchMap(() => {
            return this.roomService.updateRoomStatus(boxPlan.room, 'Disponible');
        })
    ).subscribe({
        next: () => {
            this.loadAllData(); // Recharger les données
            this.showSuccess('Réservation annulée et salle marquée comme disponible');
        },
        error: (err) => {
            console.error('Error cancelling request:', err);
            this.showError(err.error?.detail || 'Échec de l\'annulation');
        }
    });
  }

  acceptRequest(absenceId: string, replacementId: string | null): void {
    this.absenceService.updateAbsence(
      absenceId,
      'Accepté par le remplaçant',
      replacementId
    ).subscribe({
      next: () => {
        this.loadAllData();
        this.showSuccess('Demande de remplacement acceptée');
      },
      error: (err) => {
        console.error('Error accepting request:', err);
        this.showError(err.error?.detail || 'Échec de l\'acceptation');
      }
    });
  }
  
  refuseRequest(absenceId: string, replacementId: string | null): void {
    this.absenceService.updateAbsence(
      absenceId,
      'Refusé par le remplaçant',
      replacementId
    ).subscribe({
      next: () => {
        this.loadAllData();
        this.showSuccess('Demande remplacement refusée');
      },
      error: (err) => {
        console.error('Error refusing request:', err);
        this.showError(err.error?.detail || 'Échec du refus');
      }
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: message
    });
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
}