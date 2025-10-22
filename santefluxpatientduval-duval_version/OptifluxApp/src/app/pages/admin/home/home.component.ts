import { Component } from '@angular/core';
import {Card} from 'primeng/card';
import {TableModule} from 'primeng/table';
import {NgForOf} from '@angular/common';
import {UserService} from '../../../services/user/user.service';
import {User} from '../../../models/User';
import {Service} from '../../../models/services';
import {Room} from '../../../models/services';
import {Pole} from '../../../models/services';
import {Speciality} from '../../../models/services';
import {ServiceService} from '../../../services/service/service.service';
import {PoleService} from '../../../services/pole/pole.service';
import {RoomService} from '../../../services/room/room.service';
import {SpecialityService} from '../../../services/speciality/speciality.service';

@Component({
  selector: 'app-home',
  imports: [
    Card,
    TableModule,
    NgForOf,
  ],
  standalone : true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})

export class HomeComponent {
  cols: any[] = [
    { field: 'nom', header: 'Nom' },
    { field: 'prenom', header: 'Prenom' },
    { field: 'email', header: 'Email' },
    { field: 'téléphone', header: 'Téléphone' },
    { field: 'role', header: 'Role' }
  ];

  users: User[] = [];
  services: Service[] = [];
  rooms: Room[] = [];
  poles: Pole[] = [];
  specialities: Speciality[] = [];

  // Propriétés calculées pour chaque rôle
  get cadreCount(): number {
    return this.users.filter(user => user.role === 'cadre').length;
  }

  get nurseCount(): number {
    return this.users.filter(user => user.role === 'nurse').length;
  }

  get doctorCount(): number {
    return this.users.filter(user => user.role === 'doctor').length;
  }

  constructor(
    private userService: UserService, 
    private  serviceService: ServiceService,
    private  poleService: PoleService,
    private  roomService: RoomService,
    private  specialityService: SpecialityService) {
  }

  ngOnInit(): void {
    this.userService.findAllUsers().subscribe({
      next: (data) => {
        console.log('📊 Données utilisateurs reçues:', data);
        this.users = data.data.sort((a, b) => {
          // Gestion des dates undefined avec une valeur par défaut (par exemple, new Date(0))
          const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
          const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
          // Tri décroissant par date de création
          return dateB.getTime() - dateA.getTime();
        }) || [];
        console.log('👥 Utilisateurs chargés:', this.users);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      }
    });

    this.serviceService.findAllServices().subscribe({
      next: (data) => {
        console.log('🏥 Services reçus:', data);
        this.services = data.data || [];
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des services:', error);
      }
    });

    this.poleService.findAllPoles().subscribe({
      next: (data) => {
        console.log('🏢 Pôles reçus:', data);
        this.poles = data.data || [];
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des pôles:', error);
      }
    });

    this.roomService.findAllRooms().subscribe({
      next: (data) => {
        console.log('🚪 Salles reçues:', data);
        this.rooms = data.data || [];
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des salles:', error);
      }
    });

    this.specialityService.findAllSpecialities().subscribe({
      next: (data) => {
        console.log('🩺 Spécialités reçues:', data);
        this.specialities = data.data || [];
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des spécialités:', error);
      }
    });
  }
}
