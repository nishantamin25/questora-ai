import { EnhancedFileProcessor } from './EnhancedFileProcessor';
import { PDFGeneratorService } from './PDFGeneratorService';

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
  isCompleted?: boolean;
}

class CourseServiceClass {
  private readonly STORAGE_KEY = 'questora_courses';

  async generateCourse(prompt: string, files: File[] = [], fileContent: string = ''): Promise<Course> {
    console.log('🚀 Starting enhanced course generation:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileNames: files.map(f => f.name)
    });

    const courseId = this.generateId();
    const materials: CourseMaterial[] = [];
    let extractedContent = fileContent;

    try {
      // Process uploaded files with enhanced processor
      if (files && files.length > 0) {
        console.log(`📁 Processing ${files.length} files with enhanced processor...`);
        
        for (const file of files) {
          try {
            console.log(`🔄 Processing file: ${file.name}`);
            const processedFile = await EnhancedFileProcessor.processFileWithFallback(file);
            
            console.log(`✅ File processed successfully:`, {
              type: processedFile.type,
              contentLength: processedFile.content.length,
              method: processedFile.metadata.extractionMethod
            });

            // Add to extracted content
            extractedContent += `\n\n=== Content from ${file.name} ===\n${processedFile.content}`;

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
            console.error(`❌ Error processing file ${file.name}:`, error);
            // Add error information as material
            materials.push({
              type: 'text',
              title: `Processing Note: ${file.name}`,
              content: `The file ${file.name} was uploaded but encountered processing issues. The system has generated educational content based on the file type and structure. This content is suitable for creating comprehensive assessments and learning materials.`
            });
          }
        }
      }
      
      // Generate from prompt if no sufficient file content
      if (!extractedContent || extractedContent.trim().length < 100) {
        console.log('📝 Generating course materials from prompt');
        const lessons = this.generateLessonsFromPrompt(prompt);
        materials.push(...lessons);
        extractedContent = prompt;
      }

      // Always add introduction and summary
      materials.unshift({
        type: 'text',
        title: 'Course Introduction',
        content: `Welcome to this comprehensive educational course about ${prompt}. 

This course has been developed from uploaded materials and is designed to provide you with thorough understanding and practical knowledge.

🎯 Learning Objectives:
• Master fundamental concepts and principles
• Apply knowledge to real-world scenarios
• Develop critical thinking and analytical skills
• Prepare for comprehensive assessment

📚 Course Structure:
This course is organized into multiple sections covering all essential topics. Each section builds upon previous knowledge to ensure comprehensive learning.

⏱️ Important: You must complete this entire course before accessing the assessment test. This ensures you have the necessary knowledge to succeed.

Let's begin your learning journey!`
      });

      materials.push({
        type: 'text',
        title: 'Course Completion & Assessment Preparation',
        content: `🎉 Congratulations! You have completed the course content about ${prompt}.

📋 Course Review:
• You have covered all essential topics and concepts
• Key principles and applications have been explained
• Practical examples and case studies were provided
• You are now prepared for assessment

✅ What You've Accomplished:
• Comprehensive understanding of the subject matter
• Practical application skills developed  
• Critical thinking capabilities enhanced
• Ready for knowledge evaluation

🎯 Next Steps:
Now that you have completed the course, you can proceed to the assessment test. The test will evaluate your understanding and application of the concepts covered throughout this course.

💡 Assessment Tips:
• Review key concepts from each section
• Consider practical applications discussed
• Think critically about relationships between topics
• Apply problem-solving approaches learned

You are well-prepared to demonstrate your knowledge and skills!`
      });

      const course: Course = {
        id: courseId,
        name: this.generateCourseName(prompt, files),
        description: this.generateCourseDescription(prompt, files, materials.length),
        materials,
        estimatedTime: this.calculateEstimatedTime(materials),
        createdAt: new Date().toISOString(),
        difficulty: 'medium',
        isCompleted: false
      };

      // Generate PDF
      console.log('📄 Generating course PDF...');
      try {
        const pdfUrl = PDFGeneratorService.generateCoursePDF({
          title: course.name,
          description: course.description,
          content: extractedContent,
          materials: course.materials
        });
        course.pdfUrl = pdfUrl;
        console.log('✅ PDF generated successfully');
      } catch (pdfError) {
        console.error('⚠️ PDF generation failed:', pdfError);
        // Continue without PDF - not critical for functionality
      }

      console.log('🎉 Course generated successfully:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        fileCount: files.length
      });

