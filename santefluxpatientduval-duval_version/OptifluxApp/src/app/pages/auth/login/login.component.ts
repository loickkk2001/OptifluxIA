import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service'; // Créez ce service
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputText],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  role: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.role = params['role'] || null;
      if (!this.role) {
        // Fallback to persisted role if query param is missing
        const storedRole = localStorage.getItem('selected_role');
        this.role = storedRole ? storedRole : null;
      }
    });
  }

  connect(): void {
    if (this.loginForm.valid && this.role) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password, this.role).subscribe({
        next: (response) => {
          console.log('Connexion réussie', response);
          // Clear the persisted role once login succeeds
          localStorage.removeItem('selected_role');
          const user = this.authService.getCurrentUser();
          console.log('Utilisateur connecté:', user);
          if (user && user.role) {
            switch (user.role) {
              case 'admin':
                this.router.navigate(['/admin']);
                break;
              case 'cadre':
                this.router.navigate(['/cadre']);
                break;
              case 'nurse':
                this.router.navigate(['/sec']);
                break;
              default:
                console.error('Rôle non reconnu:', user.role);
                alert('Rôle non reconnu');
            }
          } else {
            console.error('Rôle non trouvé dans les données utilisateur');
            alert('Erreur: Rôle non défini');
          }
        },
        error: (err) => {
          console.error('Erreur de connexion', err);
          alert('Identifiants incorrects ou rôle non valide');
        }
      });
    } else {
      alert('Veuillez remplir tous les champs et sélectionner un rôle');
    }
  }

  back(): void {
    this.router.navigate(['/']); // Redirige vers la page de sélection des profils
  }

  forgot(): void {
    this.router.navigate(['/forgot']); // Redirige vers la page de mot de passe oublié
  }
}