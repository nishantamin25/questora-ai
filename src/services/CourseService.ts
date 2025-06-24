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

            // CRITICAL FIX: Only use extracted content if it's substantial and real
            if (processedFile.content && processedFile.content.length > 100 && this.isRealContent(processedFile.content)) {
              console.log('Using REAL extracted content for course generation');
              // Create course materials from the ACTUAL processed content
              const sections = await this.createCourseSectionsFromRealContent(processedFile.content, file.name);
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
      else if (fileContent && fileContent.trim().length > 100 && this.isRealContent(fileContent)) {
        console.log('Using provided REAL file content for course generation');
        const sections = await this.createCourseSectionsFromRealContent(fileContent, 'Content');
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

  private isRealContent(content: string): boolean {
    if (!content || content.length < 50) return false;
    
    // Check for generic educational templates/patterns
    const genericPatterns = [
      /educational content designed for/i,
      /learning objectives/i,
      /students will gain understanding/i,
      /course provides comprehensive coverage of/i,
      /upon completion.*understanding/i,
      /theoretical foundations and core principles/i,
      /practical applications and real-world usage/i
    ];
    
    const hasGenericPatterns = genericPatterns.some(pattern => pattern.test(content));
    
    // Content should have specific terms, numbers, proper nouns
    const hasSpecificContent = /[\d,]+|\b[A-Z][a-z]+\s[A-Z][a-z]+|\b[A-Z]{2,}|\b\d+[A-Za-z]+|\b[A-Z][a-z]*\sTM\b|\b[A-Z][a-z]*®\b/.test(content);
    
    return !hasGenericPatterns && hasSpecificContent;
  }

  private async createCourseSectionsFromRealContent(content: string, sourceName: string): Promise<CourseMaterial[]> {
    const sections: CourseMaterial[] = [];
    
    try {
      console.log('Creating course sections from REAL content:', content.substring(0, 200) + '...');
      
      // CRITICAL: Use very specific prompt to force ChatGPT to use ONLY the provided content
      const structurePrompt = `CRITICAL INSTRUCTION: You must create course content using ONLY the information provided below. Do not add generic educational templates or fabricated content.

Extract the actual information from this document and organize it into 2-3 educational sections with clear titles. Use the real data, metrics, product names, and specific details found in the content.

REAL DOCUMENT CONTENT TO USE:
${content}

Requirements:
1. Extract only factual information from the provided content
2. Use actual product names, metrics, and specific details mentioned
3. Create section titles based on the real topics covered
4. Do not add generic learning objectives or educational templates
5. Structure the real information into educational sections
6. If metrics or specific data points exist, include them exactly as stated
7. Keep all original terminology and proper nouns

Respond with structured educational content based solely on the provided document.`;

      const structuredContent = await ChatGPTService.generateContent(structurePrompt);
      
      console.log('ChatGPT structured content:', structuredContent.substring(0, 300) + '...');
      
      // Verify the structured content still contains real information
      if (!this.containsRealInformation(structuredContent, content)) {
        console.error('ChatGPT response does not contain real content - using direct extraction');
        return this.extractSectionsDirectly(content, sourceName);
      }

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
      console.error('Error creating structured sections with ChatGPT, using direct extraction:', error);
      return this.extractSectionsDirectly(content, sourceName);
    }

    return sections.slice(0, 3);
  }

  private containsRealInformation(structuredContent: string, originalContent: string): boolean {
    // Extract key terms from original content
    const originalTerms = originalContent.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b|\b\d+[A-Za-z]*\b|\b[A-Z]{2,}\b/g) || [];
    const structuredTerms = structuredContent.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b|\b\d+[A-Za-z]*\b|\b[A-Z]{2,}\b/g) || [];
    
    // Check if structured content contains at least 30% of original key terms
    const commonTerms = originalTerms.filter(term => structuredTerms.includes(term));
    const overlap = commonTerms.length / Math.max(originalTerms.length, 1);
    
    console.log('Content overlap check:', { 
      originalTermsCount: originalTerms.length, 
      commonTermsCount: commonTerms.length, 
      overlap: overlap 
    });
    
    return overlap > 0.3;
  }

  private extractSectionsDirectly(content: string, sourceName: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    
    // Split content into meaningful chunks based on structure
    const chunks = this.splitContentIntoMeaningfulChunks(content);
    
    chunks.forEach((chunk, index) => {
      if (chunk.trim().length > 200) {
        sections.push({
          type: 'text',
          title: this.extractRealSectionTitle(chunk, index + 1, sourceName),
          content: chunk.trim()
        });
      }
    });
    
    return sections.slice(0, 3);
  }

  private splitContentIntoMeaningfulChunks(content: string): string[] {
    // Define regex patterns with explicit typing
    const patterns: RegExp[] = [
      /(?:\n\s*){2,}(?=[A-Z][^.]*(?:\n|$))/g,  // Double line breaks before headings
      /(?:\d+\.|\w+\)|\•)\s+/g,                // Numbered or bulleted lists
      /\n\s*[A-Z][A-Z\s]+\n/g,               // ALL CAPS headings
      /\n\s*[A-Z][^.]*:\s*\n/g               // Headings ending with colon
    ];
    
    let chunks: string[] = [content];
    
    // Process each pattern individually with simplified logic
    for (const pattern of patterns) {
      const newChunks: string[] = [];
      
      // Process each chunk
      for (const chunk of chunks) {
        // Split the chunk by the pattern
        const parts: string[] = chunk.split(pattern);
        
        // Add valid parts to newChunks
        parts.forEach((part: string) => {
          if (part && part.trim().length > 100) {
            newChunks.push(part);
          }
        });
      }
      
      // Only use the new chunks if they provide better segmentation
      if (newChunks.length > chunks.length && newChunks.length <= 5) {
        chunks = newChunks;
      }
    }
    
    // If no good natural breaks found, split by length
    if (chunks.length === 1 && chunks[0].length > 2000) {
      chunks = this.splitContentIntoChunks(content, 1500);
    }
    
    return chunks;
  }

  private extractRealSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for title-like patterns in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      
      // Check for heading patterns
      if (line.length < 100 && line.length > 5) {
        // ALL CAPS headings
        if (line === line.toUpperCase() && /[A-Z\s&]+/.test(line)) {
          return this.cleanTitle(line);
        }
        // Title Case headings
        if (/^[A-Z][^.]*[^.]$/.test(line) && line.split(' ').length <= 8) {
          return this.cleanTitle(line);
        }
        // Headings with colons
        if (line.endsWith(':') && line.split(' ').length <= 6) {
          return this.cleanTitle(line.slice(0, -1));
        }
      }
    }
    
    // Extract key terms from the section for a meaningful title
    const keyTerms = section.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b/g) || [];
    if (keyTerms.length > 0) {
      const title = keyTerms.slice(0, 3).join(' ');
      if (title.length > 5 && title.length < 50) {
        return title;
      }
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/[^\w\s&-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
