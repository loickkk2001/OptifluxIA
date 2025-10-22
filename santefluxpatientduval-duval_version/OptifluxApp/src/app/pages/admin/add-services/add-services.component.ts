import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Breadcrumb} from 'primeng/breadcrumb';
import {MultiSelect} from 'primeng/multiselect';
import {MenuItem} from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';
import {Select} from 'primeng/select';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {User} from '../../../models/User';
import {UserService} from '../../../services/user/user.service';
import {ServiceService} from '../../../services/service/service.service';
import {CreateServiceRequest} from '../../../dtos/request/CreateServiceRequest';

@Component({
  selector: 'app-add-services',
  imports: [
    Select,
    Button,
    InputText,
    FormsModule,
    Breadcrumb,
    ReactiveFormsModule,
    MultiSelect,
    MultiSelectModule
  ],
  standalone : true,
  templateUrl: './add-services.component.html',
  styleUrl: './add-services.component.css'
})
export class AddServicesComponent implements OnInit {
  users: User[] = [];
  items: MenuItem[] | undefined;
  adminForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private serviceService: ServiceService
  ) {}

  ngOnInit() {
    this.items = [
      { label: 'Service' },
      { label: 'Créer un service' },
    ];
    
    this.adminForm = this.fb.group({
      name: ['', Validators.required],
      head: ['', Validators.required],
      members: [[]]
    });

    // Charger les utilisateurs cadres
    this.loadCadreUsers();
  }

  loadCadreUsers() {
    console.log('🔍 Chargement des utilisateurs cadres...');
    this.userService.findAllUsers().subscribe({
      next: (data) => {
        console.log('📊 Tous les utilisateurs:', data.data);
        // Filtrer les utilisateurs avec le rôle "cadre"
        this.users = data.data.filter(user => user.role === 'cadre');
        console.log('👨‍💼 Utilisateurs cadres filtrés:', this.users);
        console.log('🔍 Rôles trouvés:', data.data.map(u => u.role));
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement:', error);
      }
    });
  }

  submit() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const formValue = this.adminForm.value;
    
    const createServiceRequest: CreateServiceRequest = {
      name: formValue.name,
      head: formValue.head.id || formValue.head.first_name
    };

    this.serviceService.createService(createServiceRequest).subscribe({
      next: (response) => {
        console.log('Service créé avec succès:', response);
        // Réinitialiser le formulaire
        this.adminForm.reset();
      },
      error: (error) => {
        console.error('Erreur lors de la création du service:', error);
      }
    });
  }
}
