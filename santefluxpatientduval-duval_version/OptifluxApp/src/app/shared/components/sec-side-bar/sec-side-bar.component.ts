import { Component } from '@angular/core';
import {NavItem} from '../../../core/utils/interfaces/NavItem';
import {PrimeIcons} from 'primeng/api';
import {SideBarItemComponent} from '../side-bar-item/side-bar-item.component';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-sec-side-bar',
  imports: [AvatarModule, SideBarItemComponent],
  standalone : true,
  templateUrl: './sec-side-bar.component.html',
  styleUrl: './sec-side-bar.component.css'
})
export class SecSideBarComponent {
  items: NavItem[] = [
    {title: 'Accueil', link: '/sec', icon: PrimeIcons.HOME},
    {title: 'Personnel médical', link: '/sec/medical-staff', icon: PrimeIcons.BARS},
    //{title: 'Calendrier', link: '/sec/calendar', icon: PrimeIcons.CALENDAR},
    {title: 'Faire une demande', link: '/sec/report-absence', icon: PrimeIcons.INFO_CIRCLE},
    {title: 'Mes demandes', link: '/sec/asks', icon: PrimeIcons.CLIPBOARD},
  ]
  logoutItem: NavItem = { 
    title: 'Déconnexion', 
    link: '/logout', 
    icon: PrimeIcons.SIGN_OUT,
    isLogout: true
  };
}
