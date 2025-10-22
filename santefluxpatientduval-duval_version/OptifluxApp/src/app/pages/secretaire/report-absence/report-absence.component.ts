import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Service, Pole, Room } from '../../../models/services';
import { BoxPlanService } from '../../../services/box_plan/box-plan.service';
import { PoleService } from '../../../services/pole/pole.service';
import { RoomService } from '../../../services/room/room.service';
import { AbsenceService } from '../../../services/absence/absence.service';
import { UserService } from '../../../services/user/user.service';
import { ServiceService } from '../../../services/service/service.service';
import { AuthService } from '../../../services/auth/auth.service';
import { User } from '../../../models/User';
//import { Service } from '../../../models/services';
import { Response } from '../../../dtos/response/Response';
import { CreateAbsenceRequest } from '../../../dtos/request/CreateAbsenceRequest';
import { CreateBoxPlanRequest } from '../../../dtos/request/CreateBoxPlanRequest';
import { MultiSelect } from 'primeng/multiselect';
import { MultiSelectModule } from 'primeng/multiselect';
import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { CalendarModule } from 'primeng/calendar';
// import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-report-absence',
  imports: [
    TableModule,
    CommonModule,
    TabViewModule,
    InputTextModule,
    DatePickerModule,
    ButtonModule,
    SelectModule,
    ReactiveFormsModule,
    ToastModule,
    MultiSelect, MultiSelectModule, CalendarModule
  ],
  standalone: true,
  templateUrl: './report-absence.component.html',
  styleUrl: './report-absence.component.css',
  providers: [MessageService],
 // encapsulation: ViewEncapsulation.None // Désactive l'encapsulation
})
export class ReportAbsenceComponent implements OnInit {
  reportForm: FormGroup;
  replacementForm: FormGroup;
  boxPlanForm: FormGroup;
  nurses: User[] = [];
  doctors: User[] = [];
  rooms!: Room[];
  poles!: Pole[];
  currentUser: User | null = null;
  serviceId: string | null = null;
  isLoading: boolean = true;
  today: Date;
  minDate: Date = new Date();

  constructor(
    private fb: FormBuilder,
    private absenceService: AbsenceService,
    private userService: UserService,
    private serviceService: ServiceService,
    private poleService: PoleService, 
    private boxPlanService: BoxPlanService,
    private roomService: RoomService, 
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.today = new Date();
    this.reportForm = this.fb.group({
      startDate: ['', Validators.required],
      startHour: ['', Validators.required],
      endDate: ['', Validators.required],
      endHour: ['', Validators.required],
      reason: ['', Validators.required],
      comment: ['', Validators.required]
    }, { validators: this.timeRangeValidator });

    this.replacementForm = this.fb.group({
      startDate: ['', Validators.required],
      startHour: ['', Validators.required],
      endDate: ['', Validators.required],
      endHour: ['', Validators.required],
      reason: ['', Validators.required],
      comment: ['', Validators.required],
      replacementId: ['', Validators.required]
    }, { validators: this.timeRangeValidator });

    this.boxPlanForm = this.fb.group({
      doctors_id: [[]],
      poll: ['', Validators.required],
      room: ['', Validators.required],
      period: ['', Validators.required],
      date: ['', Validators.required],
      consultation_number: ['', [Validators.required, Validators.pattern(/^[0-9]\d*$/)]],
      consultation_time: ['', [Validators.required, Validators.pattern(/^[0-9]\d*$/)]],
      comment: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadNurses();
    this.loadRooms();
    this.loadPolls();
    this.loadDoctors();
  }

  // Validator to ensure end time is after start time
  timeRangeValidator(control: FormGroup): { [key: string]: boolean } | null {
    const startDate = control.get('startDate')?.value;
    const startHour = control.get('startHour')?.value;
    const endDate = control.get('endDate')?.value;
    const endHour = control.get('endHour')?.value;

    if (
      startDate instanceof Date &&
      startHour instanceof Date &&
      endDate instanceof Date &&
      endHour instanceof Date &&
      !isNaN(startDate.getTime()) &&
      !isNaN(startHour.getTime()) &&
      !isNaN(endDate.getTime()) &&
      !isNaN(endHour.getTime())
    ) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHour.getHours(), startHour.getMinutes());

      const endDateTime = new Date(endDate);
      endDateTime.setHours(endHour.getHours(), endHour.getMinutes());

      if (startDateTime.getTime() >= endDateTime.getTime()) {
        return { invalidTimeRange: true };
      }
    }
    return null;
  }

