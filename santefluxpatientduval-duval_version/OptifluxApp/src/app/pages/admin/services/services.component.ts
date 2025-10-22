import { Component, signal, WritableSignal } from '@angular/core';
import { MessageService, SelectItem, ConfirmationService } from 'primeng/api';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { Drawer } from "primeng/drawer";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Select,  } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { ServiceService } from '../../../services/service/service.service';
import { PoleService } from '../../../services/pole/pole.service';
import { RoomService } from '../../../services/room/room.service';
import { SpecialityService } from '../../../services/speciality/speciality.service';
import { Service, Pole, Room, Speciality } from '../../../models/services';
import { UserService } from '../../../services/user/user.service';
import { User } from '../../../models/User';
import { IftaLabel } from 'primeng/iftalabel';
import { CreateServiceRequest, CreatePoleRequest, CreateRoomRequest, CreateSpecialityRequest } from '../../../dtos/request/CreateServiceRequest';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { FileUploadModule } from 'primeng/fileupload';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { CommonModule, NgForOf } from '@angular/common';
import { BadgeModule } from 'primeng/badge';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-services',
  imports: [
    Button,
    TableModule,
    Drawer,
    FormsModule,
    InputText,
    Select,
    MultiSelect,
    IftaLabel,
    ReactiveFormsModule,
    DialogModule,
    ToastModule,
    TabViewModule,
    FileUploadModule,
    CommonModule, BadgeModule, DropdownModule
  ],
  standalone: true,
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
  providers: [ConfirmationService, MessageService]
})

export class ServicesComponent {
  services!: Service[];
  rooms!: Room[];
  poles!: Pole[];
  specialities!: Speciality[];
  statuses!: SelectItem[];
  // Variables pour chaque formulaire
  serviceVisible: boolean = false;
  poleVisible: boolean = false;
  roomVisible: boolean = false;
  specialityVisible: boolean = false;
  // Variables pour les dialogues de suppression
  deleteServiceDialog: boolean = false;
  deletePoleDialog: boolean = false;
  deleteRoomDialog: boolean = false;
  deleteSpecialityDialog: boolean = false;
  value1: any = 1;
  value2: any = 1;
  value3: any = 1;
  cadreUsers!: User[];
  selectedResponsible!: string;
  serviceForm!: FormGroup;
  poleForm!: FormGroup;
  roomForm!: FormGroup;
  specialityForm!: FormGroup;
  loading = signal(false);
  isEditMode = false;
  currentServiceId: string | null = null;
  currentPoleId: string | null = null;
  currentRoomId: string | null = null;
  currentSpecialityId: string | null = null;
  serviceToDelete: Service | null = null;
  poleToDelete: Pole | null = null;
  roomToDelete: Room | null = null;
  specialityToDelete: Speciality | null = null;
  // variables for upload
  uploadDialogVisible: boolean = false;
  uploadType: string = '';
  uploadUrl: string = '';
  uploadedFiles: any[] = [];
  uploadProgress: number = 0;
  specialityOptions: SelectItem[] = [];

  // Ajoutez ces propriétés à votre classe
  activeTabIndex: number = 0; // Track the active tab
  filteredService: Service[] = [];
  filteredPole: Pole[] = [];
  filteredRoom: Room[] = [];
  filteredSpeciality: Speciality[] = [];
  searchTerm: string = '';
  selectedStatus: string = '';
  first: number = 0;
  rows: number = 10;
  totalRecords: number = 0;

  statusOptions = [
    { label: 'En cours', value: 'En cours' },
    { label: 'Réservé', value: 'Réservé' },
    { label: 'Disponible', value: 'Disponible' }
  ];


