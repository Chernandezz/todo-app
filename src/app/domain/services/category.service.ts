// domain/services/category.service.ts - Updated for Standalone
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { LocalStorageService } from './local-storage.service';
import { v4 as uuid } from 'uuid';

const CATEGORIES_KEY = 'task_categories';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private localStorageService = inject(LocalStorageService);
  private categories = new BehaviorSubject<Category[]>([]);
  categories$ = this.categories.asObservable();

  private defaultCategories: Category[] = [
    {
      id: 'default-1',
      name: 'Personal',
      color: '#3498db',
      icon: 'person-outline',
      createdAt: new Date(),
    },
    {
      id: 'default-2',
      name: 'Trabajo',
      color: '#e74c3c',
      icon: 'briefcase-outline',
      createdAt: new Date(),
    },
    {
      id: 'default-3',
      name: 'Hogar',
      color: '#2ecc71',
      icon: 'home-outline',
      createdAt: new Date(),
    },
  ];

  constructor() {
    this.loadCategories();
  }

  private async loadCategories() {
    try {
      // Try to load from Ionic Storage first
      const ionicCategories = await this.localStorageService.loadCategories();
      if (ionicCategories.length > 0) {
        this.categories.next(ionicCategories);
        return;
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(CATEGORIES_KEY);
      if (saved) {
        const categories = JSON.parse(saved).map((category: any) => ({
          ...category,
          createdAt: new Date(category.createdAt),
        }));
        this.categories.next(categories);
        // Migrate to Ionic Storage
        await this.localStorageService.saveCategories(categories);
      } else {
        // Load default categories
        this.categories.next(this.defaultCategories);
        await this.saveToStorage(this.defaultCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories.next(this.defaultCategories);
    }
  }

  private async saveToStorage(categories: Category[]) {
    try {
      // Save to both storages for redundancy
      await this.localStorageService.saveCategories(categories);
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Error saving categories:', error);
      // Fallback to localStorage only
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }
  }

  async addCategory(name: string, color: string, icon: string) {
    const newCategory: Category = {
      id: uuid(),
      name,
      color,
      icon,
      createdAt: new Date(),
    };
    const current = [...this.categories.getValue(), newCategory];
    this.categories.next(current);
    await this.saveToStorage(current);
  }

  async updateCategory(id: string, updates: Partial<Category>) {
    const updated = this.categories
      .getValue()
      .map((category) =>
        category.id === id ? { ...category, ...updates } : category
      );
    this.categories.next(updated);
    await this.saveToStorage(updated);
  }

  async deleteCategory(id: string) {
    const updated = this.categories
      .getValue()
      .filter((category) => category.id !== id);
    this.categories.next(updated);
    await this.saveToStorage(updated);
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories.getValue().find((category) => category.id === id);
  }

  getAllCategories(): Category[] {
    return this.categories.getValue();
  }

  // Backup and restore methods
  async exportCategories(): Promise<Category[]> {
    return this.categories.getValue();
  }

  async importCategories(categories: Category[]): Promise<void> {
    this.categories.next(categories);
    await this.saveToStorage(categories);
  }

  async resetToDefaults(): Promise<void> {
    this.categories.next(this.defaultCategories);
    await this.saveToStorage(this.defaultCategories);
  }

  async clearAllCategories(): Promise<void> {
    this.categories.next([]);
    await this.saveToStorage([]);
  }
}
