// notification.service.ts
import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user/user.service';
import { BoxPlan } from '../../models/box_plan';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private checkInterval = 60000; // Vérifie toutes les minutes

  constructor(
    private messageService: MessageService,
    private userService: UserService
  ) {}

  startMonitoringReservations(reservations: BoxPlan[]) {
    setInterval(() => {
      this.checkUpcomingReservations(reservations);
    }, this.checkInterval);
  }

  private checkUpcomingReservations(reservations: BoxPlan[]) {
    const now = new Date();
    
    reservations.forEach(reservation => {
      if (reservation.status !== 'Réservé') return;

      try {
        /*const endTime = this.calculateEndTime(
          reservation[0].period,
          reservation[0].consultation_number,
          reservation[0].consultation_time
        );*/

        const endTime = this.calculateEndTime(
                reservation.period, 
                reservation.consultation_number, 
                reservation.consultation_time
              );
        
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const endDate = new Date(reservation.date);
        endDate.setHours(endHours, endMinutes);
        
        const diffMinutes = (endDate.getTime() - now.getTime()) / (1000 * 60);
        
        if (diffMinutes > 0 && diffMinutes <= 10) {
          this.sendNotification(reservation);
        }
      } catch (e) {
        console.error('Error checking reservation:', reservation.id, e);
      }
    });
  }

  /*private calculateEndTime(startTime: string, consultationNumber: number, consultationTime: number): string {
    const [hoursStr, minutesStr] = startTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    const totalMinutes = consultationNumber * consultationTime;
    const endDate = new Date();
    endDate.setHours(hours, minutes + totalMinutes);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }*/

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

  private sendNotification(reservation: BoxPlan) {
    this.userService.findUserById(reservation.staff_id).subscribe(user => {
      if (user) {
        const message = `La réservation de la salle ${reservation.room} se termine dans moins de 10 minutes`;
        
        // Notification toast
        this.messageService.add({
          severity: 'warn',
          summary: 'Fin de réservation proche',
          detail: message,
          life: 10000
        });
        
        // Ici vous pourriez ajouter d'autres canaux de notification :
        // - Email
        // - Notification push
        // - SMS
      }
    });
  }
}