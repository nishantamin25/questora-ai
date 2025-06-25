import { Course, CourseMaterial } from './CourseTypes';
import { ContentProcessor } from './ContentProcessor';
import { FileProcessingService } from '../FileProcessingService';
import { ChatGPTService } from '../ChatGPTService';
import { PDFGenerationService } from '../PDFGenerationService';

export class CourseGenerator {
  static async generateCourse(prompt: string, files: File[] = [], fileContent: string = '', testName?: string): Promise<Course> {
    console.log('🔍 STRICT COURSE GENERATION: File-based content only:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName
    });

    const courseId = this.generateId();

    try {
      // ABSOLUTE REQUIREMENT: No course generation without substantial file content
      let validatedFileContent = '';
      
      if (files && files.length > 0) {
        console.log('📄 Processing files for strict content extraction...');
        
        for (const file of files) {
          try {
            const processedFile = await FileProcessingService.processFile(file);
            console.log(`📋 File processing result for ${file.name}:`, {
              type: processedFile.type,
              contentLength: processedFile.content?.length || 0,
              extractionMethod: processedFile.metadata.extractionMethod
            });

            if (!processedFile.content || processedFile.content.length < 200) {
              console.error(`❌ INSUFFICIENT CONTENT: ${file.name} - ${processedFile.content?.length || 0} chars`);
              throw new Error(`Failed to extract sufficient content from ${file.name}. Only ${processedFile.content?.length || 0} characters extracted. Minimum required: 200 characters.`);
            }

            if (!ContentProcessor.isRealContent(processedFile.content)) {
              console.error(`❌ INVALID CONTENT: ${file.name}`);
              throw new Error(`Content from ${file.name} is corrupted, incomplete, or not suitable for course generation.`);
            }

            validatedFileContent += processedFile.content + '\n\n';
            console.log(`✅ VALIDATED: Content extracted from ${file.name}`);
            
          } catch (error) {
            console.error(`❌ File processing error ${file.name}:`, error);
            throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else if (fileContent && fileContent.trim().length > 200) {
        if (!ContentProcessor.isRealContent(fileContent)) {
          console.error('❌ INVALID PROVIDED CONTENT');
          throw new Error('The provided file content is corrupted or insufficient for course generation.');
        }
        validatedFileContent = fileContent;
        console.log('✅ VALIDATED: Content provided via parameter');
      } else {
        console.error('❌ NO VALID CONTENT: Course generation blocked');
        throw new Error('Course generation requires uploaded files with substantial content (minimum 200 characters). Generic course generation without file content is not supported.');
      }

      // STRICT: Generate course materials from file content only
      console.log('🔒 GENERATING: Course sections from file content only');
      const materials = await this.createStrictFileBasedSections(prompt, validatedFileContent);

      if (!materials || materials.length === 0) {
        console.error('❌ NO SECTIONS CREATED');
        throw new Error('Unable to generate course sections from the file content. The content may be too short or not suitable for the requested course structure.');
      }

      const finalMaterials = materials.slice(0, 3);
      const estimatedTime = this.calculateEstimatedTime(finalMaterials);

      const course: Course = {
        id: courseId,
        name: testName || this.generateCourseName(prompt),
        description: this.generateStrictCourseDescription(prompt, files, finalMaterials.length),
        materials: finalMaterials,
        estimatedTime,
        createdAt: new Date().toISOString(),
        difficulty: 'medium'
      };

      // Generate PDF
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('✅ Course PDF generated');
      } catch (error) {
        console.error('⚠️ PDF generation failed:', error);
      }

      console.log('✅ STRICT COURSE GENERATION SUCCESS:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'FILE_CONTENT_ONLY'
      });

      return course;
    } catch (error) {
      console.error('❌ COURSE GENERATION FAILURE:', error);
      throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // STRICT: File-based sections without hallucination
  private static async createStrictFileBasedSections(userPrompt: string, fileContent: string): Promise<CourseMaterial[]> {
    console.log('🔒 CREATING: Strict file-based sections without fabrication');

    try {
      // Use ChatGPT with strict anti-fabrication prompt
      const organizedContent = await ChatGPTService.generateContent(userPrompt, fileContent);
      const sections = this.parseContentIntoSections(organizedContent);
      
      if (sections.length > 0) {
        console.log('✅ Content organized with strict validation');
        return sections;
      } else {
        console.warn('⚠️ ChatGPT organization failed, using direct content splitting');
        return this.createDirectContentSections(userPrompt, fileContent);
      }

    } catch (error) {
      console.error('❌ ChatGPT organization error:', error);
      console.log('🔄 Fallback: Direct content splitting');
      return this.createDirectContentSections(userPrompt, fileContent);
    }
  }

  // DIRECT: Content sections without AI processing
  private static createDirectContentSections(userPrompt: string, fileContent: string): Promise<CourseMaterial[]> {
    console.log('📋 DIRECT: Creating sections from raw file content');
    
    // Determine section count from user prompt
    const promptLower = userPrompt.toLowerCase();
    let targetSections = 3; // default
    
    const pageMatch = promptLower.match(/(\d+)[-\s]*page/);
    const sectionMatch = promptLower.match(/(\d+)[-\s]*section/);
    const moduleMatch = promptLower.match(/(\d+)[-\s]*module/);
    
    if (pageMatch) targetSections = parseInt(pageMatch[1]);
    else if (sectionMatch) targetSections = parseInt(sectionMatch[1]);
    else if (moduleMatch) targetSections = parseInt(moduleMatch[1]);
    
    targetSections = Math.max(1, Math.min(5, targetSections));
    
    const materials: CourseMaterial[] = [];
    
    // Split content into paragraphs
    const paragraphs = fileContent.split(/\n\s*\n/).filter(p => p.trim().length > 100);
    
    if (paragraphs.length === 0) {
      // Split by sentences if no paragraphs
      const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 50);
      const chunkedSentences = this.chunkArray(sentences, Math.ceil(sentences.length / targetSections));
      
      chunkedSentences.forEach((chunk, index) => {
        if (chunk.length > 0) {
          materials.push({
            id: `section_${index + 1}`,
            title: this.generateStrictSectionTitle(userPrompt, index + 1, targetSections),
            content: chunk.join('. ').trim() + '.',
            type: 'text',
            order: index + 1
          });
        }
      });
    } else {
      // Group paragraphs into sections
      const chunkedParagraphs = this.chunkArray(paragraphs, Math.ceil(paragraphs.length / targetSections));
      
      chunkedParagraphs.forEach((chunk, index) => {
        if (chunk.length > 0) {
          materials.push({
            id: `section_${index + 1}`,
            title: this.generateStrictSectionTitle(userPrompt, index + 1, targetSections),
            content: chunk.join('\n\n').trim(),
            type: 'text',
            order: index + 1
          });
        }
      });
    }

    return Promise.resolve(materials.slice(0, targetSections));
  }

  // STRICT: Section titles without fabricated educational terms
  private static generateStrictSectionTitle(userPrompt: string, sectionNumber: number, totalSections: number): string {
    const promptLower = userPrompt.toLowerCase();
    
    if (promptLower.includes('course')) {
      return `Module ${sectionNumber}`;
    } else if (promptLower.includes('page')) {
      return `Page ${sectionNumber}`;
    } else if (promptLower.includes('chapter')) {
      return `Chapter ${sectionNumber}`;
    } else if (promptLower.includes('lesson')) {
      return `Lesson ${sectionNumber}`;
    } else {
      return `Section ${sectionNumber}`;
    }
  }

  private static parseContentIntoSections(organizedContent: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    const sectionRegex = /##\s*(.+?)\n([\s\S]*?)(?=##|$)/g;
    let match;
    let sectionIndex = 1;

    while ((match = sectionRegex.exec(organizedContent)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      
      if (content.length > 100) {
        sections.push({
          id: `section_${sectionIndex}`,
          title,
          content,
          type: 'text',
          order: sectionIndex
        });
        sectionIndex++;
      }
    }

    if (sections.length === 0 && organizedContent.trim().length > 100) {
      sections.push({
        id: 'section_1',
        title: 'Document Content',
        content: organizedContent.trim(),
        type: 'text',
        order: 1
      });
    }

    return sections;
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private static calculateEstimatedTime(materials: CourseMaterial[]): number {
    let totalTime = 0;
    
    materials.forEach(material => {
      switch (material.type) {
        case 'text':
          const wordCount = material.content.split(' ').length;
          totalTime += Math.ceil(wordCount / 200);
          break;
        case 'image':
          totalTime += 5;
          break;
        case 'video':
          totalTime += 10;
          break;
      }
    });

    return Math.max(totalTime, 15);
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

  // STRICT: Course description without fabricated educational terminology
  private static generateStrictCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `Course content based on: ${prompt}. `;
    
    if (files.length > 0) {
      description += `Created from ${files.length} uploaded file${files.length > 1 ? 's' : ''}. `;
    }
    
    description += `Contains ${materialCount} section${materialCount > 1 ? 's' : ''} extracted directly from the source material.`;
    
    return description;
  }

  private static generateId(): string {
    return 'course_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
