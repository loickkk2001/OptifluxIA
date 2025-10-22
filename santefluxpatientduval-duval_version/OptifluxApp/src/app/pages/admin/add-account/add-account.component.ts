import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MenuItem} from 'primeng/api';
import {Breadcrumb} from 'primeng/breadcrumb';
import {Select} from 'primeng/select';
import {Password} from 'primeng/password';
import {Button} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../services/auth/auth.service';
import {CreateUserRequest} from '../../../dtos/request/CreateUserRequest';

@Component({
  selector: 'app-add-account',
  imports: [
    CommonModule,
    Breadcrumb,
    ReactiveFormsModule,
    Select,
    Password,
    Button,
    InputText
  ],
  standalone : true,
  templateUrl: './add-account.component.html',
  styleUrl: './add-account.component.css'
})
export class AddAccountComponent implements OnInit {
  items: MenuItem[] | undefined;
  adminForm!: FormGroup;
  roles: {name: string, value: string}[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.roles = [
      { name: 'Administrateur', value: 'admin' },
      { name: 'Cadre de santé', value: 'cadre' },
      { name: 'Médecin', value: 'doctor' },
      { name: 'Infirmier', value: 'nurse' }
    ];
    
    this.items = [
      { label: 'Compte' },
      { label: 'Créer un compte' },
    ];
    
    this.adminForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      re_password: ['', Validators.required],
      role: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const rePassword = form.get('re_password');
    
    if (password && rePassword && password.value !== rePassword.value) {
      rePassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (rePassword && rePassword.errors && rePassword.errors['passwordMismatch']) {
      delete rePassword.errors['passwordMismatch'];
      if (Object.keys(rePassword.errors).length === 0) {
        rePassword.setErrors(null);
      }
    }
    
    return null;
  }

  submit() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.adminForm.value;
    
    const createUserRequest: CreateUserRequest = {
      first_name: formValue.first_name,
      last_name: formValue.last_name,
      phoneNumber: formValue.phoneNumber,
      email: formValue.email,
      password: formValue.password,
      role: formValue.role,
      service_id: undefined
    };

    this.authService.createUser(createUserRequest).subscribe({
      next: (response) => {
        console.log('Utilisateur créé avec succès:', response);
        alert('Utilisateur créé avec succès !');
        this.adminForm.reset();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        alert('Erreur lors de la création de l\'utilisateur: ' + (error.error?.detail || error.message));
        this.loading = false;
      }
    });
  }
}
