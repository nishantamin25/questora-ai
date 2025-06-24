import { FileProcessingService } from './FileProcessingService';
import { PDFGenerationService } from './PDFGenerationService';
import { ChatGPTService } from './ChatGPTService';

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
            console.log(`Successfully processed ${file.name}:`, {
              type: processedFile.type,
              contentLength: processedFile.content.length,
              extractionMethod: processedFile.metadata.extractionMethod
            });

            // Create course materials from processed content
            if (processedFile.content && processedFile.content.length > 100) {
              // Split content into 2-3 meaningful sections
              const sections = await this.createCourseSections(processedFile.content, prompt, file.name);
              materials.push(...sections);
            } else {
              console.warn(`Insufficient content extracted from ${file.name}, using fallback`);
              materials.push(this.createFallbackMaterial(file.name, prompt));
            }
            
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            materials.push(this.createFallbackMaterial(file.name, prompt));
          }
        }
      } 
      // Use provided file content string if available
      else if (fileContent && fileContent.trim().length > 100) {
        console.log('Using provided file content for course generation');
        const sections = await this.createCourseSections(fileContent, prompt, 'Content');
        materials.push(...sections);
      } 
      // Generate from prompt only
      else {
        console.log('Generating course materials from prompt only');
        const lessons = await this.generateLessonsFromPrompt(prompt);
        materials.push(...lessons);
      }

      // Ensure we have quality materials (2-3 sections)
      const finalMaterials = materials.slice(0, 3);
      if (finalMaterials.length === 0) {
        finalMaterials.push(this.createFallbackMaterial('Course', prompt));
      }

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

      // Generate clean, readable PDF
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('Course PDF generated successfully');
      } catch (error) {
        console.error('Error generating course PDF:', error);
      }

      console.log('Generated course successfully:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl
      });

      return course;
    } catch (error) {
      console.error('Error generating course:', error);
      throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createCourseSections(content: string, prompt: string, sourceName: string): Promise<CourseMaterial[]> {
    const sections: CourseMaterial[] = [];
    
    try {
      // Use ChatGPT to structure the content into meaningful sections
      const structuredContent = await ChatGPTService.generateContent(
        `Create a well-structured educational course from this content about "${prompt}". 
        Organize it into 2-3 clear sections with titles and comprehensive content. 
        Make each section substantial and educational.
        
        Source content: ${content.substring(0, 3000)}`
      );

      // Split the structured content into sections
      const sectionParts = this.splitIntoSections(structuredContent);
      
      sectionParts.forEach((section, index) => {
        if (section.trim().length > 200) {
          sections.push({
            type: 'text',
            title: this.extractSectionTitle(section, index + 1, sourceName),
            content: section.trim()
          });
        }
      });

    } catch (error) {
      console.error('Error creating structured sections:', error);
      // Fallback: split content manually
      const chunks = this.splitContentIntoChunks(content, 1500);
      chunks.forEach((chunk, index) => {
        sections.push({
          type: 'text',
          title: `${sourceName} - Section ${index + 1}`,
          content: chunk
        });
      });
    }

    return sections.slice(0, 3);
  }

  private splitIntoSections(content: string): string[] {
    // Try to split by section headers or natural breaks
    const sections = content.split(/(?:\n\s*(?:Section|Chapter|Part)\s*\d+|\n\s*#{1,3}\s*)/i);
    
    if (sections.length < 2) {
      // Split by paragraphs if no clear sections
      return this.splitContentIntoChunks(content, 1200);
    }
    
    return sections.filter(section => section.trim().length > 100);
  }

  private extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for a title-like first line
    const firstLine = lines[0];
    if (firstLine && firstLine.length < 100 && !firstLine.endsWith('.')) {
      return firstLine;
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private createFallbackMaterial(fileName: string, prompt: string): CourseMaterial {
    return {
      type: 'text',
      title: `Course Overview: ${fileName}`,
      content: `Educational Content: ${fileName}

This course provides comprehensive coverage of ${prompt}, designed to give you thorough understanding and practical knowledge.

Key Learning Objectives:
• Master fundamental concepts and principles
• Understand practical applications and real-world usage
• Develop critical thinking and analytical skills
• Apply knowledge to solve complex problems
• Build confidence in the subject matter

Course Overview:
This educational material covers essential topics that form the foundation of understanding in this area. You'll explore core concepts, learn practical applications, and develop the skills necessary to apply this knowledge effectively.

Learning Approach:
The content is structured to build your knowledge progressively, starting with fundamental principles and advancing to more complex applications. Each concept is explained clearly with practical examples to enhance understanding.

Expected Outcomes:
Upon completion of this course, you will have developed a comprehensive understanding of the subject matter and be prepared to apply this knowledge in practical situations and assessments.`
    };
  }

  private async generateLessonsFromPrompt(prompt: string): Promise<CourseMaterial[]> {
    const lessons: CourseMaterial[] = [];
    
    try {
      // Use ChatGPT to generate comprehensive course content
      const courseContent = await ChatGPTService.generateContent(
        `Create a comprehensive educational course about "${prompt}". 
        Structure it as 3 distinct sections with clear titles and substantial content. 
        Make each section educational, informative, and practical. 
        Each section should be at least 300 words.`
      );

      const sections = this.splitIntoSections(courseContent);
      
      sections.forEach((section, index) => {
        if (section.trim().length > 200) {
          lessons.push({
            type: 'text',
            title: this.extractSectionTitle(section, index + 1, 'Course'),
            content: section.trim()
          });
        }
      });

    } catch (error) {
      console.error('Error generating lessons from prompt:', error);
      // Fallback to static content
      lessons.push(
        {
          type: 'text',
          title: 'Course Introduction',
          content: `Welcome to this comprehensive course on ${prompt}.

This course will provide you with essential knowledge and practical skills needed to understand and apply key concepts in this field.

Learning Objectives:
- Master fundamental concepts and principles
- Apply theoretical knowledge to practical scenarios  
- Develop critical thinking and analytical skills
- Build confidence in using these concepts professionally

Course Structure:
The course is designed to build your knowledge progressively, ensuring you have a solid foundation before moving to more advanced topics.`
        },
        {
          type: 'text',
          title: 'Core Concepts and Applications',
          content: `In this section, we explore the fundamental concepts of ${prompt} and their practical applications.

Key Areas of Focus:
Understanding the core principles is essential for mastering this subject. These concepts form the foundation for all advanced applications and real-world implementations.

Practical Applications:
We'll examine how these concepts are applied in professional settings, providing concrete examples and case studies that demonstrate their effectiveness and importance.

Best Practices:
Learn industry-standard approaches and proven methodologies that ensure successful application of these concepts in various contexts.`
        },
        {
          type: 'text',
          title: 'Advanced Topics and Implementation',
          content: `This section covers advanced aspects of ${prompt} and practical implementation strategies.

Advanced Techniques:
Explore sophisticated approaches and methodologies that enhance your understanding and application capabilities.

Implementation Strategies:
Learn proven strategies for implementing these concepts effectively in real-world scenarios.

Future Considerations:
Understand emerging trends and developments that will shape the future of this field, preparing you for continued success and professional growth.`
        }
      );
    }

    return lessons.slice(0, 3);
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
        currentChunk = trimmedSentence.length > maxLength 
          ? trimmedSentence.substring(0, maxLength - 3) + '...'
          : trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks.filter(chunk => chunk.trim().length > 50);
  }

  private calculateEstimatedTime(materials: CourseMaterial[]): number {
    let totalTime = 0;
    
    materials.forEach(material => {
      switch (material.type) {
        case 'text':
          const wordCount = material.content.split(' ').length;
          totalTime += Math.ceil(wordCount / 60); // 60 words per minute
          break;
        case 'image':
          totalTime += 5;
          break;
        case 'video':
          totalTime += 10;
          break;
      }
    });

    return Math.max(totalTime, 15); // Minimum 15 minutes
  }

  private generateCourseName(prompt: string): string {
    const words = prompt.split(' ').filter(word => 
      word.length > 2 && 
      !['the', 'and', 'for', 'with', 'from', 'create', 'course', 'questions'].includes(word.toLowerCase())
    );
    
    const courseWords = words.slice(0, 4).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    
    return courseWords.join(' ') || 'Educational Course';
  }

  private generateCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `A comprehensive course covering ${prompt}. `;
    
    if (files.length > 0) {
      description += `Enhanced with content from ${files.length} uploaded file${files.length > 1 ? 's' : ''}. `;
    }
    
    description += `Features ${materialCount} learning section${materialCount > 1 ? 's' : ''} designed to provide thorough understanding and practical knowledge.`;
    
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
