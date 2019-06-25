import { Component, OnInit } from '@angular/core';
import { TaskI } from '../models/task.interface';
import { TodoService } from '../service/todo.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  todos: TaskI[];
  constructor(private todosService: TodoService) {}

  ngOnInit() {
    this.todosService.getTodos().subscribe( res => {
      console.log('Tareas', res);
    });
  }

}
