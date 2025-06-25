
import { CourseMaterial } from './CourseTypes';
import { ContentProcessor } from './ContentProcessor';
import { FileProcessingService } from '../FileProcessingService';

export class CourseContentProcessor {
  static async processAndValidateContent(
    files: File[], 
    fileContent: string = ''
  ): Promise<string> {
    console.log('📄 Processing files for strict content extraction...');
    
    let validatedFileContent = '';
    
    if (files && files.length > 0) {
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

    return validatedFileContent;
  }

  static validateContentRequirements(files: File[], fileContent: string): void {
    if (!files || files.length === 0) {
      if (!fileContent || fileContent.trim().length < 200) {
        throw new Error('Course generation requires uploaded files with substantial content (minimum 200 characters). Generic course generation without file content is not supported.');
      }
    }
  }
}
