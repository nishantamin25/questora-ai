
import { Course } from './CourseTypes';

export class CourseManager {
  private static readonly STORAGE_KEY = 'questora_courses';

  static saveCourse(course: Course): void {
    try {
      const courses = this.getAllCourses();
      const existingIndex = courses.findIndex(c => c.id === course.id);
      
      if (existingIndex >= 0) {
        // Update existing course
        courses[existingIndex] = course;
        console.log('Course updated successfully:', course.id);
      } else {
        // Add new course
        courses.push(course);
        console.log('Course saved successfully:', course.id);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(courses));
    } catch (error) {
      console.error('Error saving course:', error);
      throw new Error('Failed to save course');
    }
  }

  static getAllCourses(): Course[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading courses:', error);
      return [];
    }
  }

  static getCourseById(id: string): Course | null {
    const courses = this.getAllCourses();
    return courses.find(course => course.id === id) || null;
  }

  static deleteCourse(id: string): void {
    try {
      const courses = this.getAllCourses();
      const filteredCourses = courses.filter(course => course.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredCourses));
      console.log('Course deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting course:', error);
      throw new Error('Failed to delete course');
    }
  }
}