  constructor(
    private userService: UserService, 
    private serviceService: ServiceService, 
    private poleService: PoleService, 
    private roomService: RoomService, 
    private specialityService: SpecialityService, 
    private router: Router, 
    private fb: FormBuilder, 
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      head: ['', Validators.required],
    });

    this.poleForm = this.fb.group({
      name: ['', Validators.required],
      head: [''],
      specialities: [[]]
    });

    this.roomForm = this.fb.group({
      name: ['', Validators.required],
      localisation: [''],
      description: [''],
    });

    this.specialityForm = this.fb.group({
      name: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadServices();
    this.loadPoles();
    this.loadRooms();
    this.loadSpecialities();
    this.loadCadreUsers();

    // Initialiser les options de spécialités
    this.specialityService.findAllSpecialities().subscribe(data => {
        this.specialityOptions = data.data.map(spec => ({
            label: spec.name,
            value: spec.id
        }));
    });
  }

  loadServices() {
    this.serviceService.findAllServices().subscribe(data => {
      this.services = data.data.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredService = [...this.services]; // Initialize filtered array
      if (this.isActiveTab(0)) {
        this.applyFilter(); // Apply filter only if services tab is active
      }
    });
  }
  
  loadPoles() {
    this.poleService.findAllPoles().subscribe(polesData => {
      this.specialityService.findAllSpecialities().subscribe(specialitiesData => {
        const specialitiesMap = new Map<string, Speciality>();
        specialitiesData.data.forEach(spec => {
          specialitiesMap.set(spec.id, spec);
        });
  
        this.poles = polesData.data.map(pole => {
          const processedSpecialities = pole.specialities?.map(spec => {
            if (typeof spec === 'string') {
              return specialitiesMap.get(spec) || { id: spec, name: 'Inconnue' };
            }
            return spec;
          }) || [];
  
          return {
            ...pole,
            specialities: processedSpecialities
          };
        }).sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
          const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
  
        this.filteredPole = [...this.poles]; // Initialize filtered array
        if (this.isActiveTab(1)) {
          this.applyFilter(); // Apply filter only if poles tab is active
        }
      });
    });
  }
  
  loadRooms() {
    this.roomService.findAllRooms().subscribe(data => {
      this.rooms = data.data.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredRoom = [...this.rooms]; // Initialize filtered array
      if (this.isActiveTab(2)) {
        this.applyFilter(); // Apply filter only if rooms tab is active
      }
    });
  }
  
  loadSpecialities() {
    this.specialityService.findAllSpecialities().subscribe(data => {
      this.specialities = data.data.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      this.filteredSpeciality = [...this.specialities]; // Initialize filtered array
      if (this.isActiveTab(3)) {
        this.applyFilter(); // Apply filter only if specialities tab is active
      }
    });
  }

  // Modifiez votre méthode applyFilter() comme ceci :
  applyFilter() {
    const term = (this.searchTerm || '').toLowerCase();
  
    if (this.isActiveTab(0)) {
      // Filter Services
      this.filteredService = this.services.filter(service => {
        const name = (service.name || '').toLowerCase();
        const head = (service.head || '').toLowerCase();
        const matricule = (service.matricule || '').toLowerCase();
        return name.includes(term) || head.includes(term) || matricule.includes(term);
      });
    } else if (this.isActiveTab(1)) {
      // Filter Poles
      this.filteredPole = this.poles.filter(pole => {
        const name = (pole.name || '').toLowerCase();
        const head = (pole.head || '').toLowerCase();
        const matricule = (pole.matricule || '').toLowerCase();
        return name.includes(term) || head.includes(term) || matricule.includes(term);
      });
    } else if (this.isActiveTab(2)) {
      // Filter Rooms
      this.filteredRoom = this.rooms.filter(room => {
        const name = (room.name || '').toLowerCase();
        const localisation = (room.localisation || '').toLowerCase();
        const description = (room.description || '').toLowerCase();
        const matricule = (room.matricule || '').toLowerCase();
        const status = (room.status || '').toLowerCase();
        const matchesStatus = !this.selectedStatus || status === this.selectedStatus.toLowerCase();
        const matchesSearch =
          term === '' ||
          name.includes(term) ||
          localisation.includes(term) ||
          description.includes(term) ||
          matricule.includes(term);
        return matchesStatus && matchesSearch;
      });
    } else if (this.isActiveTab(3)) {
      // Filter Specialities
      this.filteredSpeciality = this.specialities.filter(spec => {
        const name = (spec.name || '').toLowerCase();
        const matricule = (spec.matricule || '').toLowerCase();
        return name.includes(term) || matricule.includes(term);
      });
    }
  
    this.updatePagination();
  }

  // Ajoutez cette méthode
  updatePagination() {
    switch (this.activeTabIndex) {
      case 0:
        this.totalRecords = this.filteredService.length;
        break;
      case 1:
        this.totalRecords = this.filteredPole.length;
        break;
      case 2:
        this.totalRecords = this.filteredRoom.length;
        break;
      case 3:
        this.totalRecords = this.filteredSpeciality.length;
        break;
      default:
        this.totalRecords = 0;
    }
    this.first = 0; // Reset to first page
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
  }

  isActiveTab(index: number): boolean {
    return this.activeTabIndex === index;
  }

  onTabChange(event: any) {
    this.activeTabIndex = event.index;
    this.applyFilter(); // Re-apply filter when tab changes
  }

  loadCadreUsers() {
    this.userService.findAllUsers().subscribe(data => {
      // Filtrer pour ne garder que les utilisateurs avec le rôle "cadre"
      this.cadreUsers = data.data.filter(user => user.role === 'cadre');
    });
  }

  showAddDialog() {
    this.isEditMode = false;
    this.serviceForm.reset();
    this.serviceVisible = true;
  }

  showAddDialogPole() {
    this.isEditMode = false;
    this.poleForm.reset();
    this.poleVisible = true;
  }

  showAddDialogRoom() {
    this.isEditMode = false;
    this.roomForm.reset();
    this.roomVisible = true;
  }

  showAddDialogSpeciality() {
    this.isEditMode = false;
    this.specialityForm.reset();
    this.specialityVisible = true;
  }

  showEditDialog(service: Service) {
    this.isEditMode = true;
    this.currentServiceId = service.id;
    
    // Trouver l'utilisateur cadre correspondant au responsable du service
    const selectedCadre = this.cadreUsers.find(user => user.first_name === service.head);
    
    if (!selectedCadre) {
      this.showError('Le responsable actuel n\'est pas un cadre ou n\'existe plus');
      return;
    }
    
    this.serviceForm.patchValue({
      name: service.name,
      head: selectedCadre || ''
    });
    
    this.serviceVisible = true;
  }

  showEditDialogPole(pole: Pole) {
    this.isEditMode = true;
    this.currentPoleId = pole.id;
    
    // Trouver l'utilisateur cadre correspondant au responsable du pole
    const selectedCadre = this.cadreUsers.find(user => user.first_name === pole.head);
  
    // Convertir les spécialités du pôle en tableau d'IDs
    const selectedSpecialities = pole.specialities?.map(spec => {
      // Si spec est déjà un string (ID), on le retourne tel quel
      if (typeof spec === 'string') {
        return spec;
      }
      // Sinon, on retourne l'ID de l'objet Speciality
      return spec.id;
    }) || [];
    
    this.poleForm.patchValue({
      name: pole.name,
      head: selectedCadre || '',
      specialities: selectedSpecialities
    });
    
    this.poleVisible = true;
  }

  showEditDialogRoom(room: Room) {
    this.isEditMode = true;
    this.currentRoomId = room.id;
    
    this.roomForm.patchValue({
      name: room.name,
      description: room.description || '',
      localisation: room.localisation || '',
      status: 'Disponible',
    });
    
    this.roomVisible = true;
  }

  showEditDialogSpeciality(speciality: Speciality) {
    this.isEditMode = true;
    this.currentSpecialityId = speciality.id;
    
    this.specialityForm.patchValue({
      name: speciality.name
    });
    
    this.specialityVisible = true;
  }

  onSubmit() {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const rawValues = this.serviceForm.getRawValue();
    const createServiceRequest: CreateServiceRequest = {
      name: rawValues.name,
      head: rawValues.head.first_name,
    };

    this.serviceService.createService(createServiceRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Service créé avec succès');
        this.serviceVisible = false;
        this.loadServices();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la création');
      }
    });
  }

  onSubmitPole() {
    if (this.poleForm.invalid) {
      this.poleForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const rawValues = this.poleForm.getRawValue();
    const createPoleRequest: CreatePoleRequest = {
      name: rawValues.name,
      head: rawValues.head?.first_name || '',
      specialities: rawValues.specialities || []
    };

    this.poleService.createPole(createPoleRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Pôle créé avec succès');
        this.poleVisible = false;
        this.loadPoles();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la création');
      }
    });
  }

  onSubmitRoom() {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const rawValues = this.roomForm.getRawValue();
    const createRoomRequest: CreateRoomRequest = {
      name: rawValues.name,
      localisation: rawValues.localisation,
      description: rawValues.description,
      status: 'Disponible',
    };

    this.roomService.createRoom(createRoomRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Chambre créé avec succès');
        this.roomVisible = false;
        this.loadRooms();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la création');
      }
    });
  }

  onSubmitSpeciality() {
    if (this.specialityForm.invalid) {
      this.specialityForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const rawValues = this.specialityForm.getRawValue();
    const createSpecialityRequest: CreateSpecialityRequest = {
      name: rawValues.name,
    };

    this.specialityService.createSpeciality(createSpecialityRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Specialité créé avec succès');
        this.specialityVisible = false;
        this.loadSpecialities();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la création');
      }
    });
  }

  updateService() {
    if (this.serviceForm.invalid || !this.currentServiceId) {
      this.showError('Formulaire invalide');
      return;
    }

    this.loading.set(true);
    const rawValues = this.serviceForm.getRawValue();
    const updateServiceRequest: CreateServiceRequest = {
      name: rawValues.name,
      head: rawValues.head.first_name,
    };

    this.serviceService.updateService(this.currentServiceId, updateServiceRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Service mis à jour avec succès');
        this.serviceVisible = false;
        this.loadServices();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la mise à jour');
      }
    });
  }

  updatePole() {
    if (this.poleForm.invalid || !this.currentPoleId) {
      this.showError('Formulaire invalide');
      return;
    }

    this.loading.set(true);
    const rawValues = this.poleForm.getRawValue();
    const updatePoleRequest: CreatePoleRequest = {
      name: rawValues.name,
      head: rawValues.head?.first_name || '',
      specialities: rawValues.specialities || []
    };

    this.poleService.updatePole(this.currentPoleId, updatePoleRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Pôle mis à jour avec succès');
        this.poleVisible = false;
        this.loadPoles();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la mise à jour');
      }
    });
  }

  updateRoom() {
    if (this.roomForm.invalid || !this.currentRoomId) {
      this.showError('Formulaire invalide');
      return;
    }

    this.loading.set(true);
    const rawValues = this.roomForm.getRawValue();
    const updateRoomRequest: CreateRoomRequest = {
      name: rawValues.name,
      localisation: rawValues.localisation,
      description: rawValues.description,
    };

    this.roomService.updateRoom(this.currentRoomId, updateRoomRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Chambre mis à jour avec succès');
        this.roomVisible = false;
        this.loadRooms();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la mise à jour');
      }
    });
  }

  updateSpeciality() {
    if (this.specialityForm.invalid || !this.currentSpecialityId) {
      this.showError('Formulaire invalide');
      return;
    }

    this.loading.set(true);
    const rawValues = this.specialityForm.getRawValue();
    const updateSpecialityRequest: CreateSpecialityRequest = {
      name: rawValues.name,
    };

    this.specialityService.updateSpeciality(this.currentSpecialityId, updateSpecialityRequest).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.showSuccess('Specialité mis à jour avec succès');
        this.specialityVisible = false;
        this.loadSpecialities();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la mise à jour');
      }
    });
  }


  confirmDelete(service: Service) {
    this.serviceToDelete = service;
    this.deleteServiceDialog = true;
  }

  confirmDeletePole(pole: Pole) {
    this.poleToDelete = pole;
    this.deletePoleDialog = true;
  }

  confirmDeleteRoom(room: Room) {
    this.roomToDelete = room;
    this.deleteRoomDialog = true;
  }

  confirmDeleteSpeciality(speciality: Speciality) {
    this.specialityToDelete = speciality;
    this.deleteSpecialityDialog = true;
  }

  deleteService() {
    if (!this.serviceToDelete) return;

    this.loading.set(true);
    this.serviceService.deleteService(this.serviceToDelete.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.showSuccess('Service supprimé avec succès');
        this.deleteServiceDialog = false;
        this.loadServices();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la suppression');
        this.deleteServiceDialog = false;
      }
    });
  }

  deletePole() {
    if (!this.poleToDelete) return;

    this.loading.set(true);
    this.poleService.deletePole(this.poleToDelete.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.showSuccess('Pôle supprimé avec succès');
        this.deletePoleDialog = false;
        this.loadPoles();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la suppression');
        this.deletePoleDialog = false;
      }
    });
  }

  deleteRoom() {
    if (!this.roomToDelete) return;

    this.loading.set(true);
    this.roomService.deleteRoom(this.roomToDelete.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.showSuccess('Chambre supprimé avec succès');
        this.deleteRoomDialog = false;
        this.loadRooms();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la suppression');
        this.deleteRoomDialog = false;
      }
    });
  }

  deleteSpeciality() {
    if (!this.specialityToDelete) return;

    this.loading.set(true);
    this.specialityService.deleteSpeciality(this.specialityToDelete.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.showSuccess('Specialité supprimé avec succès');
        this.deleteSpecialityDialog = false;
        this.loadSpecialities();
      },
      error: (error) => {
        this.loading.set(false);
        console.log(error);
        this.showError('Une erreur est survenue lors de la suppression');
        this.deleteSpecialityDialog = false;
      }
    });
  }

  getEndpointForType(type: string): string {
    switch(type) {
      case 'service': return 'services';
      case 'pole': return 'polls';
      case 'room': return 'rooms';
      case 'speciality': return 'speciality';
      default: return '';
    }
  }
  
  showUploadDialog(type: string) {
    this.uploadDialogVisible = true;
    this.uploadType = type;
    this.uploadUrl = `${environment.apiUrl}/${this.getEndpointForType(type)}/upload`;
  }
  
  onUpload(event: any) {
    for (let file of event.files) {
      this.uploadedFiles.push(file);
    }
  
    if (event.originalEvent instanceof HttpResponse) {
      this.messageService.add({severity: 'success', summary: 'Succès', detail: 'Fichier uploadé avec succès'});
      this.uploadDialogVisible = false;
      this.refreshData();
    }
  }
  
  onBeforeUpload(event: any) {
    event.xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
      if (e.lengthComputable) {
        this.uploadProgress = Math.round((e.loaded * 100) / e.total);
      }
    });
  }
  
  onUploadError(error: any) {
    this.messageService.add({severity: 'error', summary: 'Erreur', detail: 'Échec de l\'upload du fichier'});
    this.uploadProgress = 0;
  }
  
  refreshData() {
    switch(this.uploadType) {
      case 'service': this.loadServices(); break;
      case 'pole': this.loadPoles(); break;
      case 'room': this.loadRooms(); break;
      case 'speciality': this.loadSpecialities(); break;
    }
  }

  getBadgeSeverity(status: string): 'success' | 'danger' | 'secondary' {
    switch (status.toLowerCase()) {
      case 'disponible':
        return 'success';
      case 'indisponible':
      case 'réservé':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: message });
  }

  showError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: message });
  }
}