import { Routes } from '@angular/router';
import {ProfileSelectionComponent} from './pages/auth/profile-selection/profile-selection.component';
import {LoginComponent} from './pages/auth/login/login.component';
import {ForgotPasswordComponent} from './pages/auth/forgot-password/forgot-password.component';
import {SecretaireLayoutComponent} from './core/layout/secretaire-layout/secretaire-layout.component';
import {AdminLayoutComponent} from './core/layout/admin-layout/admin-layout.component';
import {CadreLayoutComponent} from './core/layout/cadre-layout/cadre-layout.component';
import {AddAccountComponent} from './pages/admin/add-account/add-account.component';
import {AddServicesComponent} from './pages/admin/add-services/add-services.component';
import {HomeComponent} from './pages/admin/home/home.component';
import {UsersComponent} from './pages/admin/users/users.component';
import {ServicesComponent} from './pages/admin/services/services.component';
import {HoursComponent} from './pages/admin/hours/hours.component';
import {CalendarComponent} from './pages/cadre/calendar/calendar.component';
import {MedicalStaffComponent} from './pages/cadre/medical-staff/medical-staff.component';
import {TreatAbsenceComponent} from './pages/cadre/treat-absence/treat-absence.component';
import {AbsencesComponent} from './pages/cadre/absences/absences.component';
import {ConfigComponent} from './pages/cadre/config/config.component';
import {BoxReservationComponent} from './pages/cadre/box-reservation/box-reservation.component';
import {CadreHomeComponent} from './pages/cadre/cadre-home/cadre-home.component';
import {SecHomeComponent} from './pages/secretaire/sec-home/sec-home.component';
import {SecCalendarComponent} from './pages/secretaire/sec-calendar/sec-calendar.component';
import {SecMedicalStaffComponent} from './pages/secretaire/sec-medical-staff/sec-medical-staff.component';
import {ReportAbsenceComponent} from './pages/secretaire/report-absence/report-absence.component';
import {AsksComponent} from './pages/secretaire/asks/asks.component';
import { AuthGuard } from './guards/authGuard/auth-guard.service';

export const routes: Routes = [
  {path: '', component: ProfileSelectionComponent},
  {path : 'login' , component : LoginComponent},
  {path : 'forgot' , component : ForgotPasswordComponent},
  {path : 'sec' , component : SecretaireLayoutComponent, canActivate: [AuthGuard], children : [
      {path : '', component: SecHomeComponent},
      {path : 'calendar', component: SecCalendarComponent},
      {path : 'asks', component: AsksComponent},
      {path : 'medical-staff', component: SecMedicalStaffComponent},
      {path : 'report-absence', component: ReportAbsenceComponent},
    ]},
  {path : 'admin' , component : AdminLayoutComponent, canActivate: [AuthGuard], children : [
      {path: '', component: HomeComponent},
      {path: 'hours', component: HoursComponent},
      {path: 'services', component: ServicesComponent},
      {path: 'users', component: UsersComponent},
      {path : 'add-account', component : AddAccountComponent},
      {path : 'add-service', component : AddServicesComponent},
    ]},
  {path : 'cadre' , component : CadreLayoutComponent, canActivate: [AuthGuard], children : [
      {path : '', component: CadreHomeComponent},
      {path : 'calendar', component: CalendarComponent},
      {path : 'configuration', component: ConfigComponent},
      {path : 'reservation', component: AbsencesComponent},
      {path : 'medical-staff', component: MedicalStaffComponent},
      {path : 'reservation-box', component: BoxReservationComponent},
      {path : 'treat-absence/:id', component: TreatAbsenceComponent},
    ]},
];
