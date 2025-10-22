import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth/auth.service';
import { User } from '../../../models/User';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [AvatarModule, MenuModule, DialogModule, CommonModule, BadgeModule],
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.css'],
})
export class TopBarComponent implements OnInit {
  today: Date = new Date();
  userRole: string | null = null;
  userName: string | null = null;
  menuItems: MenuItem[] = [];
  displayProfileModal: boolean = false;
  user: User | null = null;
  unreadNotificationsCount: number = 0; // Initial value, update this from your service

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Check if user data is already available
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.setUserData(currentUser);
    }

    // Subscribe to user changes
    this.authService.getUserInfo().subscribe({
      next: (user: User | null) => {
        console.log('User info received in TopBar:', user);
        if (user) {
          this.setUserData(user);
        } else {
          console.log('No user data available');
          this.user = null;
          this.userRole = null;
          this.userName = null;
          this.menuItems = [];
          this.router.navigate(['/']); // Redirect to login if no user data
        }
      },
      error: (err) => {
        console.error('Error fetching user info in TopBar:', err);
        this.user = null;
        this.userRole = null;
        this.userName = null;
        this.menuItems = [];
        this.router.navigate(['/']);
      }
    });
  }

  private setUserData(user: User) {
    this.user = user;
    switch (user.role) {
      case 'admin':
        this.userRole = 'Administrateur';
        break;
      case 'cadre':
        this.userRole = 'Cadre de Santé';
        break;
      case 'nurse':
        this.userRole = 'Secrétaire';
        break;
      default:
        this.userRole = 'Utilisateur';
    }
    this.userName = user.first_name && user.last_name
      ? `${user.first_name.charAt(0).toUpperCase()}${user.last_name.charAt(0).toUpperCase()}`
      : 'N/A';

    this.menuItems = [
      { label: 'Profil', icon: 'pi pi-user', command: () => this.showProfile() },
    ];
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Erreur lors de la déconnexion', err);
        this.router.navigate(['/']);
      }
    });
  }

  showProfile() {
    this.displayProfileModal = true;
  }

  closeProfileModal() {
    this.displayProfileModal = false;
  }

  showNotifications() {
    // Implémentez la logique pour afficher les notifications
    console.log('Afficher les notifications');
    // Vous pourriez ouvrir un menu déroulant ou une modal
  }
}