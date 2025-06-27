
import { supabase } from '@/integrations/supabase/client';
import { Course } from '../course/CourseTypes';

export class SupabaseCourseService {
  static async saveCourse(course: Course): Promise<void> {
    try {
      console.log('💾 Saving course to Supabase:', course.id);
      
      const { error } = await supabase
        .from('courses')
        .upsert({
          id: course.id,
          title: course.title,
          description: course.description,
          content: JSON.stringify(course.sections),
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('❌ Error saving course:', error);
        throw error;
      }

      console.log('✅ Course saved to Supabase successfully:', course.id);
    } catch (error) {
      console.error('❌ Failed to save course to Supabase:', error);
      throw error;
    }
  }

  static async getAllCourses(): Promise<Course[]> {
    try {
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading courses:', error);
        throw error;
      }

      const courses: Course[] = coursesData.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description || '',
        sections: c.content ? JSON.parse(c.content) : [],
        createdAt: c.created_at || new Date().toISOString(),
        isActive: true,
        language: 'en'
      }));

      console.log('✅ Loaded courses from Supabase:', courses.length);
      return courses;
    } catch (error) {
      console.error('❌ Failed to load courses from Supabase:', error);
      return [];
    }
  }

  static async getCourseById(id: string): Promise<Course | null> {
    try {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !courseData) {
        console.log('❌ Course not found in Supabase:', id);
        return null;
      }

      const course: Course = {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description || '',
        sections: courseData.content ? JSON.parse(courseData.content) : [],
        createdAt: courseData.created_at || new Date().toISOString(),
        isActive: true,
        language: 'en'
      };

      console.log('✅ Course loaded from Supabase:', course.id);
      return course;
    } catch (error) {
      console.error('❌ Failed to load course from Supabase:', error);
      return null;
    }
  }

  static async deleteCourse(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting course:', error);
        throw error;
      }

      console.log('✅ Course deleted from Supabase:', id);
    } catch (error) {
      console.error('❌ Failed to delete course from Supabase:', error);
      throw error;
    }
  }
}
