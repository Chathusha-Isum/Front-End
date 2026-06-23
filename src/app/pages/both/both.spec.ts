import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Both } from './both';

describe('Both', () => {
  let component: Both;
  let fixture: ComponentFixture<Both>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Both],
    }).compileComponents();

    fixture = TestBed.createComponent(Both);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
