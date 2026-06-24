import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartDetails } from './part-details';

describe('PartDetails', () => {
  let component: PartDetails;
  let fixture: ComponentFixture<PartDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(PartDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
