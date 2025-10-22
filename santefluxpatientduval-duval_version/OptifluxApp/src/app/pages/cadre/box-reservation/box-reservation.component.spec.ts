import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxReservationComponent } from './box-reservation.component';

describe('BoxReservationComponent', () => {
  let component: BoxReservationComponent;
  let fixture: ComponentFixture<BoxReservationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxReservationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxReservationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
