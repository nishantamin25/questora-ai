
import { Course, CourseMaterial } from './CourseTypes';
import { CourseContentProcessor } from './CourseContentProcessor';
import { CourseSectionCreator } from './CourseSectionCreator';
import { CourseNameGenerator } from './CourseNameGenerator';
import { PDFGenerationService } from '../PDFGenerationService';

export class CourseGenerator {
  static async generateCourse(
    prompt: string, 
    files: File[] = [], 
    fileContent: string = '', 
    testName?: string
  ): Promise<Course> {
    console.log('🔍 PRODUCTION COURSE GENERATION START:', { 
      prompt: prompt.substring(0, 150) + '...', 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName,
      timestamp: new Date().toISOString()
    });

    const courseId = CourseNameGenerator.generateId();

    try {
      // STRICT REQUIREMENT: Validate content requirements
      CourseContentProcessor.validateContentRequirements(files, fileContent);
      
      const validatedFileContent = await CourseContentProcessor.processAndValidateContent(
        files, 
        fileContent
      );

      console.log('✅ Content validated successfully:', {
        finalContentLength: validatedFileContent.length,
        wordCount: validatedFileContent.split(/\s+/).length
      });

      // PRODUCTION: Generate course materials with enhanced error handling
      console.log('🔒 GENERATING: Course sections from validated file content');
      const materials = await CourseSectionCreator.createStrictFileBasedSections(
        prompt, 
        validatedFileContent
      );

      if (!materials || materials.length === 0) {
        console.error('❌ NO SECTIONS CREATED from content');
        throw new Error('Unable to generate course sections from the file content. The content may be too short or not suitable for the requested course structure. Please ensure your file contains substantial readable text.');
      }

      // Limit to reasonable section count but ensure we have content
      const finalMaterials = materials.slice(0, 5); // Increased from 3 to allow more sections
      
      if (finalMaterials.length === 0) {
        throw new Error('No valid course sections could be created from the provided content.');
      }

      const estimatedTime = CourseNameGenerator.calculateEstimatedTime(finalMaterials);

      const course: Course = {
        id: courseId,
        name: testName || CourseNameGenerator.generateCourseName(prompt),
        description: CourseNameGenerator.generateStrictCourseDescription(prompt, files, finalMaterials.length),
        materials: finalMaterials,
        estimatedTime,
        createdAt: new Date().toISOString(),
        difficulty: 'medium'
      };

      // Generate PDF with error recovery
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('✅ Course PDF generated successfully');
      } catch (pdfError) {
        console.error('⚠️ PDF generation failed, continuing without PDF:', pdfError);
        // Don't fail the entire course generation for PDF issues
      }

      console.log('✅ PRODUCTION COURSE GENERATION SUCCESS:', {
        id: course.id,
        name: course.name,
        materialsCount: course.materials.length,
        totalContentLength: course.materials.reduce((sum, m) => sum + m.content.length, 0),
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'FILE_CONTENT_STRICT',
        timestamp: new Date().toISOString()
      });

      return course;
    } catch (error) {
      console.error('❌ PRODUCTION COURSE GENERATION FAILURE:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
        prompt: prompt.substring(0, 100),
        fileCount: files.length,
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error message for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Course generation failed: ${errorMessage}. Please ensure your uploaded files contain substantial readable text content.`);
    }
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
