import { Course, CourseMaterial } from './CourseTypes';
import { CourseContentProcessor } from './CourseContentProcessor';
import { CourseSectionCreator } from './CourseSectionCreator';
import { CourseNameGenerator } from './CourseNameGenerator';
import { PDFGenerationService } from '../PDFGenerationService';
import { ProcessedVisualContent } from '../chatgpt/VisualContentPipeline';

export class CourseGenerator {
  static async generateCourse(
    prompt: string, 
    files: File[] = [], 
    fileContent: string = '', 
    testName?: string,
    visualContent?: ProcessedVisualContent
  ): Promise<Course> {
    console.log('🔍 ENHANCED COURSE GENERATION WITH ADVANCED VISUAL INTEGRATION START:', { 
      prompt: prompt.substring(0, 150) + '...', 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName,
      hasProvidedVisualContent: !!visualContent,
      providedDiagramCount: visualContent?.diagrams.length || 0,
      timestamp: new Date().toISOString(),
      usingAdvancedVisualIntegration: true
    });

    const courseId = CourseNameGenerator.generateId();

    try {
      // ENHANCED VALIDATION: Include visual content in requirements
      if (!fileContent || fileContent.length < 200) {
        throw new Error('Course generation requires substantial file content (minimum 200 characters). The system prompt mandates content extraction from uploaded files only.');
      }

      // ENHANCED PROCESSING: Process content with visual integration
      const processingResults = await CourseContentProcessor.processAndValidateContent(
        files, 
        fileContent
      );

      // Use provided visual content or discovered visual content
      const finalVisualContent = visualContent || processingResults.visualContent;

      console.log('✅ ENHANCED VALIDATION AND PROCESSING COMPLETE:', {
        contentLength: processingResults.content.length,
        hasVisualContent: !!finalVisualContent,
        totalDiagrams: finalVisualContent?.diagrams.length || 0,
        visualQuality: finalVisualContent?.processingMetadata.processingQuality || 'none'
      });
      
      // ENHANCED SECTION CREATION: Create sections with comprehensive visual integration
      console.log('🎨 GENERATING: Enhanced course sections with comprehensive visual integration');
      const materials = await CourseSectionCreator.createEnhancedFileBasedSections(
        prompt, 
        processingResults.content,
        { 
          followsSystemPrompt: true,
          visualContent: finalVisualContent,
          integrationMode: 'comprehensive'
        }
      );

      if (!materials || materials.length === 0) {
        console.error('❌ NO SECTIONS CREATED following enhanced guidelines');
        throw new Error('Unable to generate enhanced course sections from the file content. Please ensure your file contains substantial readable educational content or visual elements.');
      }

      // ENHANCED TIME CALCULATION: Account for visual learning elements
      const estimatedTime = this.calculateEnhancedLearningTime(materials, finalVisualContent);

      const course: Course = {
        id: courseId,
        name: testName || this.generateEnhancedCourseName(prompt, processingResults.content, finalVisualContent),
        description: this.generateEnhancedDescription(prompt, processingResults.content, finalVisualContent),
        materials: materials,
        estimatedTime,
        createdAt: new Date().toISOString(),
        difficulty: 'easy', // Enhanced courses remain beginner-friendly
        isActive: true
      };

      // Generate PDF with error recovery
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('✅ Enhanced Course PDF generated successfully');
      } catch (pdfError) {
        console.error('⚠️ PDF generation failed, continuing without PDF:', pdfError);
      }

      console.log('✅ ENHANCED COURSE GENERATION WITH COMPREHENSIVE VISUAL INTEGRATION SUCCESS:', {
        id: course.id,
        name: course.name,
        materialsCount: course.materials.length,
        totalContentLength: course.materials.reduce((sum, m) => sum + m.content.length, 0),
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'COMPREHENSIVE_VISUAL_INTEGRATED',
        difficulty: course.difficulty,
        hasVisualElements: !!finalVisualContent,
        diagramsIntegrated: finalVisualContent?.diagrams.length || 0,
        visualQuality: finalVisualContent?.processingMetadata.processingQuality || 'none',
        isBeginnerFriendly: true,
        timestamp: new Date().toISOString()
      });

      return course;
    } catch (error) {
      console.error('❌ ENHANCED COURSE GENERATION WITH COMPREHENSIVE VISUALS FAILURE:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
        prompt: prompt.substring(0, 100),
        fileCount: files.length,
        hasVisualContent: !!visualContent,
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error message for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Enhanced course generation with comprehensive visual integration failed: ${errorMessage}. Please ensure your uploaded files contain substantial readable educational content.`);
    }
  }

  // ENHANCED: Calculate time including visual learning elements
  private static calculateEnhancedLearningTime(materials: CourseMaterial[], visualContent?: ProcessedVisualContent): number {
    const totalWords = materials.reduce((sum, material) => {
      return sum + (material.content ? material.content.split(/\s+/).length : 0);
    }, 0);
    
    // Base reading time: ~150 words per minute (beginner-friendly)
    let readingTime = Math.ceil(totalWords / 150);
    
    // Add time for visual elements (diagrams require additional processing time)
    if (visualContent?.hasVisualElements) {
      const diagramTime = visualContent.diagrams.length * 2; // 2 minutes per diagram
      readingTime += diagramTime;
      console.log('📊 Added visual learning time:', diagramTime, 'minutes for', visualContent.diagrams.length, 'diagrams');
    }
    
    // Add time for reflection and understanding (beginner-friendly)
    return Math.max(readingTime + 10, 15); // Minimum 15 minutes for any course
  }

  // ENHANCED: Generate course name considering visual content
  private static generateEnhancedCourseName(prompt: string, fileContent: string, visualContent?: ProcessedVisualContent): string {
    // Extract key terms from file content and visual elements
    let words = fileContent.toLowerCase().split(/[^\w]+/);
    
    // Add visual element terms
    if (visualContent?.hasVisualElements) {
      const visualTerms = visualContent.diagrams.flatMap(d => 
        d.title.toLowerCase().split(/[^\w]+/).concat(d.type)
      );
      words = words.concat(visualTerms);
    }
    
    const meaningfulWords = words.filter(word => 
      word.length > 4 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'your', 'how', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'many', 'some', 'what', 'know', 'water', 'than', 'call', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'over', 'such', 'take', 'them', 'well', 'were'].includes(word)
    );
    
    // Count word frequency
    const wordCount: { [key: string]: number } = {};
    meaningfulWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Get most frequent meaningful word
    const topWord = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topWord && topWord[0]) {
      const capitalizedWord = topWord[0].charAt(0).toUpperCase() + topWord[0].slice(1);
      const suffix = visualContent?.hasVisualElements ? ' Visual Course' : ' Course';
      return `${capitalizedWord}${suffix}`;
    }
    
    // Fallback to prompt-based name
    const promptWords = prompt.split(/\s+/).filter(w => w.length > 3);
    if (promptWords.length > 0) {
      const suffix = visualContent?.hasVisualElements ? ' Visual Course' : ' Course';
      return `${promptWords[0].charAt(0).toUpperCase() + promptWords[0].slice(1)}${suffix}`;
    }
    
    return visualContent?.hasVisualElements ? 'Visual Learning Course' : 'Educational Course';
  }

  // ENHANCED: Generate description including visual elements
  private static generateEnhancedDescription(prompt: string, fileContent: string, visualContent?: ProcessedVisualContent): string {
    const wordCount = fileContent.split(/\s+/).length;
    const estimatedReadingTime = Math.ceil(wordCount / 150);
    
    let description = `This enhanced beginner-friendly course is generated from uploaded file content with comprehensive visual integration. The course presents key concepts, practical applications, and important considerations in an accessible format with `;
    
    if (visualContent?.hasVisualElements) {
      description += `${visualContent.diagrams.length} integrated diagrams and visual elements. `;
      description += `Visual content includes: ${visualContent.visualSummary} `;
    } else {
      description += `clear textual explanations. `;
    }
    
    description += `Content is based strictly on the provided file material with approximately ${wordCount} words, estimated reading time of ${estimatedReadingTime} minutes`;
    
    if (visualContent?.hasVisualElements) {
      const visualTime = visualContent.diagrams.length * 2;
      description += ` plus ${visualTime} minutes for visual element study`;
    }
    
    description += `.`;
    
    return description;
  }

  // Production diagnostics method
  static generateDiagnosticReport(prompt: string, files: File[], fileContent: string): any {
    return {
      timestamp: new Date().toISOString(),
      input: {
        prompt: {
          provided: !!prompt,
          length: prompt?.length || 0,
          preview: prompt?.substring(0, 100) + '...' || 'No prompt'
        },
        files: {
          count: files?.length || 0,
          names: files?.map(f => f.name) || [],
          totalSize: files?.reduce((sum, f) => sum + f.size, 0) || 0
        },
        fileContent: {
          provided: !!fileContent,
          length: fileContent?.length || 0,
          wordCount: fileContent?.split(/\s+/).length || 0,
          preview: fileContent?.substring(0, 200) + '...' || 'No content'
        }
      },
      validation: {
        hasMinimumContent: (fileContent?.length || 0) >= 200,
        canProceed: (files?.length > 0) || (fileContent?.length >= 200)
      },
      recommendations: this.generateRecommendations(prompt, files, fileContent)
    };
  }

  private static generateRecommendations(prompt: string, files: File[], fileContent: string): string[] {
    const recommendations = [];
    
    if (!prompt || prompt.length < 10) {
      recommendations.push('Provide a more detailed prompt describing your course requirements');
    }
    
    if (!files || files.length === 0) {
      if (!fileContent || fileContent.length < 200) {
        recommendations.push('Upload files with substantial text content (minimum 200 characters)');
      }
    }
    
    if (files && files.length > 5) {
      recommendations.push('Consider reducing the number of files for better processing');
    }
    
    if (fileContent && fileContent.length > 50000) {
      recommendations.push('Consider splitting very large documents into smaller sections');
    }
    
    return recommendations;
  }
}
