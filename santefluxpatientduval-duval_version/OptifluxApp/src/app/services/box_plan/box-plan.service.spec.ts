import { TestBed } from '@angular/core/testing';

import { BoxPlanService } from './box-plan.service';

describe('BoxPlanService', () => {
  let service: BoxPlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BoxPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
