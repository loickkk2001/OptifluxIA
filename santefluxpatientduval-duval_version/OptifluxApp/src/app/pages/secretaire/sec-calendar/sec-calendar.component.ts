import { Component } from '@angular/core';
import {FullCalendarModule} from '@fullcalendar/angular';
import {HttpClient} from '@angular/common/http';
import {CalendarOptions} from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid';

@Component({
  selector: 'app-sec-calendar',
  imports: [FullCalendarModule],
  standalone : true,
  templateUrl: './sec-calendar.component.html',
  styleUrl: './sec-calendar.component.css',
})
export class SecCalendarComponent {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    defaultAllDay :true,
    events: [],
  };
  programs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadPrograms();
  }

  loadPrograms() {
    this.http.get('./assets/program.json') // Assuming your JSON file is in the 'assets' folder
      .subscribe((data: any) => {
        this.programs = data.programs;
        this.calendarOptions.events = this.generateEvents();
      });
  }

  generateEvents(): any[] {
    const events: any[] = [];

    if (this.programs && this.programs.length > 0) {
      this.programs.forEach((program) => {
        for (const month in program.data) {
          for (const day in program.data[month]) {
            const event: any = {
              title: program.data[month][day].plan,
              start: new Date(`${month}-${day}-${new Date().getFullYear()}`), // Construct a full date
            };
            console.log(new Date(`${month}-${day}-${new Date().getFullYear()}`));
            events.push(event);
          }
        }
      });
    }

    return events;
  }
}