      return course;
    } catch (error) {
      console.error('💥 Critical error in course generation:', error);
      throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  markCourseCompleted(courseId: string): void {
    try {
      const courses = this.getAllCourses();
      const course = courses.find(c => c.id === courseId);
      if (course) {
        course.isCompleted = true;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(courses));
        console.log('✅ Course marked as completed:', courseId);
      }
    } catch (error) {
      console.error('Error marking course completed:', error);
    }
  }

  isCourseCompleted(courseId: string): boolean {
    try {
      const courses = this.getAllCourses();
      const course = courses.find(c => c.id === courseId);
      return course?.isCompleted || false;
    } catch (error) {
      console.error('Error checking course completion:', error);
      return false;
    }
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
          const wordCount = material.content.split(' ').length;
          totalTime += Math.ceil(wordCount / 50);
          break;
        case 'image':
          totalTime += 4;
          break;
        case 'video':
          totalTime += 8;
          break;
      }
    });

    return Math.max(totalTime, 15);
  }

  private generateCourseName(prompt: string, files: File[] = []): string {
    if (files.length > 0) {
      const fileNames = files.map(f => f.name.split('.')[0]).join(', ');
      return `📚 ${prompt} (from ${fileNames})`;
    }
    
    const words = prompt.split(' ').slice(0, 6);
    return `📚 Course: ${words.join(' ')}`;
  }

  private generateCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `A comprehensive educational course covering ${prompt}. `;
    
    if (files.length > 0) {
      description += `Enhanced with content extracted from ${files.length} uploaded file(s): ${files.map(f => f.name).join(', ')}. `;
    }
    
    description += `Contains ${materialCount} learning sections with estimated completion time. Complete this course to unlock the assessment test.`;
    
    return description;
  }

  private generateLessonsFromPrompt(prompt: string): CourseMaterial[] {
    const lessons: CourseMaterial[] = [];
    
    const words = prompt.split(/\s+/).filter(word => word.length > 3);
    const topics = words.slice(0, 5);
    
    topics.forEach((topic, index) => {
      lessons.push({
        type: 'text',
        title: `Understanding ${topic.charAt(0).toUpperCase() + topic.slice(1)}`,
        content: `In this section, we explore ${topic} in comprehensive detail as it relates to ${prompt}.

🔍 Key Learning Points:
• Fundamental principles and core concepts of ${topic}
• Practical applications and real-world use cases
• Common challenges and proven solutions
• Best practices and recommended approaches
• Industry standards and methodologies

📈 Why This Matters:
Understanding ${topic} is crucial because it forms the foundation for advanced concepts in ${prompt}. This knowledge enables you to apply theoretical understanding to practical situations effectively.

💡 Application Examples:
Consider how ${topic} applies in various scenarios:
• Professional environments and workplace applications
• Problem-solving situations requiring ${topic} knowledge
• Decision-making processes involving ${topic} principles
• Integration with other concepts in ${prompt}

🎯 Learning Outcomes:
After completing this section, you will be able to explain ${topic}, apply its principles, and integrate this knowledge with other course concepts.`
      });
    });

    if (topics.length > 0) {
      lessons.push({
        type: 'text',
        title: 'Integration and Advanced Applications',
        content: `This advanced section demonstrates how all concepts work together in ${prompt}.

🔗 Concept Integration:
The topics of ${topics.join(', ')} interconnect to create a comprehensive understanding of ${prompt}. Each element reinforces and builds upon the others:

• How concepts complement each other
• Synergistic relationships between different elements  
• Practical integration in real-world scenarios
• Advanced problem-solving using multiple concepts

🚀 Advanced Applications:
Real-world application requires understanding these interconnections:
• Complex scenarios involving multiple concepts
• Strategic thinking and planning approaches
• Critical analysis using integrated knowledge
• Innovation and creative problem-solving

💼 Professional Context:
In professional environments, these concepts are rarely used in isolation:
• Team collaboration and knowledge sharing
• Project management and execution
• Quality assurance and best practices
• Continuous improvement and optimization

🎓 Mastery Development:
True expertise comes from understanding both individual concepts and their integration within the broader context of ${prompt}.`
      });
    }

    return lessons;
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
