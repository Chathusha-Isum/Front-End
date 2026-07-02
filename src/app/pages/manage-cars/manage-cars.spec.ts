import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageCars } from './manage-cars';

describe('ManageCars', () => {
  let component: ManageCars;
  let fixture: ComponentFixture<ManageCars>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageCars],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageCars);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
