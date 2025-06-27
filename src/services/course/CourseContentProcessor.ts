
import { CourseMaterial } from './CourseTypes';
import { ContentProcessor } from './ContentProcessor';
import { FileProcessingService } from '../FileProcessingService';

export class CourseContentProcessor {
  static async processAndValidateContent(
    files: File[], 
    fileContent: string = ''
  ): Promise<string> {
    console.log('📄 PROCESSING FILES WITH RELAXED VALIDATION...');
    
    let validatedFileContent = '';
    
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          console.log(`🔍 Processing file: ${file.name}`);
          const processedFile = await FileProcessingService.processFile(file);
          
          console.log(`📋 File processing result for ${file.name}:`, {
            type: processedFile.type,
            contentLength: processedFile.content?.length || 0,
            extractionMethod: processedFile.metadata.extractionMethod,
            ocrAttempted: processedFile.metadata.ocrAttempted,
            ocrSuccessful: processedFile.metadata.ocrSuccessful
          });

          // RELAXED VALIDATION: Accept any content over 50 characters
          if (!processedFile.content || processedFile.content.length < 50) {
            console.error(`❌ INSUFFICIENT CONTENT: ${file.name} - ${processedFile.content?.length || 0} chars (minimum: 50)`);
            throw new Error(`Failed to extract sufficient content from ${file.name}. Only ${processedFile.content?.length || 0} characters extracted. Please ensure the file contains readable text.`);
          }

          // RELAXED CONTENT CHECK: Just ensure it's not completely garbage
          if (!this.hasMinimalContent(processedFile.content)) {
            console.error(`❌ INVALID CONTENT: ${file.name} - content appears to be corrupted`);
            throw new Error(`Content from ${file.name} appears to be corrupted or not suitable for course generation. Please try uploading a different file format.`);
          }

          validatedFileContent += processedFile.content + '\n\n';
          console.log(`✅ VALIDATED: Content extracted from ${file.name} (${processedFile.content.length} characters)`);
          
        } catch (error) {
          console.error(`❌ File processing error ${file.name}:`, error);
          throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else if (fileContent && fileContent.trim().length > 20) {
      // RELAXED: Accept any file content over 20 characters
      if (!this.hasMinimalContent(fileContent)) {
        console.error('❌ INVALID PROVIDED CONTENT');
        throw new Error('The provided file content appears to be corrupted or insufficient for course generation.');
      }
      validatedFileContent = fileContent;
      console.log('✅ VALIDATED: Content provided via parameter');
    } else {
      console.error('❌ NO VALID CONTENT: Course generation blocked');
      throw new Error('Course generation requires uploaded files with readable content. Please upload files containing text that can be processed.');
    }

    console.log('✅ CONTENT PROCESSING COMPLETE:', {
      totalContentLength: validatedFileContent.length,
      wordCount: validatedFileContent.split(/\s+/).length
    });

    return validatedFileContent;
  }

  static validateContentRequirements(files: File[], fileContent: string): void {
    // RELAXED: Just check that we have something to work with
    if (!files || files.length === 0) {
      if (!fileContent || fileContent.trim().length < 20) {
        throw new Error('Course generation requires uploaded files with readable content. Please upload files containing text that can be processed.');
      }
    }
  }

  // RELAXED: Minimal content validation
  private static hasMinimalContent(content: string): boolean {
    if (!content || content.length < 20) {
      return false;
    }
    
    // Check for basic readable characteristics
    const words = content.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word));
    const readableChars = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length;
    const readableRatio = readableChars / content.length;
    
    // Very lenient requirements
    return words.length >= 3 && readableRatio > 0.5;
  }
}
