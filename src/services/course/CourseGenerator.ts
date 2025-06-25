import { Course, CourseMaterial } from './CourseTypes';
import { ContentProcessor } from './ContentProcessor';
import { FileProcessingService } from '../FileProcessingService';
import { ChatGPTService } from '../ChatGPTService';
import { PDFGenerationService } from '../PDFGenerationService';

export class CourseGenerator {
  static async generateCourse(prompt: string, files: File[] = [], fileContent: string = '', testName?: string): Promise<Course> {
    console.log('🔍 CRITICAL: Starting course generation with strict file content validation:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName
    });

    const courseId = this.generateId();

    try {
      // CRITICAL FIX: Force file content requirement - NO GENERIC FALLBACKS
      let validatedFileContent = '';
      
      if (files && files.length > 0) {
        console.log('🔍 Processing uploaded files for REAL content extraction...');
        
        for (const file of files) {
          try {
            const processedFile = await FileProcessingService.processFile(file);
            console.log(`📄 File processing result for ${file.name}:`, {
              type: processedFile.type,
              contentLength: processedFile.content?.length || 0,
              extractionMethod: processedFile.metadata.extractionMethod,
              contentPreview: processedFile.content?.substring(0, 200) + '...'
            });

            if (!processedFile.content || processedFile.content.length < 200) {
              console.error(`❌ CRITICAL: Insufficient content extracted from ${file.name}`);
              throw new Error(`Failed to extract sufficient content from ${file.name}. Only ${processedFile.content?.length || 0} characters extracted. Minimum required: 200 characters.`);
            }

            if (!ContentProcessor.isRealContent(processedFile.content)) {
              console.error(`❌ CRITICAL: Invalid content detected from ${file.name}`);
              throw new Error(`The content extracted from ${file.name} appears to be corrupted, incomplete, or not suitable for course generation. Please ensure the file is not corrupted and contains readable text.`);
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

      // CRITICAL: Debug preview for admin
      console.log('🔍 DEBUG PREVIEW - EXTRACTED CONTENT:', {
        totalLength: validatedFileContent.length,
        preview: validatedFileContent.substring(0, 500) + '...',
        wordCount: validatedFileContent.split(/\s+/).length,
        hasEducationalTerms: (validatedFileContent.match(/\b(?:chapter|section|introduction|conclusion|analysis|method|result|discussion|summary|overview|concept|principle|theory|practice|application)\b/gi) || []).length
      });

      // Generate course materials STRICTLY from validated file content
      console.log('✅ FORCING strict file-based course generation...');
      const materials = await ContentProcessor.createCourseSectionsFromRealContent(validatedFileContent, 'Uploaded Content');

      if (!materials || materials.length === 0) {
        console.error('❌ CRITICAL: Failed to create course sections from file content');
        throw new Error('Unable to generate course sections from the provided file content. The content may be too short or not suitable for educational course creation.');
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

      console.log('✅ COURSE GENERATION SUCCESS:', {
        id: course.id,
        materialsCount: course.materials.length,
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'REAL_FILE_CONTENT_ONLY'
      });

      return course;
    } catch (error) {
      console.error('❌ CRITICAL COURSE GENERATION FAILURE:', error);
      throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
