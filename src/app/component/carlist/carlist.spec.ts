import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Carlist } from './carlist';

describe('Carlist', () => {
  let component: Carlist;
  let fixture: ComponentFixture<Carlist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Carlist],
    }).compileComponents();

    fixture = TestBed.createComponent(Carlist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
