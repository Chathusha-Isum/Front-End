import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Buyer } from './buyer';

describe('Buyer', () => {
  let component: Buyer;
  let fixture: ComponentFixture<Buyer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Buyer],
    }).compileComponents();

    fixture = TestBed.createComponent(Buyer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
