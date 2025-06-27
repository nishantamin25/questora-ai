
import { Course } from './CourseTypes';
import { CourseManager } from './CourseManager';
import { SupabaseCourseService } from '../supabase/SupabaseCourseService';
import { supabase } from '@/integrations/supabase/client';

export class HybridCourseManager {
  private static isOnline(): boolean {
    return navigator.onLine;
  }

  private static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }

  static async saveCourse(course: Course): Promise<void> {
    try {
      console.log('💾 Saving course with hybrid approach:', course.id);
      
      // Always save to local storage first
      CourseManager.saveCourse(course);
      
      // Try to save to Supabase if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          await SupabaseCourseService.saveCourse(course);
          console.log('✅ Course saved to both local and Supabase');
        } catch (error) {
          console.warn('⚠️ Failed to save to Supabase, saved locally only:', error);
        }
      } else {
        console.log('📴 Offline or not authenticated, saved locally only');
      }
    } catch (error) {
      console.error('❌ Failed to save course:', error);
      throw error;
    }
  }

  static async getAllCourses(): Promise<Course[]> {
    try {
      let courses: Course[] = [];
      
      // Try to load from Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          const supabaseCourses = await SupabaseCourseService.getAllCourses();
          courses = supabaseCourses;
          console.log('✅ Loaded courses from Supabase:', courses.length);
        } catch (error) {
          console.warn('⚠️ Failed to load from Supabase, falling back to local storage:', error);
        }
      }
      
      // If no courses from Supabase or offline, load from local storage
      if (courses.length === 0) {
        courses = CourseManager.getAllCourses();
        console.log('📁 Loaded courses from local storage:', courses.length);
      }
      
      return courses;
    } catch (error) {
      console.error('❌ Failed to load courses:', error);
      return [];
    }
  }

  static async getCourseById(id: string): Promise<Course | null> {
    try {
      // Try Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          const course = await SupabaseCourseService.getCourseById(id);
          if (course) {
            console.log('✅ Loaded course from Supabase:', id);
            return course;
          }
        } catch (error) {
          console.warn('⚠️ Failed to load from Supabase, trying local storage:', error);
        }
      }
      
      // Fallback to local storage
      const course = CourseManager.getCourseById(id);
      if (course) {
        console.log('📁 Loaded course from local storage:', id);
      }
      
      return course;
    } catch (error) {
      console.error('❌ Failed to load course:', error);
      return null;
    }
  }

  static async deleteCourse(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting course with hybrid approach:', id);
      
      // Delete from local storage
      CourseManager.deleteCourse(id);
      
      // Try to delete from Supabase if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          await SupabaseCourseService.deleteCourse(id);
          console.log('✅ Course deleted from both local and Supabase');
        } catch (error) {
          console.warn('⚠️ Failed to delete from Supabase, deleted locally only:', error);
        }
      } else {
        console.log('📴 Offline or not authenticated, deleted locally only');
      }
    } catch (error) {
      console.error('❌ Failed to delete course:', error);
      throw error;
    }
  }
}
