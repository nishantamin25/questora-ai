import { Course, CourseMaterial } from './CourseTypes';
import { ContentProcessor } from './ContentProcessor';
import { FileProcessingService } from '../FileProcessingService';
import { ChatGPTService } from '../ChatGPTService';
import { PDFGenerationService } from '../PDFGenerationService';

export class CourseGenerator {
  static async generateCourse(prompt: string, files: File[] = [], fileContent: string = '', testName?: string): Promise<Course> {
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

            // CRITICAL FIX: Only use extracted content if it's substantial and real
            if (processedFile.content && processedFile.content.length > 100 && ContentProcessor.isRealContent(processedFile.content)) {
              console.log('Using REAL extracted content for course generation');
              // Create course materials STRICTLY from the actual processed content
              const sections = await this.createStrictFileBasedSections(processedFile.content, file.name);
              materials.push(...sections);
            } else {
              console.error(`CRITICAL: Insufficient or fake content extracted from ${file.name}`);
              throw new Error(`Failed to extract real content from ${file.name}. Content length: ${processedFile.content?.length || 0}`);
            }
            
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } 
      // Use provided file content string if available
      else if (fileContent && fileContent.trim().length > 100 && ContentProcessor.isRealContent(fileContent)) {
        console.log('Using provided REAL file content for course generation');
        const sections = await this.createStrictFileBasedSections(fileContent, 'Content');
        materials.push(...sections);
      } 
      // Only generate from prompt if no files provided
      else if (!files || files.length === 0) {
        console.log('No files provided - generating course materials from prompt only');
        const lessons = await this.generateLessonsFromPrompt(prompt);
        materials.push(...lessons);
      } else {
        throw new Error('No real content could be extracted from the uploaded files');
      }

      // Ensure we have quality materials
      const finalMaterials = materials.slice(0, 3);
      if (finalMaterials.length === 0) {
        throw new Error('Failed to generate any course materials from the provided content');
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

  /**
   * NEW METHOD: Creates course sections strictly from file content without hallucination
   */
  private static async createStrictFileBasedSections(fileContent: string, fileName: string): Promise<CourseMaterial[]> {
    console.log('Creating STRICT file-based sections from content:', fileContent.length, 'characters');
    
    try {
      // Use ChatGPT to structure the content but NOT to add new content
      const structuredContent = await ChatGPTService.generateContent(
        `Based STRICTLY on the content of the attached file below, generate a 2-3 page structured course.
        
        CRITICAL INSTRUCTIONS:
        - Do NOT include any sections or material that are not explicitly present in the document
        - Do NOT add generic academic sections like "assessment prep" or "professional methodologies" unless they are specifically mentioned in the source material
        - Do NOT expand beyond the file content or add your own knowledge
        - Only reorganize and structure the existing content from the file
        - Create clear section titles based on the actual topics covered in the document
        - Preserve all original information while organizing it logically
        
        SOURCE FILE CONTENT:
        """
        ${fileContent}
        """
        
        Structure this content into 2-3 logical sections with clear titles that reflect the actual content of the document. Do not invent new content.`
      );

      // Parse the structured content into sections
      const sections = this.parseStructuredContent(structuredContent, fileName);
      
      // Validate that sections contain only file-based content
      const validatedSections = sections.filter(section => {
        // Check if section content has reasonable overlap with original file content
        const sectionWords = section.content.toLowerCase().split(/\s+/);
        const fileWords = fileContent.toLowerCase().split(/\s+/);
        const commonWords = sectionWords.filter(word => 
          word.length > 3 && fileWords.includes(word)
        ).length;
        
        // Section should have significant overlap with original content
        return commonWords > Math.min(sectionWords.length * 0.3, 10);
      });

      if (validatedSections.length === 0) {
        console.log('No validated sections found, falling back to direct content splitting');
        return this.createDirectContentSections(fileContent, fileName);
      }

      return validatedSections;
    } catch (error) {
      console.error('Error creating structured sections:', error);
      // Fallback to direct content splitting without AI enhancement
      return this.createDirectContentSections(fileContent, fileName);
    }
  }

  /**
   * Fallback method: Creates sections directly from file content without AI processing
   */
  private static createDirectContentSections(fileContent: string, fileName: string): CourseMaterial[] {
    console.log('Creating direct content sections from file content');
    
    const sections: CourseMaterial[] = [];
    const chunks = this.splitContentIntoChunks(fileContent, 1200);
    
    chunks.forEach((chunk, index) => {
      if (chunk.trim().length > 100) {
        sections.push({
          type: 'text',
          title: `${fileName} - Section ${index + 1}`,
          content: chunk.trim()
        });
      }
    });

    return sections.slice(0, 3);
  }

  /**
   * Parses AI-structured content into course sections
   */
  private static parseStructuredContent(content: string, fileName: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    
    // Split by common section indicators
    const parts = content.split(/(?:\n\s*(?:Section|Chapter|Part|Topic)\s*\d+|\n\s*#{1,3}\s*|\n\s*\*\*[^*]+\*\*|\n\s*[A-Z][^:\n]{10,50}:\s*)/i);
    
    parts.forEach((part, index) => {
      const trimmedPart = part.trim();
      if (trimmedPart.length > 150) {
        const title = this.extractSectionTitle(trimmedPart, index + 1, fileName);
        sections.push({
          type: 'text',
          title,
          content: trimmedPart
        });
      }
    });

    return sections;
  }

  private static async generateLessonsFromPrompt(prompt: string): Promise<CourseMaterial[]> {
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

  private static splitIntoSections(content: string): string[] {
    // Try to split by section headers or natural breaks
    const sections = content.split(/(?:\n\s*(?:Section|Chapter|Part)\s*\d+|\n\s*#{1,3}\s*)/i);
    
    if (sections.length < 2) {
      // Split by paragraphs if no clear sections
      return this.splitContentIntoChunks(content, 1200);
    }
    
    return sections.filter(section => section.trim().length > 100);
  }

  private static extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for a title-like first line
    const firstLine = lines[0];
    if (firstLine && firstLine.length < 100 && !firstLine.endsWith('.')) {
      return firstLine;
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private static splitContentIntoChunks(content: string, maxLength: number): string[] {
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

  private static calculateEstimatedTime(materials: CourseMaterial[]): number {
    let totalTime = 0;
    
    materials.forEach(material => {
      switch (material.type) {
        case 'text':
          const wordCount = material.content.split(' ').length;
          totalTime += Math.ceil(wordCount / 200); // Reading speed adjusted
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

  private static generateCourseName(prompt: string): string {
    const words = prompt.split(' ').filter(word => 
      word.length > 2 && 
      !['the', 'and', 'for', 'with', 'from', 'create', 'course', 'questions'].includes(word.toLowerCase())
    );
    
    const courseWords = words.slice(0, 4).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    
    return courseWords.join(' ') || 'Educational Course';
  }

  private static generateCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `A comprehensive course covering ${prompt}. `;
    
    if (files.length > 0) {
      description += `Enhanced with content from ${files.length} uploaded file${files.length > 1 ? 's' : ''}. `;
    }
    
    description += `Features ${materialCount} learning section${materialCount > 1 ? 's' : ''} designed to provide thorough understanding and practical knowledge.`;
    
    return description;
  }

  private static generateId(): string {
    return 'course_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
