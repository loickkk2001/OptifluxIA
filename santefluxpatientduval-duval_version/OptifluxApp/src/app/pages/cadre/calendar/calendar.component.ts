import { Component, OnInit } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { UserService } from '../../../services/user/user.service';
import { ContratService } from '../../../services/contrat/contrat.service';
import { ServiceService } from '../../../services/service/service.service';
import { AuthService } from '../../../services/auth/auth.service';
import { User } from '../../../models/User';
import { Contrat, WorkDay } from '../../../services/contrat/contrat.service';
import { Service } from '../../../models/services';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-calendar',
  imports: [FullCalendarModule, CommonModule, ToastModule],
  providers: [MessageService],
  standalone: true,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    events: [],
    eventContent: this.customEventContent.bind(this),
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  };
  loggedInUser: User | null = null;
  users: User[] = [];
  userContrats: { [userId: string]: Contrat | null } = {};
  allServices: Service[] = [];

  constructor(
    private userService: UserService,
    private contratService: ContratService,
    private serviceService: ServiceService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadUserAndData();
  }

  loadUserAndData(): void {
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        if (user?._id) {
          this.loggedInUser = user;
          this.loadAllData();
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
      this.userService.findAllUsers(),
      this.serviceService.findAllServices()
    ]).subscribe({
      next: ([usersResponse, servicesResponse]) => {
        this.users = usersResponse.data || [];
        this.allServices = servicesResponse.data || [];
        this.loadContratsForUsers();
      },
      error: () => {
        this.showError('Échec du chargement des données');
      }
    });
  }

  loadContratsForUsers(): void {
    if (!this.loggedInUser?.service_id) {
      this.showError('Service de l\'utilisateur non défini');
      return;
    }

    // Filtrer les utilisateurs par service_id
    const filteredUsers = this.users.filter(
      user => user.service_id === this.loggedInUser?.service_id
    );

    if (filteredUsers.length === 0) {
      this.showInfo('Aucun utilisateur trouvé pour votre service');
      this.calendarOptions.events = [];
      return;
    }

    // Charger les contrats pour les utilisateurs filtrés
    filteredUsers.forEach(user => {
      const userId = user.id || user._id;
      if (userId) {
        this.contratService.getContratByUserId(userId).subscribe({
          next: (contrat) => {
            this.userContrats[userId] = contrat && contrat.data ? contrat.data : null;
            this.updateCalendarEvents();
          },
          error: () => {
            this.userContrats[userId] = null;
            this.updateCalendarEvents();
          }
        });
      }
    });
  }

  updateCalendarEvents(): void {
    const events: EventInput[] = [];
    const currentYear = new Date().getFullYear();

    // Filtrer à nouveau les utilisateurs par service_id pour plus de sécurité
    const filteredUsers = this.users.filter(
      user => user.service_id === this.loggedInUser?.service_id
    );

    filteredUsers.forEach(user => {
      const userId = user.id || user._id;
      if (!userId || !this.userContrats[userId]?.work_days) return;

      const contrat = this.userContrats[userId];
      contrat?.work_days.forEach((workDay: WorkDay) => {
        const dayOfWeek = this.getDayOfWeekIndex(workDay.day);
        if (dayOfWeek === -1) return;

        // Générer des événements pour chaque semaine de l'année en cours
        for (let month = 0; month < 12; month++) {
          const date = new Date(currentYear, month, 1);
          while (date.getMonth() === month) {
            if (date.getDay() === dayOfWeek) {
              const startDate = new Date(date);
              const [startHours, startMinutes] = workDay.start_time.split(':').map(Number);
              startDate.setHours(startHours, startMinutes, 0, 0);

              const endDate = new Date(date);
              const [endHours, endMinutes] = workDay.end_time.split(':').map(Number);
              endDate.setHours(endHours, endMinutes, 0, 0);

              events.push({
                title: `${user.first_name} ${user.last_name}`,
                start: startDate,
                end: endDate,
                allDay: false,
                extendedProps: {
                  user: `${user.first_name}`,
                  hours: `${workDay.start_time} - ${workDay.end_time}`
                }
              });
            }
            date.setDate(date.getDate() + 1);
          }
        }
      });
    });

    this.calendarOptions.events = events;
  }

  getDayOfWeekIndex(dayName: string): number {
    const daysMap: { [key: string]: number } = {
      'Lundi': 1,
      'Mardi': 2,
      'Mercredi': 3,
      'Jeudi': 4,
      'Vendredi': 5,
      'Samedi': 6,
      'Dimanche': 0
    };
    return daysMap[dayName] ?? -1;
  }

  customEventContent(arg: any) {
    const user = arg.event.extendedProps.user;
    const hours = arg.event.extendedProps.hours;

    return {
      html: `
        <div class="fc-event-content" style="display: flex; gap: 8px; align-items: center;">
          <span style="background-color: #3b82f6; color: #ffffff; padding: 2px 6px; border-radius: 4px;">${hours} ${user}</span>
        </div>
      `
    };
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
}