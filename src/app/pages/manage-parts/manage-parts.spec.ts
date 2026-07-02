import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageParts } from './manage-parts';

describe('ManageParts', () => {
  let component: ManageParts;
  let fixture: ComponentFixture<ManageParts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageParts],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageParts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
