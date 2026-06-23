import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Partlist } from './partlist';

describe('Partlist', () => {
  let component: Partlist;
  let fixture: ComponentFixture<Partlist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Partlist],
    }).compileComponents();

    fixture = TestBed.createComponent(Partlist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
