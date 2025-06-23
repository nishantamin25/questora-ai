import { FileProcessingService } from './FileProcessingService';

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

  async generateCourse(prompt: string, files: File[] = [], fileContent: string = ''): Promise<Course> {
    console.log('Generating course from material:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileNames: files.map(f => f.name)
    });

    const courseId = this.generateId();
    const materials: CourseMaterial[] = [];

    try {
      // Process uploaded files if available
      if (files && files.length > 0) {
        console.log(`Processing ${files.length} files for course generation...`);
        
        for (const file of files) {
          try {
            const processedFile = await FileProcessingService.processFile(file);
            console.log(`Processed file ${file.name}:`, {
              type: processedFile.type,
              contentLength: processedFile.content.length,
              method: processedFile.metadata.extractionMethod
            });

            // Create course materials based on file type and content
            if (processedFile.type === 'image') {
              materials.push({
                type: 'image',
                title: `Visual Analysis: ${file.name}`,
                content: processedFile.content
              });
            } else if (processedFile.type === 'video') {
              materials.push({
                type: 'video',
                title: `Video Content: ${file.name}`,
                content: processedFile.content
              });
            } else {
              // Text-based content - split into multiple materials
              const textChunks = this.splitContentIntoChunks(processedFile.content, 800);
              textChunks.forEach((chunk, index) => {
                materials.push({
                  type: 'text',
                  title: `${file.name} - Section ${index + 1}`,
                  content: chunk
                });
              });
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            // Add a fallback material for failed file processing
            materials.push({
              type: 'text',
              title: `File Processing Error: ${file.name}`,
              content: `There was an issue processing ${file.name}. Please ensure the file is in a supported format and try again.`
            });
          }
        }
      } 
      // Use provided file content string if no files but content exists
      else if (fileContent && fileContent.trim().length > 50) {
        console.log('Using provided file content for course generation');
        const textChunks = this.splitContentIntoChunks(fileContent, 800);
        textChunks.forEach((chunk, index) => {
          materials.push({
            type: 'text',
            title: `Content Section ${index + 1}`,
            content: chunk
          });
        });
      } 
      // Generate from prompt only
      else {
        console.log('Generating course materials from prompt only');
        const lessons = this.generateLessonsFromPrompt(prompt);
        materials.push(...lessons);
      }

      // Add introduction material
      materials.unshift({
        type: 'text',
        title: 'Course Introduction',
        content: `Welcome to this comprehensive course! This course covers: ${prompt}. 
        
You will explore key concepts, learn practical applications, and develop a thorough understanding of the subject matter. The course is designed to be engaging and educational, preparing you for both theoretical understanding and practical application.

Learning Objectives:
- Understand core concepts and principles
- Apply knowledge to real-world scenarios  
- Develop critical thinking skills
- Master essential techniques and methods

Let's begin your learning journey!`
      });

      // Add summary material
      materials.push({
        type: 'text',
        title: 'Course Summary and Next Steps',
        content: `Congratulations on completing this course about ${prompt}! 

Review what you've learned:
- Key concepts and their applications
- Practical skills and techniques
- Important principles and methods
- Real-world applications and examples

Next Steps:
1. Review the course materials to reinforce your learning
2. Practice applying the concepts in real scenarios
3. Take the assessment test to validate your knowledge
4. Continue exploring advanced topics in this subject area

You are now well-prepared to take the assessment test and demonstrate your understanding of ${prompt}.`
      });

      const estimatedTime = this.calculateEstimatedTime(materials);

      const course: Course = {
        id: courseId,
        name: this.generateCourseName(prompt, files),
        description: this.generateCourseDescription(prompt, files, materials.length),
        materials,
        estimatedTime,
        createdAt: new Date().toISOString(),
        difficulty: 'medium'
      };

      console.log('Generated course successfully:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        fileCount: files.length
      });

      return course;
    } catch (error) {
      console.error('Error generating course:', error);
      throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateLessonsFromPrompt(prompt: string): CourseMaterial[] {
    const lessons: CourseMaterial[] = [];
    
    // Extract key topics from prompt
    const words = prompt.split(/\s+/).filter(word => word.length > 3);
    const topics = words.slice(0, 5); // Take first 5 meaningful words as topics
    
    topics.forEach((topic, index) => {
      lessons.push({
        type: 'text',
        title: `Understanding ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
        content: `In this lesson, we will explore ${topic} in detail. This topic is fundamental to understanding ${prompt}.

Key Points:
- Core principles and concepts related to ${topic}
- Practical applications and use cases
- Common challenges and how to address them
- Best practices and recommended approaches

Understanding ${topic} is essential because it forms the foundation for more advanced concepts. Take time to review and practice the concepts presented in this section.

Questions to Consider:
- How does ${topic} relate to the overall subject?
- What are the practical applications of ${topic}?
- How can you apply this knowledge in real-world scenarios?`
      });
    });

    // Add a comprehensive overview lesson if we have topics
    if (topics.length > 0) {
      lessons.push({
        type: 'text',
        title: 'Comprehensive Overview',
        content: `This lesson provides a comprehensive overview of ${prompt}, integrating all the key concepts we've covered.

Integration of Concepts:
The topics of ${topics.join(', ')} work together to form a complete understanding of ${prompt}. Each element builds upon the others to create a comprehensive knowledge base.

Practical Application:
Understanding how these concepts interact in real-world scenarios is crucial for mastering ${prompt}. Consider how each element contributes to the overall picture.

Critical Thinking:
As you progress through this course, think about:
- How the concepts relate to each other
- Where you might apply this knowledge
- What additional learning might be beneficial
- How to continue developing expertise in this area`
      });
    }

    return lessons;
  }

  private splitContentIntoChunks(content: string, maxLength: number): string[] {
    if (!content || content.length <= maxLength) {
      return content ? [content] : [];
    }

    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const proposedChunk = currentChunk 
        ? `${currentChunk}. ${trimmedSentence}`
        : trimmedSentence;

      if (proposedChunk.length <= maxLength) {
        currentChunk = proposedChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        // If single sentence is too long, split by words
        if (trimmedSentence.length > maxLength) {
          const wordChunks = this.splitByWords(trimmedSentence, maxLength);
          chunks.push(...wordChunks);
          currentChunk = '';
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks.filter(chunk => chunk.trim().length > 10);
  }

  private splitByWords(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const word of words) {
      if (currentChunk.join(' ').length + word.length + 1 <= maxLength) {
        currentChunk.push(word);
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
          currentChunk = [word];
        } else {
          // Single word is too long, just add it
          chunks.push(word);
        }
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
          const wordCount = material.content.split(' ').length;
          totalTime += Math.ceil(wordCount / 50);
          break;
        case 'image':
          totalTime += 4; // 4 minutes per image analysis
          break;
        case 'video':
          totalTime += 8; // 8 minutes per video content
          break;
      }
    });

    return Math.max(totalTime, 10); // Minimum 10 minutes
  }

  private generateCourseName(prompt: string, files: File[] = []): string {
    if (files.length > 0) {
      const fileNames = files.map(f => f.name.split('.')[0]).join(', ');
      return `Course: ${prompt} (${fileNames})`;
    }
    
    const words = prompt.split(' ').slice(0, 6);
    return `Course: ${words.join(' ')}`;
  }

  private generateCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `A comprehensive course covering ${prompt}. `;
    
    if (files.length > 0) {
      description += `This course is enhanced with content from ${files.length} uploaded file(s): ${files.map(f => f.name).join(', ')}. `;
    }
    
    description += `The course contains ${materialCount} learning materials designed to provide thorough understanding and practical knowledge.`;
    
    return description;
  }

  private generateId(): string {
    return 'course_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
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
