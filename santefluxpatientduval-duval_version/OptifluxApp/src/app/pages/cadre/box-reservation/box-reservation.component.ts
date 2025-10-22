import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { BadgeModule } from 'primeng/badge';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { PrintService } from '../../../services/print/print.service';
import { BoxPlanService } from '../../../services/box_plan/box-plan.service';
import { PoleService } from '../../../services/pole/pole.service';
import { SpecialityService } from '../../../services/speciality/speciality.service';
import { RoomService } from '../../../services/room/room.service';
import { UserService } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { forkJoin } from 'rxjs';
import { BoxPlan } from '../../../models/box_plan';
import { Pole, Room, RoomProgram, PoleProgram, Speciality } from '../../../models/services';
import { User } from '../../../models/User';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-box-reservation',
  imports: [
    TableModule, 
    CommonModule, 
    TabViewModule, 
    ToastModule, 
    BadgeModule,
    CalendarModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    FileUploadModule,
    DialogModule,
    TooltipModule,FormsModule
  ],
  providers: [MessageService],
  standalone: true,
  templateUrl: './box-reservation.component.html',
  styleUrls: ['./box-reservation.component.css']
})
export class BoxReservationComponent implements OnInit {
  // Données pour chaque pôle
  poles: Pole[] = [];
  programs: any[] = [];
  filteredPrograms: any[] = [];
  activeTabIndex: number = 0;
  loggedInUserId: string | null = null;
  
  // Données nécessaires
  allBoxPlans: BoxPlan[] = [];
  originalBoxPlans: BoxPlan[] = [];
  allRooms: any[] = [];
  allUsers: User[] = [];
  allSpecialities: Speciality[] = [];
  selectedWeek: string = '';
  selectedDate: Date = new Date();
  selectedDay: string | null = null; // Ajoutez cette ligne avec les autres propriétés
  weeks: any[] = [];
  
  // Filtres
  globalFilter: string = '';
  
  // Upload
  uploadedFiles: any[] = [];
  displayUploadDialog: boolean = false;
  
  // Options
  doctorsOptions: any[] = [];
  roomsOptions: any[] = [];
  specialityOptions: any[] = [];

  

  constructor(
    private boxPlanService: BoxPlanService,
    private poleService: PoleService,
    private roomService: RoomService,
    private userService: UserService,
    private specialityService: SpecialityService,
    private authService: AuthService,
    private messageService: MessageService,
    private printService: PrintService
  ) {}

  ngOnInit(): void {
    this.loadUserAndData();
    this.initializeWeeks();
    this.setCurrentWeek();
  }

