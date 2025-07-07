
import { Course, CourseMaterial } from './course/CourseTypes';
import { CourseGenerator } from './course/CourseGenerator';
import { CourseManager } from './course/CourseManager';
import { ProcessedVisualContent } from './chatgpt/VisualContentPipeline';

class CourseServiceClass {
  async generateCourse(
    prompt: string, 
    files: File[] = [], 
    fileContent: string = '', 
    testName?: string,
    visualContent?: ProcessedVisualContent
  ): Promise<Course> {
    return CourseGenerator.generateCourse(prompt, files, fileContent, testName, visualContent);
  }

  saveCourse(course: Course): void {
    CourseManager.saveCourse(course);
  }

  getAllCourses(): Course[] {
    return CourseManager.getAllCourses();
  }

  getCourseById(id: string): Course | null {
    return CourseManager.getCourseById(id);
  }

  deleteCourse(id: string): void {
    CourseManager.deleteCourse(id);
  }
}

export const CourseService = new CourseServiceClass();
export type { Course, CourseMaterial };
