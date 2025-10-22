import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AbsenceService } from '../../../services/absence/absence.service';
import { UserService } from '../../../services/user/user.service';
import { ServiceService } from '../../../services/service/service.service';
import { Absence } from '../../../models/absence';
import { User } from '../../../models/User';
import { Service } from '../../../models/services';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';
import { BadgeModule } from 'primeng/badge';

interface City {
  name: string;
  code: string;
}

@Component({
  selector: 'app-treat-absence',
  imports: [CommonModule, FormsModule, ButtonModule, SelectModule, ToastModule, BadgeModule],
  providers: [MessageService],
  standalone: true,
  templateUrl: './treat-absence.component.html',
  styleUrls: ['./treat-absence.component.css']
})
export class TreatAbsenceComponent implements OnInit {
  absence: Absence | null = null;
  staff: User | null = null;
  replacement: User | null = null;
  service: Service | null = null;
  users: City[] = [];
  selectedUser: City | undefined;

  constructor(
    private absenceService: AbsenceService,
    private userService: UserService,
    private serviceService: ServiceService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const absenceId = this.route.snapshot.paramMap.get('id');
    console.log('TreatAbsenceComponent: Retrieved absenceId from route:', absenceId);
    if (absenceId) {
      this.loadAbsenceDetails(absenceId);
    } else {
      console.error('TreatAbsenceComponent: No absenceId provided');
      this.showError("ID de l'absence non fourni");
      this.router.navigate(['/cadre/absence']);
    }
  }

  loadAbsenceDetails(absenceId: string): void {
    console.log('Loading absence details for ID:', absenceId);
    forkJoin([
      this.absenceService.findAbsenceById(absenceId),
      this.userService.getNurses(),
      this.serviceService.findAllServices()
    ]).subscribe({
      next: ([absenceResponse, usersResponse, servicesResponse]) => {
        console.log('Absence API Response:', absenceResponse);
        console.log('Users API Response:', usersResponse);
        console.log('Services API Response:', servicesResponse);
        this.absence = absenceResponse.data || null;
        console.log('Assigned absence:', this.absence);
        const allUsers = usersResponse.data || [];
        const allServices = servicesResponse.data || [];
  
        if (this.absence && this.absence.id) {
          console.log('Valid absence found with ID:', this.absence.id);
          this.staff = allUsers.find(user => user.id === this.absence!.staff_id) || null;
          this.replacement = allUsers.find(user => user.id === this.absence!.replacement_id) || null;
          this.service = allServices.find(service => service.id === this.absence!.service_id) || null; 
          this.users = allUsers
            .filter(user => user.id)
            .map(user => ({
              name: `${user.first_name} ${user.last_name}`,
              code: user.id!
            }));
        } else {
          console.error('No valid absence or missing ID:', this.absence);
          this.showError('Absence non trouvée ou ID manquant');
          // Comment out redirect for debugging
          // this.router.navigate(['/cadre/absence']);
        }
      },
      error: (err) => {
        console.error('API error for absence ID:', absenceId, err);
        this.showError('Échec du chargement des détails de l’absence: ' + err.message);
        // Comment out redirect for debugging
        // this.router.navigate(['/cadre/absence']);
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('fr-FR');
  }

  getAbsenceDuration(): number {
    if (!this.absence?.start_date || !this.absence?.end_date) return 0;
    const start = new Date(this.absence.start_date);
    const end = new Date(this.absence.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

 /* assignReplacement(): void {
    if (!this.absence || !this.absence.id || !this.selectedUser) {
      this.showError('Veuillez sélectionner un remplaçant ou absence non valide');
      return;
    }
    const absenceId = this.absence.id;
    this.absenceService.updateAbsence(absenceId, this.absence.status || 'En attente', this.selectedUser.code)
      .subscribe({
        next: () => {
          this.showSuccess('Remplaçant assigné avec succès');
          this.loadAbsenceDetails(absenceId);
        },
        error: (err) => {
          console.error('Erreur lors de l’assignation:', err);
          this.showError('Échec de l’assignation du remplaçant');
        }
      });
  }*/
  
  approveAbsence(): void {
    if (!this.absence?.id) {
      this.showError('Aucune absence sélectionnée ou ID manquant');
      return;
    }
  
    const absenceId = this.absence.id; // Stocke l'ID dans une variable locale pour garantir qu'il est string
    const status = 'Validé par le cadre';
    const replacementId = this.selectedUser ? this.selectedUser.code : this.absence.replacement_id || null;
  
    this.absenceService.updateAbsence(absenceId, status, replacementId).subscribe({
      next: () => {
        this.showSuccess('Absence approuvée');
        this.loadAbsenceDetails(absenceId);
      },
      error: (err) => {
        console.error('Erreur lors de l’approbation:', err);
        this.showError('Échec de l’approbation de l’absence');
      }
    });
  }
  
  refuseAbsence(): void {
    if (!this.absence?.id) {
      this.showError('Aucune absence sélectionnée ou ID manquant');
      return;
    }
  
    const absenceId = this.absence.id; // Stocke l'ID dans une variable locale pour garantir qu'il est string
    const status = 'Refusé par le cadre';
    const replacementId = this.selectedUser ? this.selectedUser.code : this.absence.replacement_id || null;
  
    this.absenceService.updateAbsence(absenceId, status, replacementId).subscribe({
      next: () => {
        this.showSuccess('Absence refusée');
        this.loadAbsenceDetails(absenceId);
      },
      error: (err) => {
        console.error('Erreur lors du refus:', err);
        this.showError('Échec du refus de l’absence');
      }
    });
  }

  checkAvailability(): void {
    this.showInfo('Vérification de la disponibilité (fonctionnalité à implémenter)');
  }

  goBack(): void {
    this.router.navigate(['/cadre/absence']);
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: message
    });
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

  getBadgeSeverity(status: string): 'success' | 'info' | 'danger' | 'secondary' | 'warn'  {
    switch (status.toLowerCase()) {
      case 'accepté par le remplaçant':
        return 'warn';
      case 'validé par le cadre':
        return 'success';
      case 'en cours':
        return 'info';
      case 'refusé par le remplaçant':
      case 'refusé par le cadre':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}