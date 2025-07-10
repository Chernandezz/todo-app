// tasks.page.ts - Improved with better UX methods
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { TaskService } from '@domain/services/task.service';
import { CategoryService } from '@domain/services/category.service';
import { Task } from '@core/models/task.model';
import { Category } from '@core/models/category.model';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tasks',
  standalone: true,
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  imports: [CommonModule, IonicModule, FormsModule],
})
export class TasksPage implements OnInit, OnDestroy {
  @ViewChild('taskInput') taskInput!: ElementRef;

  private destroy$ = new Subject<void>();

  // Observables
  tasks$: Observable<Task[]>;
  categories$: Observable<Category[]>;

  // Data arrays
  filteredTasks: Task[] = [];
  categories: Category[] = [];

  // Form variables
  newTaskTitle = '';
  newTaskDescription = '';
  selectedCategoryId = '';
  selectedPriority: 'low' | 'medium' | 'high' = 'medium';
  showAdvancedForm = false;

  // Filter variables
  selectedFilter: 'all' | 'pending' | 'completed' = 'all';
  selectedCategoryFilter = '';

  // Modal variables
  showCategoryModal = false;
  newCategoryName = '';
  newCategoryColor = '#667eea';
  newCategoryIcon = 'folder';

  // Edit task
  editingTask: Task | null = null;

  constructor(
    private taskService: TaskService,
    private categoryService: CategoryService
  ) {
    this.tasks$ = this.taskService.tasks$;
    this.categories$ = this.categoryService.categories$;
  }

