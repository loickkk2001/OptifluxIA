import { Component, signal, WritableSignal, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl } from '@angular/forms';
import { UserService } from '../../../services/user/user.service';
import { RoleService } from '../../../services/role/role.service';
import { ServiceService } from '../../../services/service/service.service';
import { ContratService, Contrat, WorkDay } from '../../../services/contrat/contrat.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CreateUserRequest } from '../../../dtos/request/CreateUserRequest';
import { User } from '../../../models/User';
import { Role } from '../../../models/role';
import { Service } from '../../../models/services';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { Paginator, PaginatorState } from 'primeng/paginator';

@Component({
  selector: 'app-sec-medical-staff',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DrawerModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    IftaLabelModule,
    ConfirmDialogModule,
    ToastModule,
    DatePickerModule,
    DropdownModule,
    FormsModule
  ],
  standalone: true,
  templateUrl: './sec-medical-staff.component.html',
  styleUrls: ['./sec-medical-staff.component.css'],
  providers: [ConfirmationService, MessageService]
})
export class SecMedicalStaffComponent implements AfterViewInit {
  users: User[] = [];
  roles: Role[] = [];
  services: Service[] = [];
  contrats: { [userId: string]: Contrat | null } = {};
  selectedUser: User | null = null;
  selectedUserForDetails: User | null = null;
  selectedContrat: Contrat | null = null;
  loggedInUser: User | null = null;
  loading = signal(false);

  userForm: FormGroup;
  contratForm: FormGroup;
  drawerVisible: WritableSignal<boolean> = signal(false);
  detailsDrawerVisible: WritableSignal<boolean> = signal(false);
  contratDialogVisible: WritableSignal<boolean> = signal(false);
  addUserDialogVisible: WritableSignal<boolean> = signal(false);
  isEditMode: boolean = false;
  isContratEditMode: boolean = false;

  specialities: string[] = ['Cardiologie', 'Pédiatrie', 'Chirurgie', 'Généraliste', 'Neurologie'];
  contratTypes: string[] = ['Temps plein', 'Temps partiel'];
  availableDays: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = '';
  first: number = 0;
  rows: number = 10;
  totalRecords = 0;

