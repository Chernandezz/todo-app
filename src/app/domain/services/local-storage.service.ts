// services/local-storage.service.ts
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Task } from '../../core/models/task.model';
import { Category } from '../../core/models/category.model';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private storageInitialized = false;

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    if (!this.storageInitialized) {
      await this.storage.create();
      this.storageInitialized = true;
    }
  }

  // Tasks Storage Methods
  async saveTasks(tasks: Task[]): Promise<void> {
    await this.ensureStorageReady();
    await this.storage.set('tasks', JSON.stringify(tasks));
  }

  async loadTasks(): Promise<Task[]> {
    await this.ensureStorageReady();
    const data = await this.storage.get('tasks');
    if (!data) return [];

    try {
      const tasks = JSON.parse(data);
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      }));
    } catch (error) {
      console.error('Error parsing tasks from storage:', error);
      return [];
    }
  }

  async clearTasks(): Promise<void> {
    await this.ensureStorageReady();
    await this.storage.remove('tasks');
  }

  // Categories Storage Methods
  async saveCategories(categories: Category[]): Promise<void> {
    await this.ensureStorageReady();
    await this.storage.set('categories', JSON.stringify(categories));
  }

  async loadCategories(): Promise<Category[]> {
    await this.ensureStorageReady();
    const data = await this.storage.get('categories');
    if (!data) return [];

    try {
      const categories = JSON.parse(data);
      return categories.map((category: any) => ({
        ...category,
        createdAt: new Date(category.createdAt),
      }));
    } catch (error) {
      console.error('Error parsing categories from storage:', error);
      return [];
    }
  }

  async clearCategories(): Promise<void> {
    await this.ensureStorageReady();
    await this.storage.remove('categories');
  }

  // Settings Storage Methods
  async saveSetting<T>(key: string, value: T): Promise<void> {
    await this.ensureStorageReady();
    await this.storage.set(`setting_${key}`, JSON.stringify(value));
  }

  async loadSetting<T>(key: string, defaultValue: T): Promise<T> {
    await this.ensureStorageReady();
    const data = await this.storage.get(`setting_${key}`);
    if (!data) return defaultValue;

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error parsing setting ${key} from storage:`, error);
      return defaultValue;
    }
  }

  async removeSetting(key: string): Promise<void> {
    await this.ensureStorageReady();
    await this.storage.remove(`setting_${key}`);
  }

  // Backup and Restore Methods
  async exportData(): Promise<{ tasks: Task[]; categories: Category[] }> {
    await this.ensureStorageReady();
    const tasks = await this.loadTasks();
    const categories = await this.loadCategories();
    return { tasks, categories };
  }

  async importData(data: {
    tasks?: Task[];
    categories?: Category[];
  }): Promise<void> {
    await this.ensureStorageReady();

    if (data.categories) {
      await this.saveCategories(data.categories);
    }

    if (data.tasks) {
      await this.saveTasks(data.tasks);
    }
  }

  async clearAllData(): Promise<void> {
    await this.ensureStorageReady();
    await this.clearTasks();
    await this.clearCategories();

    // Clear all settings
    const keys = await this.storage.keys();
    const settingKeys = keys.filter((key) => key.startsWith('setting_'));
    for (const key of settingKeys) {
      await this.storage.remove(key);
    }
  }

  // Storage Info Methods
  async getStorageInfo(): Promise<{
    totalKeys: number;
    tasksCount: number;
    categoriesCount: number;
  }> {
    await this.ensureStorageReady();
    const keys = await this.storage.keys();
    const tasks = await this.loadTasks();
    const categories = await this.loadCategories();

    return {
      totalKeys: keys.length,
      tasksCount: tasks.length,
      categoriesCount: categories.length,
    };
  }

  // Private helper method
  private async ensureStorageReady(): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }
  }
}
