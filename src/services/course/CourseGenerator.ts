import { Course, CourseMaterial } from './CourseTypes';
import { ContentProcessor } from './ContentProcessor';
import { FileProcessingService } from '../FileProcessingService';
import { ChatGPTService } from '../ChatGPTService';
import { PDFGenerationService } from '../PDFGenerationService';

export class CourseGenerator {
  static async generateCourse(prompt: string, files: File[] = [], fileContent: string = '', testName?: string): Promise<Course> {
    console.log('🔍 NEW BEHAVIOR: Course generation respecting BOTH user prompt and file content:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName
    });

    const courseId = this.generateId();

    try {
      // CRITICAL FIX: STRICT FILE CONTENT REQUIREMENT - NO FABRICATION
      let validatedFileContent = '';
      
      if (files && files.length > 0) {
        console.log('📄 Processing files for content extraction...');
        
        for (const file of files) {
          try {
            const processedFile = await FileProcessingService.processFile(file);
            console.log(`📋 File processing result for ${file.name}:`, {
              type: processedFile.type,
              contentLength: processedFile.content?.length || 0,
              extractionMethod: processedFile.metadata.extractionMethod
            });

            if (!processedFile.content || processedFile.content.length < 200) {
              console.error(`❌ CRITICAL: Insufficient content extracted from ${file.name}`);
              throw new Error(`Failed to extract sufficient content from ${file.name}. Only ${processedFile.content?.length || 0} characters extracted. Minimum required: 200 characters.`);
            }

            if (!ContentProcessor.isRealContent(processedFile.content)) {
              console.error(`❌ CRITICAL: Invalid content detected from ${file.name}`);
              throw new Error(`The content extracted from ${file.name} appears to be corrupted, incomplete, or not suitable for course generation.`);
            }

            validatedFileContent += processedFile.content + '\n\n';
            console.log(`✅ VALIDATED: Real content extracted from ${file.name}`);
            
          } catch (error) {
            console.error(`❌ Error processing file ${file.name}:`, error);
            throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else if (fileContent && fileContent.trim().length > 200) {
        if (!ContentProcessor.isRealContent(fileContent)) {
          console.error('❌ CRITICAL: Provided file content is invalid');
          throw new Error('The provided file content appears to be corrupted or insufficient for course generation.');
        }
        validatedFileContent = fileContent;
        console.log('✅ VALIDATED: Real content provided via fileContent parameter');
      } else {
        console.error('❌ CRITICAL: No valid file content available');
        throw new Error('Course generation requires uploaded files with substantial content. Please upload files containing at least 200 characters of readable text. Generic course generation without file content is not supported.');
      }

      // NEW: Generate course materials respecting BOTH user prompt AND file content
      console.log('🔒 NEW BEHAVIOR: Creating course sections from BOTH user prompt and file content');
      const materials = await this.createCombinedPromptAndContentSections(prompt, validatedFileContent, 'Uploaded Content');

      if (!materials || materials.length === 0) {
        console.error('❌ CRITICAL: Failed to create course sections from combined prompt and file content');
        throw new Error('Unable to generate course sections from the provided prompt and file content. The content may be too short or not suitable for the requested course structure.');
      }

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

      // Generate PDF
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('✅ Course PDF generated successfully');
      } catch (error) {
        console.error('⚠️ Error generating course PDF:', error);
      }

      console.log('✅ NEW COURSE GENERATION SUCCESS:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'COMBINED_PROMPT_AND_FILE_CONTENT'
      });

      return course;
    } catch (error) {
      console.error('❌ CRITICAL COURSE GENERATION FAILURE:', error);
      throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // NEW: Create course sections respecting both user prompt and file content
  private static async createCombinedPromptAndContentSections(userPrompt: string, fileContent: string, sourceTitle: string): Promise<CourseMaterial[]> {
    console.log('🔒 NEW: Creating course sections from BOTH user prompt and file content');

    try {
      // Use ChatGPT to organize content while respecting user intent
      const organizedContent = await ChatGPTService.generateContent(userPrompt, fileContent);

      // Parse the organized content into sections
      const sections = this.parseContentIntoSections(organizedContent);
      
      if (sections.length > 0) {
        console.log('✅ Successfully organized content respecting both prompt and file content');
        return sections;
      } else {
        console.warn('⚠️ ChatGPT organization failed, using enhanced content splitting');
        return this.createEnhancedContentSections(userPrompt, fileContent, sourceTitle);
      }

    } catch (error) {
      console.error('❌ Error organizing content with ChatGPT:', error);
      console.log('🔄 Falling back to enhanced content splitting');
      return this.createEnhancedContentSections(userPrompt, fileContent, sourceTitle);
    }
  }

  // NEW: Enhanced content sections that consider user prompt
  private static createEnhancedContentSections(userPrompt: string, fileContent: string, sourceTitle: string): Promise<CourseMaterial[]> {
    console.log('📋 Creating enhanced content sections considering user prompt');
    
    // Determine target number of sections from user prompt
    const promptLower = userPrompt.toLowerCase();
    let targetSections = 3; // default
    
    if (promptLower.includes('page')) {
      const pageMatch = promptLower.match(/(\d+)[-\s]*page/);
      if (pageMatch) {
        targetSections = parseInt(pageMatch[1]);
      }
    } else if (promptLower.includes('section')) {
      const sectionMatch = promptLower.match(/(\d+)[-\s]*section/);
      if (sectionMatch) {
        targetSections = parseInt(sectionMatch[1]);
      }
    } else if (promptLower.includes('module')) {
      const moduleMatch = promptLower.match(/(\d+)[-\s]*module/);
      if (moduleMatch) {
        targetSections = parseInt(moduleMatch[1]);
      }
    }

    // Ensure reasonable bounds
    targetSections = Math.max(1, Math.min(5, targetSections));
    
    const materials: CourseMaterial[] = [];
    
    // Split content into paragraphs
    const paragraphs = fileContent.split(/\n\s*\n/).filter(p => p.trim().length > 100);
    
    if (paragraphs.length === 0) {
      // If no clear paragraphs, split by sentences
      const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 50);
      const chunkedSentences = this.chunkArray(sentences, Math.ceil(sentences.length / targetSections));
      
      chunkedSentences.forEach((chunk, index) => {
        if (chunk.length > 0) {
          materials.push({
            id: `section_${index + 1}`,
            title: this.generateSectionTitle(userPrompt, sourceTitle, index + 1, targetSections),
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
            title: this.generateSectionTitle(userPrompt, sourceTitle, index + 1, targetSections),
            content: chunk.join('\n\n').trim(),
            type: 'text',
            order: index + 1
          });
        }
      });
    }

    return Promise.resolve(materials.slice(0, targetSections));
  }

  // NEW: Generate section titles that reflect user intent
  private static generateSectionTitle(userPrompt: string, sourceTitle: string, sectionNumber: number, totalSections: number): string {
    const promptLower = userPrompt.toLowerCase();
    
    if (promptLower.includes('course')) {
      return `Module ${sectionNumber}: ${sourceTitle}`;
    } else if (promptLower.includes('page')) {
      return `Page ${sectionNumber}`;
    } else if (promptLower.includes('chapter')) {
      return `Chapter ${sectionNumber}`;
    } else if (promptLower.includes('lesson')) {
      return `Lesson ${sectionNumber}`;
    } else {
      return `${sourceTitle} - Section ${sectionNumber}`;
    }
  }

  // NEW: Parse organized content into course sections
  private static parseContentIntoSections(organizedContent: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    const sectionRegex = /##\s*(.+?)\n([\s\S]*?)(?=##|$)/g;
    let match;
    let sectionIndex = 1;

    while ((match = sectionRegex.exec(organizedContent)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      
      if (content.length > 100) { // Only include sections with substantial content
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

    // If no sections found, treat the entire content as one section
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

  // NEW: Utility method to chunk arrays
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
