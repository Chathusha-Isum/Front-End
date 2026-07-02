import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelViewer } from './model-viewer';

describe('ModelViewer', () => {
  let component: ModelViewer;
  let fixture: ComponentFixture<ModelViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
