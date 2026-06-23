import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Addpart } from './addpart';

describe('Addpart', () => {
  let component: Addpart;
  let fixture: ComponentFixture<Addpart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Addpart],
    }).compileComponents();

    fixture = TestBed.createComponent(Addpart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
