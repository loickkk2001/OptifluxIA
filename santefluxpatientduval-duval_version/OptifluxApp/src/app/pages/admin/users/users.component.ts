import { Component, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../../models/User';
import { UserService } from '../../../services/user/user.service';
import { RoleService } from '../../../services/role/role.service';
import { ServiceService } from '../../../services/service/service.service';
import { AuthService } from '../../../services/auth/auth.service';
import { CreateUserRequest } from '../../../dtos/request/CreateUserRequest';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Role } from '../../../models/role';
import { Service } from '../../../models/services';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorState } from 'primeng/paginator';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { IftaLabel } from 'primeng/iftalabel';
import { Password } from 'primeng/password';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Button,
    TableModule,
    Drawer,
    InputText,
    Select,
    IftaLabel,
    Password,
    ConfirmDialogModule,
    ToastModule,
    DropdownModule,
    FormsModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
  providers: [ConfirmationService, MessageService]
})
export class UsersComponent {
  users: User[] = [];
  roles: Role[] = [];
  services: Service[] = [];
  selectedUser: User | null = null;
  loading = signal(false);

  userForm: FormGroup;
  drawerVisible: WritableSignal<boolean> = signal(false);
  isEditMode: boolean = false;

  filteredUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = '';
  first: number = 0;
  rows: number = 10;
  totalRecords = 0;

  roleOptions = [
    { label: 'Administrateur', value: 'Administrateur' },
    { label: 'Secrétaire', value: 'Secrétaire' },
    { label: 'Cadre de santé', value: 'Cadre de santé' },
    { label: 'Médecin', value: 'Médecin' }
  ];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private roleService: RoleService,
    private serviceService: ServiceService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.userForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(3)]],
      last_name: ['', [Validators.required, Validators.minLength(3)]],
      tel: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      service: [''],
      password: ['', [Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    this.loadRoles();
    this.loadServices().then(() => {
      this.loadUsers();
    });
  }

  loadUsers() {
    this.userService.findAllUsers().subscribe({
      next: (response) => {
        this.users = response.data.map(user => ({
          ...user,
          serviceName: this.services.find(s => s.id === user.service_id)?.name || 'Non attribué',
          role: this.mapRoleName(user.role),
          rawRole: user.role
        })).sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
          const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        this.filteredUsers = [...this.users];
        this.totalRecords = this.filteredUsers.length;
      },
      error: () => this.showError('Erreur lors du chargement des utilisateurs')
    });
  }

  applyFilter() {
    this.filteredUsers = this.users.filter(user => {
      const searchTerm = this.searchTerm.toLowerCase();
      const serviceName = (user.serviceName ?? '').toLowerCase();
      const role = (user.role || '').toLowerCase();
      const matchesStatus = !this.selectedRole || role === this.selectedRole.toLowerCase();
      const matchesSearch =
        !this.searchTerm ||
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm) ||
        serviceName.includes(searchTerm);

      return matchesStatus && matchesSearch;
    });

    this.totalRecords = this.filteredUsers.length;
    this.first = 0;
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

  loadRoles() {
    this.roleService.findAllRoles().subscribe({
      next: (response) => {
        this.roles = response.data.map(role => ({
          ...role,
          name: this.mapRoleName(role.name)
        }));
      },
      error: () => this.showError('Erreur lors du chargement des rôles')
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

  openCreateUser() {
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.drawerVisible.set(true);
  }

  editUser(user: User) {
    this.isEditMode = true;
    this.selectedUser = { ...user };
    this.userForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      tel: user.phoneNumber,
      email: user.email,
      role: user.role === this.mapRoleName(user.role) ? this.getBackendRoleName(user.role) : user.role, // Use backend role
      service: user.service_id || '',
      password: user.password
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.drawerVisible.set(true);
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

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const values = this.userForm.getRawValue();

    if (this.isEditMode && this.selectedUser?.id) {
      const updatedUser = {
        first_name: values.first_name,
        last_name: values.last_name,
        phoneNumber: values.tel,
        email: values.email,
        role: values.role, // Already the backend role value
        service_id: values.service || null
      };
      this.userService.updateUser(this.selectedUser.id, updatedUser).subscribe({
        next: () => {
          this.showSuccess('Utilisateur mis à jour avec succès');
          this.loadUsers();
          this.closeDrawer();
        },
        error: (err) => {
          this.showError(err.error?.message || 'Erreur lors de la mise à jour');
          this.loading.set(false);
        }
      });
    } else {
      const createUserRequest: CreateUserRequest = {
        first_name: values.first_name,
        last_name: values.last_name,
        phoneNumber: values.tel,
        email: values.email,
        password: values.password,
        role: values.role, // Already the backend role value
        service_id: values.service || undefined
      };
      this.authService.createUser(createUserRequest).subscribe({
        next: () => {
          this.showSuccess('Utilisateur créé avec succès');
          this.loadUsers();
          this.closeDrawer();
        },
        error: (err) => {
          this.showError(err.error?.message || 'Erreur lors de la création');
          this.loading.set(false);
        }
      });
    }
  }

  closeDrawer() {
    this.drawerVisible.set(false);
    this.userForm.reset();
    this.selectedUser = null;
    this.isEditMode = false;
    this.loading.set(false);
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
      accept: () => this.deleteUser(userId)
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
        this.loading.set(false);
      }
    });
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: message });
  }

  onPageChange(event: PaginatorState) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 10;
  }
}