  initializeWeeks(): void {
    // Générer 10 semaines autour de la date actuelle (5 avant, 5 après)
    this.weeks = [];
    const currentDate = new Date();
    
    for (let i = -5; i <= 5; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i * 7);
      
      const weekNumber = this.getWeekNumber(date);
      const startDate = this.getStartOfWeek(date);
      const endDate = this.getEndOfWeek(date);
      
      this.weeks.push({
        label: `Semaine ${weekNumber}: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
        value: date,
        weekNumber: weekNumber,
        startDate: startDate,
        endDate: endDate
      });
    }
  }

  setCurrentWeek(): void {
    const currentDate = new Date();
    const weekNumber = this.getWeekNumber(currentDate);
    const startDate = this.getStartOfWeek(currentDate);
    const endDate = this.getEndOfWeek(currentDate);
    
    this.selectedWeek = `Semaine ${weekNumber}: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    this.selectedDate = currentDate;
    this.onWeekChange();
  }

  getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /*getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay() || 7; // Si dimanche (0), le convertir en 7
    if (day !== 1) result.setHours(-24 * (day - 1));
    return result;
  }

  getEndOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay() || 7;
    if (day !== 5) result.setHours(24 * (5 - day));
    return result;
  }*/

  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return date.toLocaleDateString('fr-FR', options);
  }

  /*onWeekChange(): void {
    console.log('Week changed to:', this.selectedWeek, this.selectedDate);
    const selectedWeek = this.weeks.find(w => 
        w.label === this.selectedWeek || 
        w.value.getTime() === this.selectedDate.getTime()
    );
    
    if (selectedWeek) {
        console.log('Selected week found:', selectedWeek);
        this.selectedDate = selectedWeek.value;
        this.filterBoxPlansByWeek(selectedWeek.value);
    } else {
        console.log('No matching week found');
    }
  }*/

  onWeekChange(): void {
    let selectedWeekData;
    
    // Si la sélection vient du dropdown
    if (this.selectedWeek) {
        selectedWeekData = this.weeks.find(w => w.label === this.selectedWeek);
        if (selectedWeekData) {
            this.selectedDate = selectedWeekData.value;
        }
    }
    
    // Si la sélection vient du calendrier
    if (this.selectedDate) {
        if (!selectedWeekData) {
            selectedWeekData = {
                value: this.selectedDate,
                startDate: this.getStartOfWeek(this.selectedDate),
                endDate: this.getEndOfWeek(this.selectedDate)
            };
        }
        
        // Mettre à jour le dropdown pour refléter la sélection
        const weekNumber = this.getWeekNumber(this.selectedDate);
        const startDate = this.getStartOfWeek(this.selectedDate);
        const endDate = this.getEndOfWeek(this.selectedDate);
        this.selectedWeek = `Semaine ${weekNumber}: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    }
    
    if (selectedWeekData) {
        this.filterBoxPlansByWeek(selectedWeekData.value);
    }
  }

  /*filterBoxPlansByWeek(weekDate: Date): void {
    const startOfWeek = this.getStartOfWeek(weekDate);
    const endOfWeek = this.getEndOfWeek(weekDate);
    
    console.log('Filtering box plans for week:', startOfWeek, 'to', endOfWeek);
    
    // Filtrer à partir des données originales
    const filteredPlans = this.originalBoxPlans.filter(plan => {
        try {
            const planDate = new Date(plan.date);
            return planDate >= startOfWeek && planDate <= endOfWeek;
        } catch (e) {
            console.error('Error parsing plan date:', plan.date, e);
            return false;
        }
    });
    
    console.log('Filtered plans:', filteredPlans);
    this.allBoxPlans = filteredPlans; // On utilise allBoxPlans pour les données affichées
    this.initializePrograms();
    this.applyFilters();
  }*/

  filterBoxPlansByWeek(weekDate: Date): void {
    const startOfWeek = this.getStartOfWeek(weekDate);
    const endOfWeek = this.getEndOfWeek(weekDate);
    
    // S'assurer que les heures sont à 00:00:00 pour la comparaison
    startOfWeek.setHours(0, 0, 0, 0);
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log('Filtering box plans for week:', startOfWeek, 'to', endOfWeek);
    
    // Filtrer les plans de réservation
    const filteredPlans = this.originalBoxPlans.filter(plan => {
        try {
            const planDate = new Date(plan.date);
            planDate.setHours(0, 0, 0, 0);
            return planDate >= startOfWeek && planDate <= endOfWeek;
        } catch (e) {
            console.error('Error parsing plan date:', plan.date, e);
            return false;
        }
    });
    
    console.log('Filtered plans count:', filteredPlans.length);
    this.allBoxPlans = filteredPlans;
    this.initializePrograms();
    this.applyFilters();
  }

  filterBoxPlansFromDate(selectedDate: Date): void {
    // Réinitialiser à la semaine de la date sélectionnée
    this.selectedDate = selectedDate;
    this.onWeekChange();
    
    // Si vous voulez filtrer seulement à partir de la date (pas toute la semaine)
    // const filteredPlans = this.originalBoxPlans.filter(plan => {
    //     try {
    //         const planDate = new Date(plan.date);
    //         return planDate >= selectedDate;
    //     } catch (e) {
    //         console.error('Error parsing plan date:', plan.date, e);
    //         return false;
    //     }
    // });
    // this.allBoxPlans = filteredPlans;
    // this.initializePrograms();
    // this.applyFilters();
  }

  getStartOfWeek(date: Date): Date {
      const result = new Date(date);
      const day = result.getDay() || 7; // Si dimanche (0), le convertir en 7
      if (day !== 1) {
          result.setDate(result.getDate() - (day - 1));
      }
      result.setHours(0, 0, 0, 0);
      return result;
  }

  getEndOfWeek(date: Date): Date {
      const result = new Date(date);
      const day = result.getDay() || 7;
      if (day !== 5) {
          result.setDate(result.getDate() + (5 - day));
      }
      result.setHours(23, 59, 59, 999);
      return result;
  }

  /*loadBoxPlansForWeek(startDate: Date, endDate: Date): void {
    console.log('Loading box plans between', startDate, 'and', endDate);
    
    this.boxPlanService.findBoxPlansByDateRange(startDate, endDate).subscribe({
        next: (response) => {
            console.log('Box plans response:', response);
            this.allBoxPlans = response.data || [];
            console.log('All box plans:', this.allBoxPlans);
            
            // Vérifiez quelques éléments
            if (this.allBoxPlans.length > 0) {
                console.log('First box plan:', this.allBoxPlans[0]);
                console.log('Poll:', this.allBoxPlans[0].poll);
                console.log('Room:', this.allBoxPlans[0].room);
                console.log('Date:', this.allBoxPlans[0].date);
            }
            
            this.initializePrograms();
            this.applyFilters();
        },
        error: (err) => {
            console.error('Error loading box plans:', err);
            this.showError('Échec du chargement des plannings pour cette semaine');
        }
    });
  }*/

  loadUserAndData(): void {
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        if (user?._id) {
          this.loggedInUserId = user._id;
          this.loadAllData();
        }
      },
      error: (err) => {
        this.showError('Échec de la connexion au serveur');
      }
    });
  }

  /*loadAllData(): void {
    forkJoin([
      this.poleService.findAllPoles(),
      this.roomService.findAllRooms(),
      this.boxPlanService.findAllBoxPlans(),
      this.userService.findAllUsers(),
      this.specialityService.findAllSpecialities(),
      
    ]).subscribe({
      next: ([polesResponse, roomsResponse, boxPlansResponse, usersResponse, specialityResponse]) => {
        this.poles = polesResponse.data || [];
        this.allRooms = roomsResponse.data || [];
        this.allBoxPlans = boxPlansResponse.data || [];
        this.allUsers = usersResponse.data || [];
        this.allSpecialities = specialityResponse.data || [];
        
        // Préparer les options pour les filtres
        this.doctorsOptions = this.allUsers.map(doctor => ({ label: `${doctor.first_name} ${doctor.last_name}`, value: doctor._id }));
          
        this.roomsOptions = this.allRooms.map(room => ({ label: room.name, value: room.id }));
        this.specialityOptions = this.allSpecialities.map(s => ({ label: s.name, value: s.id }));
        
        this.initializePrograms();
        this.applyFilters();
        this.updateExpiredReservations();
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.showError('Échec du chargement des données');
      }
    });
  }*/

    // Modifier loadAllData pour charger toutes les réservations une fois :
  loadAllData(): void {
    forkJoin([
        this.poleService.findAllPoles(),
        this.roomService.findAllRooms(),
        this.boxPlanService.findAllBoxPlans(), // Charger toutes les réservations
        this.userService.findAllUsers(),
        this.specialityService.findAllSpecialities(),
    ]).subscribe({
        next: ([polesResponse, roomsResponse, boxPlansResponse, usersResponse, specialityResponse]) => {
            this.poles = polesResponse.data || [];
            this.allRooms = roomsResponse.data || [];
            this.allBoxPlans = boxPlansResponse.data || []; // Stocker toutes les réservations
            this.originalBoxPlans = [...this.allBoxPlans]; 
            this.allUsers = usersResponse.data || [];
            this.allSpecialities = specialityResponse.data || [];
            
            this.doctorsOptions = this.allUsers.map(doctor => ({ label: `${doctor.first_name} ${doctor.last_name}`, value: doctor._id }));
            this.roomsOptions = this.allRooms.map(room => ({ label: room.name, value: room.id }));
            this.specialityOptions = this.allSpecialities.map(s => ({ label: s.name, value: s.id }));
            
            // Filtrer par la semaine courante par défaut
            this.filterBoxPlansByWeek(new Date());
            this.updateExpiredReservations();
        },
        error: (err) => {
            console.error('Error loading data:', err);
            this.showError('Échec du chargement des données');
        }
    });
  }

  private updateExpiredReservations(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiredReservations = this.allBoxPlans.filter(boxPlan => {
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

  initializePrograms(): void {
    // Créer un map des pôles avec leurs salles associées via box_plan
    const poleRoomMap = new Map<string, Set<string>>();
    
    // 1. Construire la relation pôle -> salles
    this.allBoxPlans.forEach(plan => {
        if (plan.poll) { // Ajout d'une vérification de null
            if (!poleRoomMap.has(plan.poll)) {
                poleRoomMap.set(plan.poll, new Set());
            }
            poleRoomMap.get(plan.poll)?.add(plan.room);
        }
    });
  
    // 2. Créer les programmes pour chaque pôle qui a des réservations
    this.programs = Array.from(poleRoomMap.entries()).map(([poleId, roomIds]) => {
        const pole = this.poles.find(p => p.id === poleId) || { id: poleId, name: 'Inconnu' };
        
        // Convertir le Set en tableau et récupérer les salles
        const rooms = Array.from(roomIds)
            .map(roomId => this.allRooms.find(r => r.id === roomId))
            .filter(room => room !== undefined) as Room[];
        
        return {
            poleId: pole.id,
            poleName: pole.name,
            data: this.generateRoomDataForPole(pole.id, Array.from(roomIds))
        };
    });
  
    this.filteredPrograms = [...this.programs];
  }

  generateRoomDataForPole(poleId: string, roomIds: string[]): RoomProgram[] {
    console.log('Generating room data for pole:', poleId, 'with rooms:', roomIds);
    console.log('All rooms:', this.allRooms);
    
    const poleRooms = this.allRooms.filter(room => {
        console.log('Checking room:', room.id, 'against:', roomIds);
        return roomIds.includes(room.id);
    });
    
    console.log('Filtered pole rooms:', poleRooms);
    
    return poleRooms.map(room => {
        const roomReservations = this.allBoxPlans.filter(plan => {
            console.log('Checking plan:', plan.room, 'vs', room.id, 'and', plan.poll, 'vs', poleId);
            return plan.room === room.id && plan.poll === poleId;
        });
        
        console.log('Reservations for room', room.id, ':', roomReservations);
        
        return {
            roomId: room.id,
            nom_salle: room.name,
            num_salle: room.phone_number || 'N/A',
            data: {
                matin: this.generateDayData('Matin', roomReservations),
                AM: this.generateDayData('AM', roomReservations)
            }
        };
    });
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

  /*generateDayData(period: string, reservations: BoxPlan[]): any {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    const dayData: any = {};
    
    days.forEach(day => {
        const dayReservations = reservations.filter(res => {
            try {
                const resDate = new Date(res.date);
                const dayOfWeek = resDate.getDay();
                
                // Conversion en jour français (dimanche=0 devient 7)
                const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
                const frenchDayIndex = adjustedDay - 1; // car lundi=1 dans adjustedDay
                
                // Vérifier si le jour de la semaine correspond
                return (
                    days[frenchDayIndex] === day && 
                    this.getPeriodFromTime(res.period) === period
                );
            } catch (e) {
                console.error('Error parsing date:', res.date, e);
                return false;
            }
        });
        
        // Reste du code inchangé...
        const totalDoctors = dayReservations.reduce((sum, res) => sum + (res.doctors_id?.length || 0), 0);
        const totalConsultations = dayReservations.reduce((sum, res) => sum + (parseInt(res.consultation_number) || 0), 0);
        const consultationTime = dayReservations.length > 0 
            ? `${dayReservations[0].consultation_time}mins`  
            : 'N/A';
        
        
        const doctorsInfo = dayReservations.flatMap(res => 
            res.doctors_id?.map(doctorId => {
                const doctor = this.allUsers.find(u => u.id === doctorId);
                return {
                    name: doctor ? `Dr ${doctor.first_name}` : 'Inconnu',
                    time: res.period || 'N/A'
                };
            }) || []
        );
        
        dayData[day] = {
            doctorsInfo: doctorsInfo,
            message: dayReservations.length > 0 ? 'Réservé' : 'Disponible',
            'pas cs': consultationTime,
            'nbre cs': totalConsultations,
            'nbe med': totalDoctors,
            doctorsNames: doctorsInfo.map(d => d.name).join(', ')
        };
    });
    
    return dayData;
  }*/

  generateDayData(period: string, reservations: BoxPlan[]): any {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    const dayData: any = {};
    
    days.forEach(day => {
        const dayReservations = reservations.filter(res => {
            try {
                const resDate = new Date(res.date);
                const dayOfWeek = resDate.getDay();
                
                const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
                const frenchDayIndex = adjustedDay - 1;
                
                return (
                    days[frenchDayIndex] === day && 
                    this.getPeriodFromTime(res.period) === period
                );
            } catch (e) {
                console.error('Error parsing date:', res.date, e);
                return false;
            }
        });
        
        const totalDoctors = dayReservations.reduce((sum, res) => sum + (res.doctors_id?.length || 0), 0);
        const totalConsultations = dayReservations.reduce((sum, res) => sum + (parseInt(res.consultation_number) || 0), 0);
        const consultationTime = dayReservations.length > 0 
            ? `${dayReservations[0].consultation_time}mins`  
            : 'N/A';
        
        // Calcul de l'heure de fin
        const endTime = dayReservations.length > 0 
            ? this.calculateEndTime(
                dayReservations[0].period, 
                dayReservations[0].consultation_number, 
                dayReservations[0].consultation_time
              )
            : 'N/A';
        
        const doctorsInfo = dayReservations.flatMap(res => 
            res.doctors_id?.map(doctorId => {
                const doctor = this.allUsers.find(u => u.id === doctorId);
                return {
                    name: doctor ? `Dr ${doctor.first_name}` : 'Inconnu',
                    time: res.period || 'N/A',
                    endTime: this.calculateEndTime(res.period, res.consultation_number, res.consultation_time),
                    status: res.status // Ajout du statut
                };
            }) || []
        );
        
        dayData[day] = {
            doctorsInfo: doctorsInfo,
            message: dayReservations.length > 0 ? dayReservations[0].status : 'Disponible', // Utilisation directe du statut
            'pas cs': consultationTime,
            'nbre cs': totalConsultations,
            'nbe med': totalDoctors,
            'heure fin': endTime, // Ajout de l'heure de fin
            doctorsNames: doctorsInfo.map(d => d.name).join(', ')
        };
    });
    
    return dayData;
  }

  // Méthode pour obtenir les spécialités d'un pôle
  getPoleSpecialities(poleId: string): string[] {
    const pole = this.poles.find(p => p.id === poleId);
    if (!pole || !pole.specialities || pole.specialities.length === 0) {
        return [];
    }
    
    return pole.specialities.map(specId => {
        const speciality = this.allSpecialities.find(s => s.id === specId);
        return speciality ? speciality.name : 'Inconnue';
    });
  }

  // Méthode pour obtenir toutes les spécialités (optionnel)
  getAllSpecialities(): string[] {
    return this.allSpecialities.map(s => s.name);
  }

  getPeriodFromTime(time: string): string {
    if (!time) return 'AM';
    const hour = parseInt(time.split(':')[0]);
    return hour < 12 ? 'Matin' : 'AM';
  }

  applyFilters(): void {
    this.filteredPrograms = this.programs.map((pole: PoleProgram) => {
      return {
        ...pole,
        data: pole.data.filter((room: RoomProgram) => {
          if (!this.globalFilter) return true;
  
          const searchText = this.globalFilter.toLowerCase();
          let matchFound = room.nom_salle.toLowerCase().includes(searchText);
  
          if (!matchFound) {
            (['matin', 'AM'] as const).forEach(period => {
              (['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const).forEach(day => {
                if (room.data[period][day].doctorsNames.toLowerCase().includes(searchText)) {
                  matchFound = true;
                }
              });
            });
          }
  
          return matchFound;
        })
      };
    }).filter(pole => pole.data.length > 0);
  }

  resetFilters(): void {
    this.globalFilter = '';
    this.applyFilters();
  }

  goToToday(): void {
    this.setCurrentWeek();
    //this.onWeekChange();
    this.filterBoxPlansByWeek(new Date());
  }

  /*printPlanning(): void {
    this.printService.printElement('planning-to-print', 'Planning des Boxes');
  }*/

  async exportToPdf(): Promise<void> {
    try {
        await this.printService.exportToPdf(
            'planning-to-print', 
            `planning-boxes-${this.selectedWeek.replace(/ /g, '_')}`
        );
        this.showSuccess('Export PDF réussi');
    } catch (error) {
        console.error('PDF export error:', error);
        this.showError('Échec de l\'export PDF');
    }
  }

  onUpload(event: any): void {
    for (let file of event.files) {
      this.uploadedFiles.push(file);
    }
    
    // Ici vous pourriez implémenter l'envoi du fichier au serveur
    this.messageService.add({
      severity: 'info',
      summary: 'Fichier téléchargé',
      detail: 'Le fichier a été téléchargé avec succès'
    });
    
    this.displayUploadDialog = false;
  }

  showUploadDialog(): void {
    this.displayUploadDialog = true;
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: message
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: message
    });
  }
}