  ngOnInit(): void {
    this.loadData();
    this.initializeDefaults();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeDefaults(): void {
    // Set first category as default when categories load
    this.categories$.pipe(takeUntil(this.destroy$)).subscribe((categories) => {
      if (categories.length > 0 && !this.selectedCategoryId) {
        this.selectedCategoryId = categories[0].id;
      }
    });
  }

  private loadData(): void {
    // Load categories
    this.categories$.pipe(takeUntil(this.destroy$)).subscribe((categories) => {
      this.categories = categories;
    });

    // Combine tasks and apply filters
    combineLatest([this.tasks$, this.categories$])
      .pipe(
        takeUntil(this.destroy$),
        map(([tasks, categories]) => {
          return this.applyFilters(tasks);
        })
      )
      .subscribe((filteredTasks) => {
        this.filteredTasks = filteredTasks;
      });
  }

  private applyFilters(tasks: Task[]): Task[] {
    let filtered = [...tasks];

    // Apply status filter
    switch (this.selectedFilter) {
      case 'pending':
        filtered = filtered.filter((task) => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter((task) => task.completed);
        break;
      // 'all' doesn't need filtering
    }

    // Apply category filter
    if (this.selectedCategoryFilter) {
      filtered = filtered.filter(
        (task) => task.categoryId === this.selectedCategoryFilter
      );
    }

    // Sort by priority and creation date
    return filtered.sort((a, b) => {
      // First sort by completion status (pending first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Then by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Finally by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  // Task Management
  async addTask(): Promise<void> {
    if (this.newTaskTitle.trim() && this.selectedCategoryId) {
      if (this.editingTask) {
        // Update existing task
        await this.taskService.updateTask(this.editingTask.id, {
          title: this.newTaskTitle.trim(),
          description: this.newTaskDescription.trim() || undefined,
          categoryId: this.selectedCategoryId,
          priority: this.selectedPriority,
        });
      } else {
        // Create new task
        await this.taskService.addTask(
          this.newTaskTitle.trim(),
          this.selectedCategoryId,
          this.newTaskDescription.trim() || undefined,
          this.selectedPriority
        );
      }
      this.resetForm();
    }
  }

  async toggleTask(id: string): Promise<void> {
    await this.taskService.toggleTask(id);
  }

  async deleteTask(id: string): Promise<void> {
    // Simple confirmation
    const confirmed = confirm('¿Estás seguro de eliminar esta tarea?');
    if (confirmed) {
      await this.taskService.deleteTask(id);
    }
  }

  editTask(task: Task): void {
    this.editingTask = task;
    this.newTaskTitle = task.title;
    this.newTaskDescription = task.description || '';
    this.selectedCategoryId = task.categoryId;
    this.selectedPriority = task.priority;
    this.showAdvancedForm = true;

    // Scroll to form
    setTimeout(() => {
      const element = document.querySelector('.quick-add-card');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  private resetForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.selectedPriority = 'medium';
    this.showAdvancedForm = false;
    this.editingTask = null;
  }

  toggleAdvancedForm(): void {
    this.showAdvancedForm = !this.showAdvancedForm;
  }

  focusOnInput(): void {
    setTimeout(() => {
      const inputElement = document.querySelector(
        '.main-input input'
      ) as HTMLInputElement;
      inputElement?.focus();
    }, 100);
  }

  // Filter Management
  onFilterChange(): void {
    this.loadData();
  }

  selectCategoryFilter(categoryId: string): void {
    this.selectedCategoryFilter = categoryId;
    this.loadData();
  }

  // Category Management
  openCategoryModal(): void {
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.resetCategoryForm();
  }

  async addCategory(): Promise<void> {
    if (this.newCategoryName.trim()) {
      await this.categoryService.addCategory(
        this.newCategoryName.trim(),
        this.newCategoryColor,
        this.newCategoryIcon
      );
      this.resetCategoryForm();

      // Show success feedback
      this.showToast('Categoría creada exitosamente');
    }
  }

  async deleteCategory(id: string): Promise<void> {
    // Check if category has tasks
    const tasksWithCategory = this.taskService.getTasksByCategory(id);
    if (tasksWithCategory.length > 0) {
      this.showToast(
        'No se puede eliminar una categoría que tiene tareas asignadas',
        'warning'
      );
      return;
    }

    const confirmed = confirm('¿Estás seguro de eliminar esta categoría?');
    if (confirmed) {
      await this.categoryService.deleteCategory(id);
      this.showToast('Categoría eliminada');
    }
  }

  private resetCategoryForm(): void {
    this.newCategoryName = '';
    this.newCategoryColor = '#667eea';
    this.newCategoryIcon = 'folder';
  }

  // Helper Methods
  getCategoryName(categoryId: string): string {
    const category = this.categories.find((c) => c.id === categoryId);
    return category?.name || 'Sin categoría';
  }

  getCategoryColor(categoryId: string): string {
    const category = this.categories.find((c) => c.id === categoryId);
    return category?.color || '#95a5a6';
  }

  getCategoryIcon(categoryId: string): string {
    const category = this.categories.find((c) => c.id === categoryId);
    return category?.icon || 'folder';
  }

  getPriorityLabel(priority: 'low' | 'medium' | 'high'): string {
    const labels = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
    };
    return labels[priority];
  }

  getPriorityColor(priority: 'low' | 'medium' | 'high'): string {
    const colors = {
      low: 'medium',
      medium: 'warning',
      high: 'danger',
    };
    return colors[priority];
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes < 1 ? 'Ahora' : `Hace ${minutes}m`;
      }
      return `Hace ${hours}h`;
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return `Hace ${days}d`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }

  getTaskStats() {
    return this.taskService.getTaskStats();
  }

  getEmptyStateTitle(): string {
    switch (this.selectedFilter) {
      case 'pending':
        return '¡Excelente trabajo!';
      case 'completed':
        return 'Aún no has completado tareas';
      default:
        return 'Comienza tu día productivo';
    }
  }

  getEmptyStateMessage(): string {
    switch (this.selectedFilter) {
      case 'pending':
        return 'No tienes tareas pendientes. ¡Es momento de relajarte o agregar nuevas metas!';
      case 'completed':
        return 'Las tareas completadas aparecerán aquí. ¡Comienza marcando algunas como terminadas!';
      default:
        return 'Organiza tu día creando tu primera tarea. ¡Cada gran logro comienza con un pequeño paso!';
    }
  }

  getTaskCountForCategory(categoryId: string): number {
    return this.taskService.getTasksByCategory(categoryId).length;
  }

  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

  // Utility method for showing toasts (you can implement this with Ionic Toast)
  private showToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'success'
  ): void {
    // Implement toast notification here
    console.log(`Toast: ${message}`);

    // Simple alert fallback - replace with proper Ionic Toast
    if (color === 'warning' || color === 'danger') {
      alert(message);
    }
  }

  // Method to get current form state (useful for debugging)
  getFormState() {
    return {
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      categoryId: this.selectedCategoryId,
      priority: this.selectedPriority,
      isEditing: !!this.editingTask,
      isAdvanced: this.showAdvancedForm,
    };
  }

  // Method to handle keyboard shortcuts
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl/Cmd + Enter to submit form
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.addTask();
    }

    // Escape to cancel editing
    if (event.key === 'Escape' && this.editingTask) {
      this.resetForm();
    }
  }
}
