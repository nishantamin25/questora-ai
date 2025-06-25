
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
    console.log('🔍 STRICT COURSE GENERATION: File-based content only:', { 
      prompt, 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName
    });

    const courseId = CourseNameGenerator.generateId();

    try {
      // ABSOLUTE REQUIREMENT: No course generation without substantial file content
      CourseContentProcessor.validateContentRequirements(files, fileContent);
      
      const validatedFileContent = await CourseContentProcessor.processAndValidateContent(
        files, 
        fileContent
      );

      // STRICT: Generate course materials from file content only
      console.log('🔒 GENERATING: Course sections from file content only');
      const materials = await CourseSectionCreator.createStrictFileBasedSections(
        prompt, 
        validatedFileContent
      );

      if (!materials || materials.length === 0) {
        console.error('❌ NO SECTIONS CREATED');
        throw new Error('Unable to generate course sections from the file content. The content may be too short or not suitable for the requested course structure.');
      }

      const finalMaterials = materials.slice(0, 3);
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
}
