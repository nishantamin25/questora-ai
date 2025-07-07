
import { CourseMaterial } from './CourseTypes';
import { ContentGenerationService } from '../chatgpt/ContentGenerationService';
import { ProcessedVisualContent } from '../chatgpt/VisualContentPipeline';

export class CourseSectionCreator {
  static async createEnhancedFileBasedSections(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('🏗️ CREATING ENHANCED COURSE SECTIONS with Visual Integration...');

    if (!fileContent || fileContent.length < 200) {
      throw new Error('Insufficient file content for course section creation (minimum 200 characters required)');
    }

    try {
      const contentGenerator = new ContentGenerationService();
      
      // Extract visual content from contentAnalysis if available
      const visualContent: ProcessedVisualContent | undefined = contentAnalysis?.visualContent;
      
      console.log('🎨 VISUAL CONTENT INTEGRATION STATUS:', {
        hasVisualContent: !!visualContent,
        diagramCount: visualContent?.diagrams.length || 0,
        integrationMode: visualContent ? 'enhanced-visual' : 'text-only'
      });
      
      // Generate unified course content with visual integration
      const generatedContent = await contentGenerator.generateCourseContent(
        prompt, 
        fileContent,
        visualContent
      );
      
      // RELAXED VALIDATION - Accept smaller content
      if (!generatedContent) {
        throw new Error('No course content was generated');
      }
      
      const contentLength = generatedContent.length;
      const wordCount = generatedContent.split(/\s+/).length;
      
      console.log('🔍 ENHANCED GENERATED CONTENT VALIDATION:', {
        contentLength,
        wordCount,
        hasVisualIntegration: !!visualContent,
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

      console.log('✅ Enhanced course content generated successfully:', {
        contentLength,
        wordCount,
        hasVisualIntegration: !!visualContent,
        diagramCount: visualContent?.diagrams.length || 0,
        acceptedWithWarnings: contentLength < 200
      });

      // Create a single unified material with all the generated content
      const unifiedMaterial: CourseMaterial = {
        id: 'unified-course-content',
        title: visualContent?.hasVisualElements ? 'Course Content with Visual Elements' : 'Course Content',
        content: generatedContent.trim(),
        type: 'text' as const,
        order: 1
      };

      console.log('✅ ENHANCED COURSE SECTIONS CREATED with Visual Integration:', {
        sectionsCount: 1,
        totalContentLength: unifiedMaterial.content.length,
        isUnified: true,
        hasVisualIntegration: !!visualContent,
        diagramsIntegrated: visualContent?.diagrams.length || 0,
        followsSystemPrompt: true,
        relaxedValidation: true
      });

      return [unifiedMaterial];
    } catch (error) {
      console.error('❌ Enhanced course section creation with visuals failed:', error);
      
      // Enhanced error reporting with debugging info
      if (error instanceof Error) {
        if (error.message.includes('too short') || error.message.includes('insufficient')) {
          // Re-throw validation errors with full context
          throw error;
        }
      }
      
      throw new Error(`Failed to create enhanced course sections with visual integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
