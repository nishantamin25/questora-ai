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
    console.log('🔍 ENHANCED COURSE GENERATION WITH VISUAL INTEGRATION START:', { 
      prompt: prompt.substring(0, 150) + '...', 
      fileCount: files.length, 
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      fileNames: files.map(f => f.name),
      testName,
      hasVisualContent: !!visualContent,
      diagramCount: visualContent?.diagrams.length || 0,
      timestamp: new Date().toISOString(),
      usingVisualIntegration: true
    });

    const courseId = CourseNameGenerator.generateId();

    try {
      // ENHANCED VALIDATION: Include visual content in requirements
      if (!fileContent || fileContent.length < 200) {
        throw new Error('Course generation requires substantial file content (minimum 200 characters). The system prompt mandates content extraction from uploaded files only.');
      }

      console.log('✅ ENHANCED VALIDATION: File content meets requirements, visual content available:', !!visualContent);
      
      // ENHANCED PROCESSING: Include visual content in processing
      const validatedFileContent = await CourseContentProcessor.processAndValidateContent(
        files, 
        fileContent
      );

      // ENHANCED SECTION CREATION: Create sections with visual integration
      console.log('🎨 GENERATING: Enhanced course sections with visual integration');
      const materials = await CourseSectionCreator.createEnhancedFileBasedSections(
        prompt, 
        validatedFileContent,
        { 
          followsSystemPrompt: true,
          visualContent: visualContent,
          integrationMode: 'enhanced'
        }
      );

      if (!materials || materials.length === 0) {
        console.error('❌ NO SECTIONS CREATED following enhanced guidelines');
        throw new Error('Unable to generate enhanced course sections from the file content. Please ensure your file contains substantial readable educational content or visual elements.');
      }

      // ENHANCED TIME CALCULATION: Account for visual learning elements
      const estimatedTime = this.calculateEnhancedLearningTime(materials, visualContent);

      const course: Course = {
        id: courseId,
        name: testName || this.generateEnhancedCourseName(prompt, fileContent, visualContent),
        description: this.generateEnhancedDescription(prompt, fileContent, visualContent),
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

      console.log('✅ ENHANCED COURSE GENERATION WITH VISUAL INTEGRATION SUCCESS:', {
        id: course.id,
        name: course.name,
        materialsCount: course.materials.length,
        totalContentLength: course.materials.reduce((sum, m) => sum + m.content.length, 0),
        estimatedTime: course.estimatedTime,
        hasPDF: !!course.pdfUrl,
        contentSource: 'ENHANCED_VISUAL_INTEGRATED',
        difficulty: course.difficulty,
        hasVisualElements: !!visualContent,
        diagramsIntegrated: visualContent?.diagrams.length || 0,
        isBeginnerFriendly: true,
        timestamp: new Date().toISOString()
      });

      return course;
    } catch (error) {
      console.error('❌ ENHANCED COURSE GENERATION WITH VISUALS FAILURE:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
        prompt: prompt.substring(0, 100),
        fileCount: files.length,
        hasVisualContent: !!visualContent,
        timestamp: new Date().toISOString()
      });
      
      // Enhanced error message for user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Enhanced course generation with visual integration failed: ${errorMessage}. Please ensure your uploaded files contain substantial readable educational content.`);
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
    
    let description = `This enhanced beginner-friendly course is generated from uploaded file content with advanced visual integration. The course presents key concepts, practical applications, and important considerations in an accessible format with `;
    
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