  // Format time to "HH:MM" string for backend submission
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

  /*formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }*/

  formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    
    // Crée une nouvelle date en ignorant le fuseau horaire
    const adjustedDate = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
    );
    
    return adjustedDate.toISOString().split('T')[0];
  }

  loadCurrentUser() {
    this.isLoading = true;
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        console.log('User info from AuthService:', user);
        if (!user) {
          console.log('No user data found, redirecting to login');
          this.isLoading = false;
          this.router.navigate(['/']);
          return;
        }

        this.currentUser = user;
        console.log('Checking service_id:', this.currentUser.service_id);
        this.serviceId = this.currentUser.service_id || null;
        this.isLoading = false; // Ensure isLoading is set to false
      },
      error: (err) => {
        console.error('Error fetching user info from AuthService:', err);
        this.showError('Erreur lors du chargement de l\'utilisateur');
        this.isLoading = false;
        this.router.navigate(['/']);
      }
    });
  }

  loadNurses() {
    this.userService.getNurses().subscribe({
      next: (response: Response<User[]>) => {
        console.log('Nurses response:', response);
        if (!response || !response.data) {
          console.log('No nurses data found in response');
          this.nurses = [];
          this.showWarning('Aucun infirmier trouvé.');
          return;
        }
        this.nurses = response.data;
        console.log('Nurses loaded:', this.nurses);
      },
      error: (err) => {
        console.error('Error loading nurses:', err);
        const errorMessage = err.error?.detail || 'Erreur lors du chargement des infirmiers';
        this.showError(errorMessage);
        this.nurses = [];
      }
    });
  }

  loadDoctors() {
    this.userService.findAllUsers().subscribe(data => {
      this.doctors = data.data.filter(user => user.role === 'cadre');
    });
  } 

  loadRooms() {
    this.roomService.findAllRooms().subscribe(data => {
      this.rooms = data.data.filter(room => room.status === 'Disponible' || room.status === 'En cours');
    });
  }

  loadPolls() {
    this.poleService.findAllPoles().subscribe(data => {
      this.poles = data.data;
    });
  }

  submitReport() {
    if (this.reportForm.invalid) {
      console.log('Report form invalid:', this.reportForm.errors);
      this.reportForm.markAllAsTouched();
      return;
    }

    if (this.reportForm.errors?.['invalidTimeRange']) {
      this.showError('La date et heure de fin doivent être postérieures à la date et heure de début.');
      return;
    }

    if (this.isLoading) {
      this.showError('Veuillez patienter pendant le chargement des données');
      return;
    }

    console.log('Submitting report with:', { currentUser: this.currentUser, serviceId: this.serviceId });
    if (!this.currentUser || !this.currentUser._id) {
      console.log('Validation failed:', {
        currentUserExists: !!this.currentUser,
        userId: this.currentUser?._id,
      });
      this.showError('Utilisateur non chargé correctement');
      return;
    }

    if (!this.serviceId) {
      this.showError('Aucun service associé à l\'utilisateur. Veuillez vérifier votre profil.');
      return;
    }

    const formValues = this.reportForm.value;
    const absenceData: CreateAbsenceRequest = {
      staff_id: this.currentUser._id,
      start_date: this.formatDate(formValues.startDate),
      start_hour: this.formatTime(formValues.startHour),
      end_date: this.formatDate(formValues.endDate),
      end_hour: this.formatTime(formValues.endHour),
      reason: formValues.reason,
      comment: formValues.comment,
      service_id: this.serviceId,
      replacement_id: undefined,
      status: 'En cours'
    };

    console.log('Submitting absence data:', absenceData);

    this.absenceService.createAbsence(absenceData).subscribe({
      next: (response) => {
        console.log('Absence created successfully:', response);
        this.showSuccess('Absence signalée avec succès');
        this.reportForm.reset();
      },
      error: (err: any) => {
        console.error('Error creating absence:', err);
        console.error('Error details:', err.error);
        this.showError(err.error?.message || 'Erreur lors de la demande de l\'absence');
      },
      complete: () => {
        console.log('Create absence request completed');
      }
    });
  }

  submitReplacement() {
    if (this.replacementForm.invalid) {
      console.log('Replacement form invalid:', this.replacementForm.errors);
      this.replacementForm.markAllAsTouched();
      return;
    }

    if (this.replacementForm.errors?.['invalidTimeRange']) {
      this.showError('La date et heure de fin doivent être postérieures à la date et heure de début.');
      return;
    }

    if (this.isLoading) {
      this.showError('Veuillez patienter pendant le chargement des données');
      return;
    }

    console.log('Submitting replacement with:', { currentUser: this.currentUser, serviceId: this.serviceId });
    if (!this.currentUser || !this.currentUser._id) {
      console.log('Validation failed:', {
        currentUserExists: !!this.currentUser,
        userId: this.currentUser?._id
      });
      this.showError('Utilisateur non chargé correctement');
      return;
    }

    if (!this.serviceId) {
      this.showError('Aucun service associé à l\'utilisateur. Veuillez vérifier votre profil.');
      return;
    }

    const formValues = this.replacementForm.value;
    const absenceData: CreateAbsenceRequest = {
      staff_id: this.currentUser._id,
      start_date: this.formatDate(formValues.startDate),
      start_hour: this.formatTime(formValues.startHour),
      end_date: this.formatDate(formValues.endDate),
      end_hour: this.formatTime(formValues.endHour),
      reason: formValues.reason,
      comment: formValues.comment,
      replacement_id: formValues.replacementId,
      service_id: this.serviceId,
      status: 'En cours'
    };

    console.log('Submitting absence data with replacement:', absenceData);

    this.absenceService.createAbsence(absenceData).subscribe({
      next: (response) => {
        console.log('Absence with replacement created successfully:', response);
        this.showSuccess('Demande de remplacement transmise');
        this.replacementForm.reset();
      },
      error: (err: any) => {
        console.error('Error creating absence with replacement:', err);
        console.error('Error details:', err.error);
        this.showError(err.error?.message || 'Erreur lors de la demande de l\'absence');
      },
      complete: () => {
        console.log('Create absence with replacement request completed');
      }
    });
  }

  submitBoxPlan() {
    if (this.boxPlanForm.invalid) {
        console.log('Box plan form invalid:', this.boxPlanForm.errors);
        this.boxPlanForm.markAllAsTouched();
        return;
    }

    if (this.isLoading) {
        this.showError('Veuillez patienter pendant le chargement des données');
        return;
    }

    if (!this.currentUser || !this.currentUser._id) {
        console.log('Validation failed:', {
            currentUserExists: !!this.currentUser,
            userId: this.currentUser?._id,
        });
        this.showError('Utilisateur non chargé correctement');
        return;
    }

    const formValues = this.boxPlanForm.value;
    const boxPlanData: CreateBoxPlanRequest = {
        staff_id: this.currentUser._id,
        doctors_id: formValues.doctors_id || [],
        date: this.formatDate(formValues.date),
        period: this.formatTime(formValues.period),
        poll: formValues.poll,
        room: formValues.room,
        consultation_number: formValues.consultation_number,
        consultation_time: formValues.consultation_time,
        comment: formValues.comment,
        status: 'En cours'
    };

    console.log('Submitting box plan data:', boxPlanData);

    this.isLoading = true; // Ajoutez ceci pour gérer l'état de chargement

    this.boxPlanService.createBoxPlan(boxPlanData).pipe(
        switchMap((response) => {
            // Mettre à jour le statut de la chambre après création du plan
            const newStatus = 'En cours';
            return this.roomService.updateRoomStatus(boxPlanData.room, newStatus);
        })
    ).subscribe({
        next: (response) => {
            console.log('Box plan created and room status updated successfully:', response);
            this.showSuccess('Réservation de box créée avec succès');
            this.boxPlanForm.reset();
            this.isLoading = false;
        },
        error: (err) => {
            console.error('Error:', err);
            this.showError(err.error?.message || 'Erreur lors de la réservation de box');
            this.isLoading = false;
        }
    });
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: message });
  }

  showWarning(message: string) {
    this.messageService.add({ severity: 'warn', summary: 'Attention', detail: message });
  }
}