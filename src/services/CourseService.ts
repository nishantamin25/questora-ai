import { FileProcessingService } from './FileProcessingService';
import { PDFGenerationService } from './PDFGenerationService';

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
  pdfUrl?: string;
}

class CourseServiceClass {
  private readonly STORAGE_KEY = 'questora_courses';

  async generateCourse(prompt: string, files: File[] = [], fileContent: string = '', testName?: string): Promise<Course> {
    console.log('Generating course from material:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileNames: files.map(f => f.name),
      testName
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
              // Text-based content - create consolidated material for 2-3 pages
              materials.push({
                type: 'text',
                title: 'Course Content - Page 1',
                content: this.createPageContent(processedFile.content, 1, prompt)
              });
              
              if (processedFile.content.length > 2000) {
                materials.push({
                  type: 'text',
                  title: 'Course Content - Page 2',
                  content: this.createPageContent(processedFile.content, 2, prompt)
                });
              }
              
              if (processedFile.content.length > 4000) {
                materials.push({
                  type: 'text',
                  title: 'Course Content - Page 3',
                  content: this.createPageContent(processedFile.content, 3, prompt)
                });
              }
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            // Add a fallback material for failed file processing
            materials.push({
              type: 'text',
              title: 'Course Overview',
              content: `This course covers the essential concepts and principles related to ${prompt}. 

Key Learning Objectives:
- Understand fundamental concepts
- Apply knowledge to practical scenarios
- Develop critical thinking skills
- Master essential techniques

The course content has been designed to provide comprehensive coverage of the topic while ensuring practical applicability.`
            });
          }
        }
      } 
      // Use provided file content string if no files but content exists
      else if (fileContent && fileContent.trim().length > 50) {
        console.log('Using provided file content for course generation');
        materials.push({
          type: 'text',
          title: 'Course Content - Page 1',
          content: this.createPageContent(fileContent, 1, prompt)
        });
        
        if (fileContent.length > 2000) {
          materials.push({
            type: 'text',
            title: 'Course Content - Page 2',
            content: this.createPageContent(fileContent, 2, prompt)
          });
        }
        
        if (fileContent.length > 4000) {
          materials.push({
            type: 'text',
            title: 'Course Content - Page 3',
            content: this.createPageContent(fileContent, 3, prompt)
          });
        }
      } 
      // Generate from prompt only
      else {
        console.log('Generating course materials from prompt only');
        const lessons = this.generateLessonsFromPrompt(prompt);
        materials.push(...lessons);
      }

      // Ensure we have at least one material and at most 3
      if (materials.length === 0) {
        materials.push({
          type: 'text',
          title: 'Course Overview',
          content: this.generateBasicContent(prompt)
        });
      }

      // Limit to 3 pages maximum
      const finalMaterials = materials.slice(0, 3);

      const estimatedTime = this.calculateEstimatedTime(finalMaterials);

      const course: Course = {
        id: courseId,
        name: testName || this.generateCourseName(prompt),
        description: this.generateCourseDescription(prompt, files, finalMaterials.length),
        materials: finalMaterials,
        estimatedTime,
        createdAt: new Date().toISOString(),
        difficulty: 'medium'
      };

      // Generate PDF for the course
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('Course PDF generated successfully');
      } catch (error) {
        console.error('Error generating course PDF:', error);
        // Continue without PDF if generation fails
      }

      console.log('Generated course successfully:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        fileCount: files.length,
        hasPDF: !!course.pdfUrl
      });

      return course;
    } catch (error) {
      console.error('Error generating course:', error);
      throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createPageContent(content: string, pageNumber: number, prompt: string): string {
    const contentLength = content.length;
    const pageSize = Math.ceil(contentLength / 3);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, contentLength);
    
    let pageContent = content.substring(startIndex, endIndex);
    
    // Add page-specific introduction
    const intro = pageNumber === 1 
      ? `Welcome to this comprehensive course on ${prompt}.\n\n`
      : `Continuing our exploration of ${prompt}...\n\n`;
    
    return intro + pageContent;
  }

  private generateBasicContent(prompt: string): string {
    return `Welcome to this comprehensive course on ${prompt}.

Course Overview:
This course is designed to provide you with a thorough understanding of ${prompt}. You will explore key concepts, learn practical applications, and develop the skills necessary to apply this knowledge effectively.

Learning Objectives:
• Understand the fundamental principles
• Explore practical applications and use cases
• Develop critical thinking and problem-solving skills
• Apply knowledge to real-world scenarios

Key Topics Covered:
• Core concepts and terminology
• Historical context and development
• Current best practices and methodologies
• Future trends and considerations

Course Structure:
This course is structured to build your knowledge progressively, starting with foundational concepts and advancing to more complex applications. Each section includes practical examples and exercises to reinforce your learning.

Getting Started:
Take your time to absorb the material and don't hesitate to revisit sections as needed. The knowledge you gain here will serve as a solid foundation for further exploration of ${prompt}.`;
  }

  private generateLessonsFromPrompt(prompt: string): CourseMaterial[] {
    const lessons: CourseMaterial[] = [];
    
    // Create 2-3 pages of content
    lessons.push({
      type: 'text',
      title: 'Course Introduction',
      content: `Welcome to this comprehensive course on ${prompt}.

This course will provide you with essential knowledge and practical skills. You'll learn key concepts, explore real-world applications, and develop expertise in this important area.

Learning Objectives:
- Master fundamental concepts and principles
- Apply theoretical knowledge to practical scenarios
- Develop critical thinking and analytical skills
- Build confidence in using these concepts

Course Benefits:
By completing this course, you will have a solid foundation in ${prompt} and be well-prepared to apply this knowledge in professional settings.`
    });

    lessons.push({
      type: 'text',
      title: 'Core Concepts and Applications',
      content: `In this section, we dive deeper into the core concepts of ${prompt}.

Key Areas of Focus:
Understanding the fundamental principles that govern ${prompt} is crucial for success. These concepts form the building blocks for more advanced applications.

Practical Applications:
We'll explore how these concepts are applied in real-world situations, providing you with concrete examples and case studies that demonstrate their effectiveness.

Best Practices:
Learn from industry experts about the most effective approaches and common pitfalls to avoid when working with ${prompt}.

Critical Success Factors:
Discover the key elements that contribute to successful implementation and how to measure effectiveness.`
    });

    lessons.push({
      type: 'text',
      title: 'Advanced Topics and Future Directions',
      content: `This final section covers advanced aspects of ${prompt} and future considerations.

Advanced Techniques:
Explore sophisticated approaches and methodologies that can enhance your understanding and application of ${prompt}.

Industry Trends:
Stay current with the latest developments and emerging trends that are shaping the future of this field.

Implementation Strategies:
Learn proven strategies for implementing these concepts in your own work or organization.

Conclusion:
You now have a comprehensive understanding of ${prompt}. Continue to practice and apply these concepts to build your expertise and achieve success in your endeavors.

Next Steps:
Consider taking the assessment to validate your knowledge and identify areas for continued learning and development.`
    });

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

  private generateCourseName(prompt: string): string {
    // Extract key words from prompt and create a clean course name
    const words = prompt.split(' ').filter(word => 
      word.length > 2 && 
      !['the', 'and', 'for', 'with', 'from', 'create', 'course', 'questions'].includes(word.toLowerCase())
    );
    
    // Take first 4-5 meaningful words and capitalize them
    const courseWords = words.slice(0, 5).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    
    return courseWords.join(' ');
  }

  private generateCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `A comprehensive course covering ${prompt}. `;
    
    if (files.length > 0) {
      description += `Enhanced with content from uploaded materials. `;
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
