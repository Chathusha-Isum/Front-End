import { Component } from '@angular/core';

import { Partlist } from '../../component/partlist/partlist';

@Component({
  selector: 'app-parts',
  imports: [Partlist],
  templateUrl: './parts.html',
  styleUrl: './parts.css',
})
export class Parts {}
