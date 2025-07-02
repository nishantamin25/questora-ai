
import { CourseMaterial } from './CourseTypes';
import { ContentGenerationService } from '../chatgpt/ContentGenerationService';

export class CourseSectionCreator {
  static async createEnhancedFileBasedSections(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('🏗️ CREATING COURSE SECTIONS with System Prompt Guidelines...');

    if (!fileContent || fileContent.length < 200) {
      throw new Error('Insufficient file content for course section creation (minimum 200 characters required)');
    }

    try {
      const contentGenerator = new ContentGenerationService();
      
      // Generate unified course content using the specialized system prompt
      const generatedContent = await contentGenerator.generateCourseContent(prompt, fileContent);
      
      // RELAXED VALIDATION - Accept smaller content
      if (!generatedContent) {
        throw new Error('No course content was generated');
      }
      
      const contentLength = generatedContent.length;
      const wordCount = generatedContent.split(/\s+/).length;
      
      console.log('🔍 GENERATED CONTENT VALIDATION:', {
        contentLength,
        wordCount,
        preview: generatedContent.substring(0, 150) + '...'
      });
      
      // MUCH MORE TOLERANT THRESHOLDS
      if (contentLength < 30) {
        console.error('❌ Generated content extremely short:', contentLength, 'characters');
        console.error('📄 ACTUAL CONTENT:', generatedContent);
        throw new Error(`Generated course content is too short (${contentLength} characters): "${generatedContent}"`);
      }
      
      if (wordCount < 10) {
        console.error('❌ Generated content has too few words:', wordCount);
        console.error('📄 ACTUAL CONTENT:', generatedContent);
        throw new Error(`Generated course content has insufficient words (${wordCount} words): "${generatedContent}"`);
      }
      
      // ACCEPT with warnings for borderline cases
      if (contentLength < 200) {
        console.warn('⚠️ Generated content is shorter than ideal but acceptable:', contentLength, 'characters');
      }

      console.log('✅ Course content generated successfully:', {
        contentLength,
        wordCount,
        acceptedWithWarnings: contentLength < 200
      });

      // Create a single unified material with all the generated content
      const unifiedMaterial: CourseMaterial = {
        id: 'unified-course-content',
        title: 'Course Content',
        content: generatedContent.trim(),
        type: 'text' as const,
        order: 1
      };

      console.log('✅ COURSE SECTIONS CREATED following System Prompt guidelines:', {
        sectionsCount: 1,
        totalContentLength: unifiedMaterial.content.length,
        isUnified: true,
        followsSystemPrompt: true,
        relaxedValidation: true
      });

      return [unifiedMaterial];
    } catch (error) {
      console.error('❌ Course section creation failed:', error);
      
      // Enhanced error reporting with debugging info
      if (error instanceof Error) {
        if (error.message.includes('too short') || error.message.includes('insufficient')) {
          // Re-throw validation errors with full context
          throw error;
        }
      }
      
      throw new Error(`Failed to create course sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Keep existing methods for backward compatibility
  static async createFileBasedSections(
    prompt: string,
    fileContent: string,
    targetSections: number = 3
  ): Promise<CourseMaterial[]> {
    // Redirect to the new enhanced method
    return this.createEnhancedFileBasedSections(prompt, fileContent, { sections: targetSections });
  }

  static generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }
}
