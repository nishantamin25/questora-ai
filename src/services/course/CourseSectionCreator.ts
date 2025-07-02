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
      
      if (!generatedContent || generatedContent.length < 100) {
        throw new Error('Generated course content is too short or empty');
      }

      console.log('✅ Course content generated successfully:', generatedContent.length, 'characters');

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
        followsSystemPrompt: true
      });

      return [unifiedMaterial];
    } catch (error) {
      console.error('❌ Course section creation failed:', error);
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