  roleOptions = [
    { label: 'Médecin', value: 'doctor' }
  ];

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private serviceService: ServiceService,
    private contratService: ContratService,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(3)]],
      last_name: ['', [Validators.required, Validators.minLength(3)]],
      tel: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      service: ['']
    });

    this.contratForm = this.fb.group({
      speciality: ['', Validators.required],
      contrat_type: ['', Validators.required],
      contrat_hours: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      work_days: this.fb.array([]) // FormArray simplifié temporairement
    });
  }

  ngOnInit() {
    this.loadUserAndData();
  }

  ngAfterViewInit() {
    // Section des jours de travail temporairement désactivée
    this.cdr.detectChanges();
  }

  loadUserAndData(): void {
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        if (user?._id) {
          this.loggedInUser = user;
          // Attendre que le cycle de détection soit terminé
          setTimeout(() => {
            this.loadAllData();
          }, 0);
        } else {
          this.showError('Impossible de charger les informations utilisateur');
        }
      },
      error: () => {
        this.showError('Échec de la connexion au serveur');
      }
    });
  }

  loadAllData(): void {
    forkJoin([
      this.roleService.findAllRoles(),
      this.serviceService.findAllServices()
    ]).subscribe({
      next: ([rolesResponse, servicesResponse]) => {
        console.log('🔍 Réponse rôles:', rolesResponse);
        console.log('🔍 Réponse services:', servicesResponse);
        
        this.roles = (rolesResponse.data || [])
          .filter(role => role.name.toLowerCase() === 'doctor')
          .map(role => ({
            ...role,
            name: this.mapRoleName(role.name)
          }));
        
        this.services = servicesResponse.data || [];
        console.log('🔍 Services chargés:', this.services);
        console.log('🔍 Nombre de services:', this.services.length);
        
        // Le FormArray est maintenant initialisé avec un élément par défaut dans le constructeur
        // Plus besoin d'ajouter un jour de travail ici
        
        // Ajouter un petit délai pour s'assurer que tout est initialisé
        setTimeout(() => {
          this.loadUsers();
        }, 100);
      },
      error: () => {
        this.showError('Échec du chargement des données');
      }
    });
  }

  loadUsers() {
    console.log('🔍 Début du chargement des utilisateurs');
    this.userService.findAllUsers().subscribe({
      next: (response) => {
        console.log('🔍 Réponse API utilisateurs:', response);
        console.log('🔍 Tous les utilisateurs:', response.data);
        
        this.users = response.data
          .filter(user => {
            console.log('🔍 Utilisateur:', user.first_name, user.last_name, 'Rôle:', user.role);
            return user.role === 'doctor';
          })
          .map(user => ({
            ...user,
            serviceName: this.services.find(s => s.id === user.service_id)?.name || 'Non attribué',
            role: this.mapRoleName(user.role)
          }))
          .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
            const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
            return dateB.getTime() - dateA.getTime();
          });

        console.log('🔍 Médecins filtrés:', this.users);
        console.log('🔍 Nombre de médecins trouvés:', this.users.length);

        if (this.users.length === 0) {
          this.showInfo('Aucun médecin trouvé');
        }

        this.users.forEach(user => this.loadContratForUser(user));
        this.filteredUsers = [...this.users];
        this.totalRecords = this.filteredUsers.length;
        
        console.log('🔍 filteredUsers final:', this.filteredUsers);
        console.log('🔍 totalRecords:', this.totalRecords);
        
        // Forcer la détection de changement
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
        this.showError('Erreur lors du chargement des utilisateurs');
      }
    });
  }

  private mapRoleName(name: string): string {
    const roleMap: { [key: string]: string } = {
      admin: 'Administrateur',
      nurse: 'Secrétaire',
      cadre: 'Cadre de santé',
      doctor: 'Médecin'
    };
    return roleMap[name.toLowerCase()] || name;
  }

  private getBackendRoleName(displayRole: string): string {
    const reverseMap: { [key: string]: string } = {
      'Administrateur': 'admin',
      'Secrétaire': 'nurse',
      'Cadre de santé': 'cadre',
      'Médecin': 'doctor'
    };
    return reverseMap[displayRole] || displayRole;
  }

  applyFilter() {
    this.filteredUsers = this.users.filter(user => {
      const searchTerm = this.searchTerm.toLowerCase();
      const serviceName = (user.serviceName ?? '').toLowerCase();
      const role = (user.role || '').toLowerCase();
      const matchesStatus = !this.selectedRole || this.getBackendRoleName(role) === this.selectedRole.toLowerCase();
      const matchesSearch =
        this.searchTerm === '' ||
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm) ||
        serviceName.includes(searchTerm);

      return matchesStatus && matchesSearch;
    });

    this.totalRecords = this.filteredUsers.length;
    this.first = 0;
  }

  uniqueDaysValidator(control: AbstractControl): { [key: string]: any } | null {
    const array = control as FormArray;
    const days = array.controls
      .map(control => control.get('day')?.value)
      .filter(day => !!day);
      
    const uniqueDays = new Set(days);
    return days.length === uniqueDays.size ? null : { duplicateDays: true };
  }

  get workDaysArray(): FormArray {
    const workDays = this.contratForm?.get('work_days') as FormArray;
    return workDays || this.fb.array([]);
  }

  timeRangeValidator(control: FormGroup): { [key: string]: boolean } | null {
    const startTime = control.get('start_time')?.value;
    const endTime = control.get('end_time')?.value;
    if (startTime instanceof Date && endTime instanceof Date && !isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
      if (startTime.getTime() >= endTime.getTime()) {
        return { invalidTimeRange: true };
      }
    }
    return null;
  }

  addWorkDay(day: string = '', startTime: string | Date = '09:00', endTime: string | Date = '17:00') {
    // Vérifier que le FormArray existe
    if (!this.contratForm || !this.contratForm.get('work_days')) {
      console.error('❌ contratForm ou work_days n\'est pas initialisé');
      return;
    }

    const start = typeof startTime === 'string' ? this.parseTime(startTime) : startTime;
    const end = typeof endTime === 'string' ? this.parseTime(endTime) : endTime;
  
    const selectedDay = day || this.getFirstAvailableDay();
  
    const workDayGroup = this.fb.group({
      day: [selectedDay, Validators.required],
      start_time: [start, Validators.required],
      end_time: [end, Validators.required]
    }, { validators: this.timeRangeValidator });
  
    this.workDaysArray.push(workDayGroup);
    this.workDaysArray.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  getFirstAvailableDay(): string {
    const selectedDays = this.workDaysArray.controls.map(control => control.get('day')?.value).filter(day => !!day);
    return this.availableDays.find(day => !selectedDays.includes(day)) || this.availableDays[0];
  }

  trackByFn(index: number, item: any): number {
    return index;
  }

  removeWorkDay(index: number) {
    this.workDaysArray.removeAt(index);
    if (this.workDaysArray.length === 0) {
      this.addWorkDay();
    }
    this.cdr.detectChanges();
  }

  getAvailableDaysForIndex(index: number): string[] {
    const selectedDays = this.workDaysArray.controls
      .map((control, idx) => (idx !== index ? control.get('day')?.value : null))
      .filter(day => day !== null);
      
    return this.availableDays.filter(day => !selectedDays.includes(day));
  }

  getUserWorkDays(user: User): { day: string, isWorking: boolean }[] {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const userId = user.id || user._id;
    const contrat = this.contrats[userId!];
    if (!contrat || !contrat.work_days) {
      return days.map(day => ({ day, isWorking: false }));
    }

    return days.map((day, index) => {
      const fullDay = this.availableDays[index];
      const isWorking = contrat.work_days.some((workDay: WorkDay) => workDay.day === fullDay);
      return { day, isWorking };
    });
  }

  parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
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

  loadContratForUser(user: User) {
    const userId = user.id || user._id;
    if (!userId) return;
    this.contratService.getContratByUserId(userId).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.contrats[userId] = response.data;
        } else {
          this.contrats[userId] = null;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.contrats[userId] = null;
        this.cdr.detectChanges();
      }
    });
  }

  loadServices(): Promise<void> {
    return new Promise((resolve) => {
      this.serviceService.findAllServices().subscribe({
        next: (response) => {
          this.services = response.data;
          resolve();
        },
        error: () => {
          this.showError('Erreur lors du chargement des services');
          resolve();
        }
      });
    });
  }

  openAddUserDialog() {
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.userForm.patchValue({
      service: this.loggedInUser?.service_id || ''
    });
    this.addUserDialogVisible.set(true);
  }

  addUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const values = this.userForm.getRawValue();
    const newUser: CreateUserRequest = {
      first_name: values.first_name,
      last_name: values.last_name,
      phoneNumber: values.tel,
      email: values.email,
      password: '12345678',
      role: 'doctor', // Forcer le rôle à doctor
      service_id: values.service || this.loggedInUser?.service_id || undefined
    };

    this.authService.createUser(newUser).subscribe({
      next: (response) => {
        this.showSuccess('Utilisateur créé avec succès');
        this.loadUsers();
        this.addUserDialogVisible.set(false);
      },
      error: (err) => {
        this.showError(err.error?.message || 'Erreur lors de la création');
      },
      complete: () => this.loading.set(false)
    });
  }

  editUser(user: User) {
    this.isEditMode = true;
    this.selectedUser = { ...user };
    this.userForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      tel: user.phoneNumber,
      email: user.email,
      role: this.getBackendRoleName(user.role), // Set backend role (e.g., 'admin')
      service: user.service_id || ''
    });
    this.drawerVisible.set(true);
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const values = this.userForm.getRawValue();

    if (this.isEditMode && (this.selectedUser?.id || this.selectedUser?._id)) {
      const userId = this.selectedUser.id || this.selectedUser._id;
      const updatedUser = {
        first_name: values.first_name,
        last_name: values.last_name,
        phoneNumber: values.tel,
        email: values.email,
        role: values.role, // Uses backend role value (e.g., 'admin')
        service_id: values.service || null
      };
      this.userService.updateUser(userId!, updatedUser).subscribe({
        next: () => {
          this.showSuccess('Utilisateur mis à jour avec succès');
          this.loadUsers();
          this.closeDrawer();
        },
        error: (err) => {
          this.showError(err.error?.message || 'Erreur lors de la mise à jour');
        },
        complete: () => this.loading.set(false)
      });
    }
  }

  closeDrawer() {
    this.drawerVisible.set(false);
    this.userForm.reset();
    this.selectedUser = null;
    this.isEditMode = false;
  }

  confirmDelete(user: User) {
    const userId = user.id || user._id;
    if (!userId) {
      this.showError('ID utilisateur invalide');
      return;
    }
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer ${user.first_name} ${user.last_name} ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      acceptIcon: 'pi pi-check',
      acceptButtonStyleClass: 'p-button-danger',
      rejectLabel: 'Annuler',
      rejectIcon: 'pi pi-times',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteUser(userId);
      }
    });
  }

  deleteUser(userId: string) {
    this.loading.set(true);
    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.showSuccess('Utilisateur supprimé avec succès');
        this.loadUsers();
      },
      error: (err) => {
        this.showError(err.error?.message || 'Erreur lors de la suppression');
      },
      complete: () => this.loading.set(false)
    });
  }

  viewDetails(user: User) {
    this.selectedUserForDetails = { ...user };
    this.loadContrat(user);
    this.detailsDrawerVisible.set(true);
  }

  loadContrat(user: User) {
    const userId = user.id || user._id;
    if (!userId) return;
    this.contratService.getContratByUserId(userId).subscribe({
      next: (response) => {
        if (response?.data) {
          this.selectedContrat = response.data;
          this.isContratEditMode = true;
  
          this.contratForm.reset();
          while (this.workDaysArray.length > 0) {
            this.workDaysArray.removeAt(0);
          }
  
          if (this.selectedContrat.work_days?.length) {
            this.selectedContrat.work_days.forEach(workDay => {
              this.addWorkDay(
                workDay.day,
                this.parseTime(workDay.start_time),
                this.parseTime(workDay.end_time)
              );
            });
          } else {
            this.addWorkDay();
          }
  
          this.contratForm.patchValue({
            speciality: this.selectedContrat.speciality,
            contrat_type: this.selectedContrat.contrat_type,
            contrat_hours: this.selectedContrat.contrat_hours
          });
        } else {
          this.selectedContrat = null;
          this.isContratEditMode = false;
          this.contratForm.reset();
          while (this.workDaysArray.length > 0) {
            this.workDaysArray.removeAt(0);
          }
          this.addWorkDay();
        }
      },
      error: () => {
        this.showError('Erreur lors du chargement du contrat');
        this.selectedContrat = null;
        this.isContratEditMode = false;
        this.contratForm.reset();
        while (this.workDaysArray.length > 0) {
          this.workDaysArray.removeAt(0);
        }
        this.addWorkDay();
      }
    });
  }

  openContratDialog() {
    if (this.workDaysArray.length === 0) {
      this.addWorkDay();
    }
    this.contratDialogVisible.set(true);
    this.cdr.detectChanges();
  }

  closeDetailsDrawer() {
    this.detailsDrawerVisible.set(false);
    this.selectedUserForDetails = null;
    this.selectedContrat = null;
    this.isContratEditMode = false;
  }

  closeContratDialog() {
    this.contratDialogVisible.set(false);
    this.contratForm.reset();
    while (this.workDaysArray.length > 0) {
      this.workDaysArray.removeAt(0);
    }
    this.addWorkDay();
    this.cdr.detectChanges();
  }

  onDrawerVisibleChange(visible: boolean) {
    this.drawerVisible.set(visible);
  }

  onDetailsDrawerVisibleChange(visible: boolean) {
    this.detailsDrawerVisible.set(visible);
  }

  onContratDialogVisibleChange(visible: boolean) {
    this.contratDialogVisible.set(visible);
  }

  submitContrat() {
    if (this.contratForm.invalid) {
      this.contratForm.markAllAsTouched();
      return;
    }
  
    this.loading.set(true);
  
    const formValues = this.contratForm.getRawValue();
    const workDays = formValues.work_days.map((workDay: any) => ({
      day: workDay.day,
      start_time: this.formatTime(workDay.start_time),
      end_time: this.formatTime(workDay.end_time)
    }));
  
    const contratData: Contrat = {
      user_id: this.selectedUserForDetails!.id || this.selectedUserForDetails!._id!,
      speciality: formValues.speciality,
      contrat_type: formValues.contrat_type,
      contrat_hours: formValues.contrat_hours,
      work_days: workDays
    };

    if (this.isContratEditMode && this.selectedContrat?.id) {
      this.contratService.updateContrat(this.selectedContrat.id, contratData).subscribe({
        next: () => {
          this.showSuccess('Contrat mis à jour avec succès');
          this.loadContrat(this.selectedUserForDetails!);
          this.closeContratDialog();
        },
        error: (err) => {
          this.showError(err.error?.message || 'Erreur lors de la mise à jour du contrat');
        },
        complete: () => this.loading.set(false)
      });
    } else {
      this.contratService.createContrat(contratData).subscribe({
        next: () => {
          this.showSuccess('Contrat créé avec succès');
          this.loadContrat(this.selectedUserForDetails!);
          this.closeContratDialog();
        },
        error: (err) => {
          this.showError(err.error?.message || 'Erreur lors de la création du contrat');
        },
        complete: () => this.loading.set(false)
      });
    }
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: message });
  }

  showInfo(message: string) {
    this.messageService.add({ severity: 'info', summary: 'Information', detail: message });
  }

  onPageChange(event: PaginatorState) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
  }
}