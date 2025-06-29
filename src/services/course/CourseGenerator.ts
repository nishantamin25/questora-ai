
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
    console.log('🔍 ENHANCED COURSE GENERATION START (Following System Prompt):', { 
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
      // ENHANCED: Validate content requirements per system prompt
      CourseContentProcessor.validateContentRequirements(files, fileContent);
      
      // ENHANCED: Process content with detailed analysis
      const processedContent = await this.analyzeContentForCourse(fileContent, prompt);
      
      console.log('✅ ENHANCED Content Analysis Complete:', {
        contentType: processedContent.type,
        complexity: processedContent.complexity,
        keyTopics: processedContent.keyTopics.slice(0, 3),
        structureDetected: processedContent.hasStructure,
        wordCount: processedContent.wordCount
      });

      const validatedFileContent = await CourseContentProcessor.processAndValidateContent(
        files, 
        fileContent
      );

      // ENHANCED: Generate course materials with structured approach
      console.log('🔒 GENERATING: Enhanced course sections from analyzed content');
      const materials = await this.createStructuredCourseMaterials(
        prompt, 
        validatedFileContent,
        processedContent
      );

      if (!materials || materials.length === 0) {
        console.error('❌ NO SECTIONS CREATED from analyzed content');
        throw new Error('Unable to generate course sections from the file content. The content analysis could not identify suitable learning materials. Please ensure your file contains substantial readable educational content.');
      }

      // Optimize section count based on content complexity
      const optimalSectionCount = this.calculateOptimalSections(processedContent);
      const finalMaterials = materials.slice(0, optimalSectionCount);
      
      if (finalMaterials.length === 0) {
        throw new Error('No valid course sections could be created from the analyzed content.');
      }

      const estimatedTime = CourseNameGenerator.calculateEstimatedTime(finalMaterials);

      const course: Course = {
        id: courseId,
        name: testName || this.generateEnhancedCourseName(prompt, processedContent),
        description: this.generateEnhancedCourseDescription(prompt, processedContent, finalMaterials.length),
        materials: finalMaterials,
        estimatedTime,
        createdAt: new Date().toISOString(),
        difficulty: this.mapComplexityToDifficulty(processedContent.complexity)
      };

      // Generate PDF with error recovery
      try {
        const pdfUrl = PDFGenerationService.generateCoursePDF(course);
        course.pdfUrl = pdfUrl;
        console.log('✅ Enhanced Course PDF generated successfully');
      } catch (pdfError) {
        console.error('⚠️ PDF generation failed, continuing without PDF:', pdfError);
      }

      console.log('✅ ENHANCED COURSE GENERATION SUCCESS:', {
        id: course.id,
        name: course.name,
        materialsCount: course.materials.length,
        totalContentLength: course.materials.reduce((sum, m) => sum + m.content.length, 0),
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'ENHANCED_FILE_ANALYSIS',
        contentType: processedContent.type,
        complexity: processedContent.complexity,
        timestamp: new Date().toISOString()
      });

      return course;
    } catch (error) {
      console.error('❌ ENHANCED COURSE GENERATION FAILURE:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
        prompt: prompt.substring(0, 100),
        fileCount: files.length,
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error message for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Enhanced course generation failed: ${errorMessage}. Please ensure your uploaded files contain substantial readable educational content that can be analyzed according to the system prompt requirements.`);
    }
  }

  // ENHANCED: Analyze content structure and themes for better course generation
  private static async analyzeContentForCourse(fileContent: string, userPrompt: string): Promise<{
    type: string;
    complexity: 'basic' | 'intermediate' | 'advanced';
    keyTopics: string[];
    hasStructure: boolean;
    wordCount: number;
    sections: string[];
    learningObjectives: string[];
  }> {
    console.log('🔍 ANALYZING CONTENT for Enhanced Course Generation...');

    const wordCount = fileContent.split(/\s+/).length;
    
    // Identify content type
    const type = this.identifyEducationalContentType(fileContent);
    
    // Assess complexity
    const complexity = this.assessEducationalComplexity(fileContent);
    
    // Extract key topics
    const keyTopics = this.extractEducationalTopics(fileContent);
    
    // Detect structure
    const sections = this.detectContentSections(fileContent);
    const hasStructure = sections.length > 0;
    
    // Infer learning objectives
    const learningObjectives = this.inferLearningObjectives(fileContent, userPrompt);

    const analysis = {
      type,
      complexity,
      keyTopics,
      hasStructure,
      wordCount,
      sections,
      learningObjectives
    };

    console.log('✅ CONTENT ANALYSIS COMPLETE:', analysis);
    return analysis;
  }

  private static identifyEducationalContentType(content: string): string {
    const patterns = {
      'academic_course': /syllabus|curriculum|lecture|assignment|semester|module|unit/i,
      'technical_manual': /procedure|instruction|step|method|process|technique/i,
      'research_paper': /abstract|methodology|conclusion|references|findings|hypothesis/i,
      'training_material': /training|workshop|skill|competency|learning|development/i,
      'business_document': /strategy|analysis|report|presentation|proposal|plan/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }
    
    return 'general_educational';
  }

  private static assessEducationalComplexity(content: string): 'basic' | 'intermediate' | 'advanced' {
    const advancedTerms = /methodology|framework|implementation|optimization|sophisticated|comprehensive|intricate/gi;
    const intermediateTerms = /analysis|concept|principle|application|understanding|knowledge/gi;
    const basicTerms = /simple|basic|introduction|overview|fundamental|elementary/gi;

    const advancedCount = (content.match(advancedTerms) || []).length;
    const intermediateCount = (content.match(intermediateTerms) || []).length;
    const basicCount = (content.match(basicTerms) || []).length;

    const avgWordsPerSentence = content.split(/[.!?]/).reduce((sum, s) => sum + s.split(' ').length, 0) / content.split(/[.!?]/).length;

    if (advancedCount > 10 || avgWordsPerSentence > 25) {
      return 'advanced';
    } else if (intermediateCount > 15 || avgWordsPerSentence > 18) {
      return 'intermediate';
    }
    return 'basic';
  }

  private static extractEducationalTopics(content: string): string[] {
    // Extract meaningful educational terms
    const educationalWords = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 5 && 
        !/^(and|the|for|are|but|not|you|all|can|had|her|was|one|our|out|may|new|now|see|two|who|did|get|has|him|his|how|its|old|day|come|make|than|time|very|what|with|have|from|they|know|want|been|good|much|some|will|said|each|which|their|would|there|think|where|being|every|great|might|shall|still|those|under|while|could|should|would|through|during|before|after|above|below|between|among|within)$/.test(word)
      );

    const wordCount: { [key: string]: number } = {};
    educationalWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .filter(([, count]) => count >= 2) // Only include words that appear multiple times
      .sort(([,a], [,b]) => b - a)
      .slice(0, 12)
      .map(([word]) => word);
  }

  private static detectContentSections(content: string): string[] {
    const lines = content.split('\n');
    const sections: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      // Look for various section header patterns
      if (
        /^#+\s/.test(trimmed) || // Markdown headers
        /^\d+\.\s/.test(trimmed) || // Numbered sections
        /^[A-Z][^a-z]*:/.test(trimmed) || // ALL CAPS headers with colon
        /^(chapter|section|unit|module|lesson|part)\s+\d+/i.test(trimmed) || // Explicit section indicators
        (/^[A-Z]/.test(trimmed) && trimmed.length < 100 && trimmed.endsWith(':')) // Capitalized short lines ending with colon
      ) {
        sections.push(trimmed);
      }
    });
    
    return sections.slice(0, 10); // Limit to reasonable number
  }

  private static inferLearningObjectives(content: string, userPrompt: string): string[] {
    const objectives: string[] = [];
    
    // Extract explicit learning objectives if present
    const objectivePatterns = [
      /(?:learning objectives?|goals?|aims?|outcomes?)[:\s]+(.*)/gi,
      /(?:students? will|learners? will|participants? will)[:\s]+(.*)/gi,
      /(?:by the end|after completing|upon completion)[:\s]+(.*)/gi
    ];

    objectivePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const objective = match.replace(pattern, '$1').trim();
          if (objective.length > 10 && objective.length < 200) {
            objectives.push(objective);
          }
        });
      }
    });

    // If no explicit objectives found, infer from content and prompt
    if (objectives.length === 0) {
      const topicWords = this.extractEducationalTopics(content).slice(0, 5);
      const promptWords = userPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 3);
      
      objectives.push(`Understand key concepts related to ${topicWords.slice(0, 3).join(', ')}`);
      if (promptWords.length > 0) {
        objectives.push(`Apply knowledge from ${promptWords.join(' ')} context`);
      }
      objectives.push(`Analyze and evaluate information presented in the content`);
    }

    return objectives.slice(0, 5); // Limit to reasonable number
  }

  private static async createStructuredCourseMaterials(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('🏗️ CREATING STRUCTURED COURSE MATERIALS based on analysis...');

    // Use enhanced section creation with content analysis
    const materials = await CourseSectionCreator.createEnhancedFileBasedSections(
      prompt,
      fileContent,
      contentAnalysis
    );

    return materials;
  }

  private static calculateOptimalSections(contentAnalysis: any): number {
    const { wordCount, complexity, hasStructure } = contentAnalysis;
    
    let sectionCount = 3; // Default minimum
    
    // Adjust based on word count
    if (wordCount > 2000) sectionCount = 4;
    if (wordCount > 4000) sectionCount = 5;
    if (wordCount > 6000) sectionCount = 6;
    
    // Adjust based on complexity
    if (complexity === 'advanced') sectionCount += 1;
    if (complexity === 'basic') sectionCount = Math.max(sectionCount - 1, 3);
    
    // Adjust based on structure
    if (hasStructure) sectionCount += 1;
    
    return Math.min(sectionCount, 7); // Cap at reasonable maximum
  }

  private static generateEnhancedCourseName(prompt: string, contentAnalysis: any): string {
    const keyTopics = contentAnalysis.keyTopics.slice(0, 2);
    const promptWords = prompt.split(/\s+/).filter(w => w.length > 3).slice(0, 2);
    
    if (keyTopics.length > 0) {
      return `${keyTopics[0].charAt(0).toUpperCase() + keyTopics[0].slice(1)} Course`;
    } else if (promptWords.length > 0) {
      return `${promptWords.join(' ')} Learning Course`;
    } else {
      return CourseNameGenerator.generateCourseName(prompt);
    }
  }

  private static generateEnhancedCourseDescription(prompt: string, contentAnalysis: any, sectionCount: number): string {
    const { type, complexity, keyTopics, learningObjectives } = contentAnalysis;
    
    let description = `This comprehensive course is based on ${type.replace(/_/g, ' ')} content with ${complexity} complexity level. `;
    
    if (keyTopics.length > 0) {
      description += `Key topics covered include: ${keyTopics.slice(0, 4).join(', ')}. `;
    }
    
    description += `The course is structured into ${sectionCount} learning sections. `;
    
    if (learningObjectives.length > 0) {
      description += `Learning objectives: ${learningObjectives[0]}`;
    }
    
    return description;
  }

  private static mapComplexityToDifficulty(complexity: 'basic' | 'intermediate' | 'advanced'): 'easy' | 'medium' | 'hard' {
    switch (complexity) {
      case 'basic': return 'easy';
      case 'intermediate': return 'medium';
      case 'advanced': return 'hard';
      default: return 'medium';
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
