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
import { forkJoin, Observable } from 'rxjs';
import { BoxPlan } from '../../../models/box_plan';
import { Pole, Room, RoomProgram, PoleProgram, Speciality } from '../../../models/services';
import { User } from '../../../models/User';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { environment } from '../../../environment/environment';

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
  uploadUrl: string = `${environment.apiUrl}/box_plans/upload`;
  useColorsMode: boolean = false;
  selectedPoleId: string = '';
  selectedWeekStartDate: string | Date = '';
  
  // Options
  doctorsOptions: any[] = [];
  roomsOptions: any[] = [];
  specialityOptions: any[] = [];
  poleOptions: any[] = [];

  

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

    // Diagnostic initial pour faciliter le débogage
    setTimeout(() => {
      console.log('=== DIAGNOSTIC PLANNING BOX ===');
      console.log('Box Plans totaux:', this.originalBoxPlans.length);
      console.log('Box Plans filtrés:', this.allBoxPlans.length);
      console.log('Programs créés:', this.programs.length);
      console.log('Pôles:', this.poles.length);
      console.log('Salles:', this.allRooms.length);
      console.log('Semaine sélectionnée:', this.selectedWeek);
      console.log('Date sélectionnée:', this.selectedDate);
      
      if (this.allBoxPlans.length > 0) {
        console.log('Exemple BoxPlan:', this.allBoxPlans[0]);
        console.log('Date format:', typeof this.allBoxPlans[0].date, this.allBoxPlans[0].date);
        console.log('Period format:', this.allBoxPlans[0].period);
        console.log('Room format:', this.allBoxPlans[0].room);
        console.log('Poll format:', this.allBoxPlans[0].poll);
      } else {
        console.warn('Aucun BoxPlan filtré - vérifier les dates et le filtrage par semaine');
      }
      
      if (this.programs.length === 0 && this.allBoxPlans.length > 0) {
        console.warn('Programs vides malgré des BoxPlans - vérifier initializePrograms()');
      }
    }, 2000);
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
    console.log('Total original box plans:', this.originalBoxPlans.length);
    
    // Filtrer les plans de réservation
    const filteredPlans = this.originalBoxPlans.filter(plan => {
        try {
            const planDate = this.normalizeDate(plan.date);
            planDate.setHours(0, 0, 0, 0);
            const isInRange = planDate >= startOfWeek && planDate <= endOfWeek;
            if (isInRange) {
              console.log('Plan in range:', plan.date, 'Room:', plan.room, 'Poll:', plan.poll);
            }
            return isInRange;
        } catch (e) {
            console.error('Error parsing plan date:', plan.date, e);
            return false;
        }
    });
    
    console.log('Filtered plans count:', filteredPlans.length);
    console.log('Sample filtered plans:', filteredPlans.slice(0, 5));
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

  // Normalise les dates venant d'Excel (timestamp), des strings ISO ou des objets Date
  private normalizeDate(date: string | Date): Date {
    if (date instanceof Date) {
      return date;
    }

    if (typeof date === 'string') {
      // Format Excel : nombre de jours depuis 1900-01-01
      if (/^\d+$/.test(date)) {
        const excelDate = parseInt(date, 10);
        const jsDate = new Date((excelDate - 1) * 86400000);
        jsDate.setFullYear(jsDate.getFullYear() - 70); // Ajustement pour base 1900
        return jsDate;
      }

      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    console.warn('Invalid date format:', date);
    return new Date();
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
            this.poleOptions = this.poles.map(p => ({ label: p.name, value: p.id }));
            
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
                
                // Trouver l'ID de la chambre (peut être un ID MongoDB ou un numéro de téléphone)
                let roomId = boxPlan.room;
                // Si ce n'est pas un ObjectId valide, chercher la room par nom ou autre identifiant
                if (!this.isValidObjectId(boxPlan.room)) {
                    const room = this.allRooms.find(r => r.name === boxPlan.room || r.id === boxPlan.room);
                    if (room) {
                        roomId = room.id;
                    }
                }
                
                // Mettre à jour le statut de la salle seulement si on a un ID valide
                const updateRoom$ = roomId && this.isValidObjectId(roomId)
                    ? this.roomService.updateRoomStatus(roomId, 'Disponible')
                    : new Observable(observer => {
                        console.warn(`Impossible de mettre à jour le statut de la chambre: ${boxPlan.room}`);
                        observer.next({});
                        observer.complete();
                    });
                
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
                // Ne pas bloquer l'application si certaines mises à jour échouent
                this.showError('Certaines mises à jour ont échoué');
            }
        });
    }
  }

  private isValidObjectId(id: string): boolean {
    // Vérifier si c'est un ObjectId MongoDB valide (24 caractères hexadécimaux)
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  initializePrograms(): void {
    console.log('Initializing programs with', this.allBoxPlans.length, 'box plans');
    
    // Créer un map des pôles avec leurs salles associées via box_plan
    const poleRoomMap = new Map<string, Set<string>>();
    
    // 1. Construire la relation pôle -> salles
    this.allBoxPlans.forEach(plan => {
        if (plan.poll && plan.room) { // Vérifier que poll et room existent
            if (!poleRoomMap.has(plan.poll)) {
                poleRoomMap.set(plan.poll, new Set());
            }
            // Ajouter l'identifiant de la room (peut être ID MongoDB ou numéro de téléphone)
            poleRoomMap.get(plan.poll)?.add(plan.room);
            console.log(`Added room ${plan.room} to pole ${plan.poll}`);
        }
    });
  
    console.log('Pole-Room map:', Array.from(poleRoomMap.entries()).map(([p, r]) => [p, Array.from(r)]));
  
    // 2. Créer les programmes pour chaque pôle qui a des réservations
    this.programs = Array.from(poleRoomMap.entries()).map(([poleId, roomIds]) => {
        const pole = this.poles.find(p => p.id === poleId) || { id: poleId, name: 'Inconnu' };
        
        console.log(`Creating program for pole ${pole.name} (${poleId}) with ${roomIds.size} rooms`);
        
        return {
            poleId: pole.id,
            poleName: pole.name,
            data: this.generateRoomDataForPole(pole.id, Array.from(roomIds))
        };
    });
  
    console.log('Total programs created:', this.programs.length);
    this.filteredPrograms = [...this.programs];
  }

  // Créer un mapping entre les identifiants de room (peut être ID MongoDB ou numéro de téléphone) et les rooms
  private getRoomMapping(): Map<string, Room> {
    const mapping = new Map<string, Room>();
    
    this.allRooms.forEach(room => {
      // Mapper par ID MongoDB
      mapping.set(room.id, room);
      // Mapper par nom de chambre (au cas où)
      if (room.name) {
        mapping.set(room.name, room);
      }
      // Si le room a un champ phone_number, mapper aussi par numéro de téléphone
      // Note: Le modèle Room n'a pas de phone_number, mais on peut l'ajouter si nécessaire
    });
    
    return mapping;
  }

  generateRoomDataForPole(poleId: string, roomIds: string[]): RoomProgram[] {
    console.log('Generating room data for pole:', poleId, 'with rooms:', roomIds);
    console.log('All rooms:', this.allRooms);
    console.log('All box plans:', this.allBoxPlans);
    
    // Créer un Set pour éviter les doublons
    const processedRooms = new Set<string>();
    const roomPrograms: RoomProgram[] = [];
    
    // Pour chaque identifiant de room (peut être ID MongoDB, nom, ou numéro de téléphone)
    roomIds.forEach(roomIdentifier => {
      if (processedRooms.has(roomIdentifier)) {
        return; // Déjà traité
      }
      
      // Filtrer les réservations pour ce room et ce pôle
      const roomReservations = this.allBoxPlans.filter(plan => {
        const matchesRoom = plan.room === roomIdentifier;
        const matchesPole = plan.poll === poleId;
        return matchesRoom && matchesPole;
      });
      
      // Si pas de réservations, ignorer
      if (roomReservations.length === 0) {
        return;
      }
      
      // Essayer de trouver la room correspondante dans la base
      let room = this.allRooms.find(r => r.id === roomIdentifier);
      
      if (!room) {
        room = this.allRooms.find(r => r.name === roomIdentifier);
      }

      if (!room) {
        room = this.allRooms.find(r => r.phone_number && String(r.phone_number) === String(roomIdentifier));
      }

      // Si toujours pas trouvé, créer une room virtuelle avec l'identifiant
      if (!room) {
        room = {
          id: roomIdentifier,
          name: `Salle ${roomIdentifier}`,
          status: 'Disponible'
        } as Room;
      }
      
      // Marquer comme traité
      processedRooms.add(roomIdentifier);
      
      console.log(`Room ${roomIdentifier}: ${roomReservations.length} réservations`);
      
      roomPrograms.push({
        roomId: room.id,
        nom_salle: room.name,
        num_salle: roomIdentifier, // Utiliser l'identifiant original (peut être numéro de téléphone)
        data: {
          matin: this.generateDayData('Matin', roomReservations),
          AM: this.generateDayData('AM', roomReservations)
        }
      });
    });
    
    console.log('Generated room programs:', roomPrograms);
    return roomPrograms;
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

  getSpecialityColorClass(speciality: string): string {
    if (!speciality) {
      return ''; // Pas de couleur si pas de spécialité
    }
    
    const spec = speciality.toLowerCase();
    
    // Ce mapping doit correspondre à celui du backend
    if (spec.includes('urologie')) {
      return 'bg-yellow-200';
    }
    if (spec.includes('viscérale')) {
      return 'bg-blue-200';
    }
    if (spec.includes('vasculaire')) {
      return 'bg-green-200';
    }
    if (spec.includes('hépatho gastro')) {
      return 'bg-pink-200';
    }
    
    return ''; // Couleur par défaut
  }

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
                    status: res.status, // Ajout du statut
                    speciality: res.comment // Récupérer la spécialité
                };
            }) || []
        );
        
        dayData[day] = {
            doctorsInfo: doctorsInfo,
            message: dayReservations.length > 0 ? dayReservations[0].status : 'Disponible', // Utilisation directe du statut
            speciality: dayReservations.length > 0 ? dayReservations[0].comment : null, // Récupérer la spécialité
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

    const timeUpper = time.toUpperCase();
    if (timeUpper.includes('MATIN') || timeUpper === 'MORNING') {
      return 'Matin';
    }
    if (timeUpper.includes('AM') || timeUpper.includes('APRÈS-MIDI') || timeUpper.includes('APRES-MIDI')) {
      return 'AM';
    }

    // Sinon, tenter de parser l'heure HH:mm
    try {
      const hour = parseInt(time.split(':')[0], 10);
      return hour < 12 ? 'Matin' : 'AM';
    } catch {
      return 'AM';
    }
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
    console.log('Upload event:', event);
    if (event.originalEvent instanceof HttpResponse) {
      const response = event.originalEvent.body;
      console.log('Upload response:', response);
      if (response && response.data) {
        const message = response.message || 'Fichier uploadé avec succès';
        this.showSuccess(message);
        this.displayUploadDialog = false;
        // Recharger les données après l'upload
        console.log('Reloading data after upload...');
        this.loadAllData();
        // Filtrer par la semaine courante après rechargement
        setTimeout(() => {
          const weekToFilter = this.selectedDate || new Date();
          this.filterBoxPlansByWeek(weekToFilter);
        }, 500);
      } else {
        console.error('Upload response missing data:', response);
        this.showError('Erreur lors de l\'upload du fichier');
      }
    } else {
      console.error('Upload event is not HttpResponse:', event);
      // Gérer les erreurs
      this.showError('Échec de l\'upload du fichier');
    }
  }

  onUploadError(error: any): void {
    this.showError('Erreur lors de l\'upload du fichier');
  }

  showUploadDialog(): void {
    this.displayUploadDialog = true;
    // Pré-remplir avec les valeurs par défaut
    if (this.poles.length > 0 && !this.selectedPoleId) {
      this.selectedPoleId = this.poles[0].id;
    }
    // Définir la date de début de la semaine actuelle
    if (!this.selectedWeekStartDate) {
      const currentWeekStart = this.getStartOfWeek(new Date());
      this.selectedWeekStartDate = currentWeekStart.toISOString().split('T')[0];
    }
  }

  getUploadUrl(): string {
    if (this.useColorsMode && this.selectedPoleId && this.loggedInUserId) {
      let url = `${this.uploadUrl}?use_colors=true&poll_id=${this.selectedPoleId}&staff_id=${this.loggedInUserId}`;
      if (this.selectedWeekStartDate) {
        // Convertir la date au format YYYY-MM-DD
        let dateStr: string;
        if (this.selectedWeekStartDate instanceof Date) {
          dateStr = this.selectedWeekStartDate.toISOString().split('T')[0];
        } else {
          // C'est une string, s'assurer que c'est au bon format
          const date = new Date(this.selectedWeekStartDate);
          if (!isNaN(date.getTime())) {
            dateStr = date.toISOString().split('T')[0];
          } else {
            dateStr = this.selectedWeekStartDate; // Utiliser tel quel si conversion échoue
          }
        }
        url += `&week_start_date=${dateStr}`;
      }
      return url;
    }
    return this.uploadUrl;
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