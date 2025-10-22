import { Component } from '@angular/core';
import { NavItem } from '../../../core/utils/interfaces/NavItem';
import { SideBarItemComponent } from '../side-bar-item/side-bar-item.component';
import { PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-cadre-side-bar',
  imports: [AvatarModule,SideBarItemComponent],
  standalone : true,
  templateUrl: './cadre-side-bar.component.html',
  styleUrl: './cadre-side-bar.component.css'
})
export class CadreSideBarComponent {
  items: NavItem[] = [
    {title: 'Accueil', link: '/cadre', icon: PrimeIcons.HOME},
    {title: 'Personnel médical', link: '/cadre/medical-staff', icon: PrimeIcons.CLIPBOARD},
    {title: 'Planning box', link: '/cadre/reservation-box', icon: PrimeIcons.BOX},
    {title: 'Calendrier', link: '/cadre/calendar', icon: PrimeIcons.CALENDAR},
    {title: 'Reservation', link: '/cadre/reservation', icon: PrimeIcons.INFO_CIRCLE},
  ] 
  configItem: NavItem = { 
    title: 'Configuration', 
    link: '/cadre/configuration', 
    icon: PrimeIcons.COG,
  };
  logoutItem: NavItem = { 
    title: 'Déconnexion', 
    link: '/logout', 
    icon: PrimeIcons.SIGN_OUT,
    isLogout: true
  };
}
