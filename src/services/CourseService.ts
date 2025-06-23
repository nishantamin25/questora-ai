
interface CourseMaterial {
  type: 'text' | 'image' | 'video';
  content: string;
  title: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  materials: CourseMaterial[];
  estimatedTime: number;
  createdAt: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

class CourseServiceClass {
  private readonly STORAGE_KEY = 'questora_courses';

  generateCourse(prompt: string, file: File | null, fileContent: string): Course {
    console.log('Generating course from material:', { prompt, fileName: file?.name, hasContent: !!fileContent });

    const courseId = this.generateId();
    const materials: CourseMaterial[] = [];

    // Generate course materials based on the file type and content
    if (file) {
      if (file.type.startsWith('image/')) {
        materials.push({
          type: 'image',
          title: `Image Study: ${file.name}`,
          content: `Study this image carefully. ${prompt}`
        });
      } else if (file.type.startsWith('video/')) {
        materials.push({
          type: 'video',
          title: `Video Lesson: ${file.name}`,
          content: `Watch this video to understand the concepts. ${prompt}`
        });
      } else {
        // Text-based files
        const textChunks = this.splitContentIntoChunks(fileContent || prompt, 500);
        textChunks.forEach((chunk, index) => {
          materials.push({
            type: 'text',
            title: `Lesson ${index + 1}`,
            content: chunk
          });
        });
      }
    } else {
      // Generate materials from prompt only
      const lessons = this.generateLessonsFromPrompt(prompt);
      materials.push(...lessons);
    }

    // Add introduction and summary materials
    materials.unshift({
      type: 'text',
      title: 'Course Introduction',
      content: `Welcome to this course! You will learn about: ${prompt}. This course will prepare you for the upcoming test.`
    });

    materials.push({
      type: 'text',
      title: 'Course Summary',
      content: `Congratulations on completing this course! You should now have a good understanding of ${prompt}. You are now ready to take the test.`
    });

    const estimatedTime = this.calculateEstimatedTime(materials);

    const course: Course = {
      id: courseId,
      name: this.generateCourseName(prompt),
      description: `A comprehensive course covering ${prompt}`,
      materials,
      estimatedTime,
      createdAt: new Date().toISOString(),
      difficulty: 'medium'
    };

    console.log('Generated course:', course);
    return course;
  }

  private generateLessonsFromPrompt(prompt: string): CourseMaterial[] {
    const lessons: CourseMaterial[] = [];
    
    // Simple lesson generation based on prompt
    const topics = prompt.split(' ').slice(0, 3); // Take first 3 words as topics
    
    topics.forEach((topic, index) => {
      lessons.push({
        type: 'text',
        title: `Understanding ${topic}`,
        content: `In this lesson, we will explore ${topic} in detail. This is fundamental to understanding ${prompt}.`
      });
    });

    return lessons;
  }

  private splitContentIntoChunks(content: string, maxLength: number): string[] {
    const words = content.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const word of words) {
      if (currentChunk.join(' ').length + word.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
      } else {
        currentChunk.push(word);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  private calculateEstimatedTime(materials: CourseMaterial[]): number {
    let totalTime = 0;
    
    materials.forEach(material => {
      switch (material.type) {
        case 'text':
          // Estimate 2 minutes per 100 words
          totalTime += Math.ceil(material.content.split(' ').length / 50);
          break;
        case 'image':
          totalTime += 3; // 3 minutes per image
          break;
        case 'video':
          totalTime += 5; // 5 minutes per video (estimated)
          break;
      }
    });

    return Math.max(totalTime, 5); // Minimum 5 minutes
  }

  private generateCourseName(prompt: string): string {
    const words = prompt.split(' ').slice(0, 4);
    return `Course: ${words.join(' ')}`;
  }

  private generateId(): string {
    return 'course_' + Math.random().toString(36).substr(2, 9);
  }

  saveCourse(course: Course): void {
    try {
      const courses = this.getAllCourses();
      courses.push(course);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(courses));
      console.log('Course saved successfully:', course.id);
    } catch (error) {
      console.error('Error saving course:', error);
      throw new Error('Failed to save course');
    }
  }

  getAllCourses(): Course[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading courses:', error);
      return [];
    }
  }

  getCourseById(id: string): Course | null {
    const courses = this.getAllCourses();
    return courses.find(course => course.id === id) || null;
  }

  deleteCourse(id: string): void {
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

export const CourseService = new CourseServiceClass();
