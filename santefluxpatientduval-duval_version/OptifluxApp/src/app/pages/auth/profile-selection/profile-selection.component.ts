import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-profile-selection',
  standalone: true,
  imports: [NgClass],
  templateUrl: './profile-selection.component.html',
  styleUrls: ['./profile-selection.component.css']
})
export class ProfileSelectionComponent {
  isCadreSelected = signal(false);
  isSecSelected = signal(false);
  selectedRole: string | null = null;

  constructor(private router: Router) {}

  toggleCadreSelection(): void {
    this.isCadreSelected.set(true);
    this.isSecSelected.set(false);
    this.selectedRole = 'cadre';
  }

  toggleSecSelection(): void {
    this.isCadreSelected.set(false);
    this.isSecSelected.set(true);
    this.selectedRole = 'nurse';
  }

  continue(): void {
    if (this.selectedRole) {
      // Persist selected role in case user refreshes or navigation loses query params
      localStorage.setItem('selected_role', this.selectedRole);
      this.router.navigate(['/login'], { queryParams: { role: this.selectedRole } });
    }
  }
}