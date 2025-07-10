// domain/services/task.service.ts - Updated for Standalone
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../../core/models/task.model';
import { LocalStorageService } from './local-storage.service';
import { v4 as uuid } from 'uuid';

const TASKS_KEY = 'tasks';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private localStorageService = inject(LocalStorageService);
  private tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasks.asObservable();

  constructor() {
    this.loadTasks();
  }

  private async loadTasks() {
    try {
      // Try to load from Ionic Storage first
      const ionicTasks = await this.localStorageService.loadTasks();
      if (ionicTasks.length > 0) {
        this.tasks.next(ionicTasks);
        return;
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(TASKS_KEY);
      if (saved) {
        const tasks = JSON.parse(saved).map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          completedAt: task.completedAt
            ? new Date(task.completedAt)
            : undefined,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));
        this.tasks.next(tasks);
        // Migrate to Ionic Storage
        await this.localStorageService.saveTasks(tasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.tasks.next([]);
    }
  }

  private async saveToStorage(tasks: Task[]) {
    try {
      // Save to both storages for redundancy
      await this.localStorageService.saveTasks(tasks);
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
      // Fallback to localStorage only
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  }

  async addTask(
    title: string,
    categoryId: string,
    description?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    dueDate?: Date
  ) {
    const newTask: Task = {
      id: uuid(),
      title,
      description,
      completed: false,
      categoryId,
      priority,
      createdAt: new Date(),
      dueDate,
    };
    const current = [...this.tasks.getValue(), newTask];
    this.tasks.next(current);
    await this.saveToStorage(current);
  }

  async updateTask(id: string, updates: Partial<Task>) {
    const updated = this.tasks
      .getValue()
      .map((task) => (task.id === id ? { ...task, ...updates } : task));
    this.tasks.next(updated);
    await this.saveToStorage(updated);
  }

  async toggleTask(id: string) {
    const updated = this.tasks.getValue().map((task) =>
      task.id === id
        ? {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date() : undefined,
          }
        : task
    );
    this.tasks.next(updated);
    await this.saveToStorage(updated);
  }

  async deleteTask(id: string) {
    const updated = this.tasks.getValue().filter((task) => task.id !== id);
    this.tasks.next(updated);
    await this.saveToStorage(updated);
  }

  getTasksByCategory(categoryId: string): Task[] {
    return this.tasks
      .getValue()
      .filter((task) => task.categoryId === categoryId);
  }

  getTasksByPriority(priority: 'low' | 'medium' | 'high'): Task[] {
    return this.tasks.getValue().filter((task) => task.priority === priority);
  }

  getCompletedTasks(): Task[] {
    return this.tasks.getValue().filter((task) => task.completed);
  }

  getPendingTasks(): Task[] {
    return this.tasks.getValue().filter((task) => !task.completed);
  }

  getAllTasks(): Task[] {
    return this.tasks.getValue();
  }

  getTaskStats() {
    const tasks = this.tasks.getValue();
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };
  }

  // Backup and restore methods
  async exportTasks(): Promise<Task[]> {
    return this.tasks.getValue();
  }

  async importTasks(tasks: Task[]): Promise<void> {
    this.tasks.next(tasks);
    await this.saveToStorage(tasks);
  }

  async clearAllTasks(): Promise<void> {
    this.tasks.next([]);
    await this.saveToStorage([]);
  }
}
