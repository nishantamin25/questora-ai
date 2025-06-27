
import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class CourseSectionCreator {
  private static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static async createStrictFileBasedSections(
    userPrompt: string, 
    fileContent: string
  ): Promise<CourseMaterial[]> {
    console.log('🔒 PRODUCTION COURSE SECTION CREATION:', {
      promptLength: userPrompt.length,
      fileContentLength: fileContent.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Enhanced content generation with strict file-based approach
      const organizedContent = await ChatGPTService.generateContent(
        this.createProductionCoursePrompt(userPrompt),
        fileContent
      );
      
      const sections = this.parseContentIntoSections(organizedContent, userPrompt);
      
      if (sections.length > 0) {
        console.log('✅ Content organized successfully with AI enhancement:', {
          sectionsGenerated: sections.length,
          totalContentLength: sections.reduce((sum, s) => sum + s.content.length, 0)
        });
        return sections;
      } else {
        console.warn('⚠️ AI organization failed, using direct content splitting');
        return this.createDirectContentSections(userPrompt, fileContent);
      }

    } catch (error) {
      console.error('❌ AI course organization error:', error);
      console.log('🔄 Fallback: Direct content splitting');
      return this.createDirectContentSections(userPrompt, fileContent);
    }
  }

  private static createProductionCoursePrompt(userPrompt: string): string {
    return `Organize the provided document content into a structured course format based on this request: "${userPrompt}"

REQUIREMENTS:
1. Use ONLY the content from the provided document
2. Do NOT add external educational frameworks, methodologies, or concepts
3. Structure the content according to the user's specific requirements
4. Preserve all factual information from the source document
5. Create clear section breaks using ## Section Title format
6. Ensure each section has substantial content (minimum 100 words)
7. Follow the user's requested structure (pages, modules, chapters, etc.)

STRICT RULE: Base everything on the document content - no fabrication or external knowledge injection.`;
  }

  static async createDirectContentSections(userPrompt: string, fileContent: string): Promise<CourseMaterial[]> {
    console.log('📋 DIRECT CONTENT SECTIONING:', {
      promptLength: userPrompt.length,
      contentLength: fileContent.length
    });
    
    // Enhanced section detection from user prompt
    const promptLower = userPrompt.toLowerCase();
    let targetSections = 3; // default
    
    // More comprehensive section detection
    const sectionPatterns = [
      { pattern: /(\d+)[-\s]*page/g, type: 'page' },
      { pattern: /(\d+)[-\s]*section/g, type: 'section' },
      { pattern: /(\d+)[-\s]*module/g, type: 'module' },
      { pattern: /(\d+)[-\s]*chapter/g, type: 'chapter' },
      { pattern: /(\d+)[-\s]*lesson/g, type: 'lesson' },
      { pattern: /(\d+)[-\s]*part/g, type: 'part' }
    ];
    
    let sectionType = 'section';
    for (const { pattern, type } of sectionPatterns) {
      const match = pattern.exec(promptLower);
      if (match) {
        targetSections = parseInt(match[1]);
        sectionType = type;
        break;
      }
    }
    
    targetSections = Math.max(1, Math.min(5, targetSections));
    
    console.log('📊 Section planning:', { targetSections, sectionType });
    
    const materials: CourseMaterial[] = [];
    
    // Enhanced content splitting strategy
    const contentSections = this.intelligentContentSplit(fileContent, targetSections);
    
    contentSections.forEach((sectionContent, index) => {
      if (sectionContent.trim().length > 50) {
        materials.push({
          id: `section_${index + 1}`,
          title: this.generateContextualSectionTitle(userPrompt, sectionType, index + 1, targetSections, sectionContent),
          content: sectionContent.trim(),
          type: 'text',
          order: index + 1
        });
      }
    });

    console.log('✅ Direct sectioning completed:', {
      sectionsCreated: materials.length,
      averageLength: materials.reduce((sum, m) => sum + m.content.length, 0) / materials.length
    });

    return materials.slice(0, targetSections);
  }

  private static intelligentContentSplit(content: string, targetSections: number): string[] {
    // Strategy 1: Try splitting by clear section markers
    const sectionMarkers = /(?:\n\s*(?:Chapter|Section|Part|Module|\d+\.)\s*[^\n]*\n)|(?:\n\s*[A-Z][^.!?]*[.!?]\s*\n)/g;
    let sections = content.split(sectionMarkers).filter(s => s.trim().length > 100);
    
    if (sections.length >= targetSections) {
      return this.balanceSections(sections, targetSections);
    }
    
    // Strategy 2: Split by paragraphs
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    if (paragraphs.length >= targetSections) {
      return this.groupParagraphs(paragraphs, targetSections);
    }
    
    // Strategy 3: Split by sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    return this.groupSentences(sentences, targetSections);
  }

  private static balanceSections(sections: string[], targetCount: number): string[] {
    if (sections.length <= targetCount) {
      return sections;
    }
    
    // Merge smaller sections to reach target count
    const balanced = [];
    const sectionsPerGroup = Math.ceil(sections.length / targetCount);
    
    for (let i = 0; i < sections.length; i += sectionsPerGroup) {
      const group = sections.slice(i, i + sectionsPerGroup);
      balanced.push(group.join('\n\n'));
    }
    
    return balanced;
  }

  private static groupParagraphs(paragraphs: string[], targetCount: number): string[] {
    const groups = [];
    const paragraphsPerGroup = Math.ceil(paragraphs.length / targetCount);
    
    for (let i = 0; i < paragraphs.length; i += paragraphsPerGroup) {
      const group = paragraphs.slice(i, i + paragraphsPerGroup);
      groups.push(group.join('\n\n'));
    }
    
    return groups;
  }

  private static groupSentences(sentences: string[], targetCount: number): string[] {
    const groups = [];
    const sentencesPerGroup = Math.ceil(sentences.length / targetCount);
    
    for (let i = 0; i < sentences.length; i += sentencesPerGroup) {
      const group = sentences.slice(i, i + sentencesPerGroup);
      groups.push(group.join('. ').trim() + '.');
    }
    
    return groups;
  }

  private static generateContextualSectionTitle(
    userPrompt: string, 
    sectionType: string, 
    sectionNumber: number, 
    totalSections: number,
    sectionContent: string
  ): string {
    // Try to extract a meaningful title from the content
    const firstLine = sectionContent.split(/[.\n]/)[0]?.trim();
    
    if (firstLine && firstLine.length > 10 && firstLine.length < 80) {
      // Use first line if it looks like a title
      const cleanTitle = firstLine.replace(/^[^\w]*/, '').replace(/[^\w]*$/, '');
      if (cleanTitle.length > 5) {
        return cleanTitle;
      }
    }
    
    // Fallback to structured naming
    const typeMap = {
      'page': 'Page',
      'section': 'Section',
      'module': 'Module',
      'chapter': 'Chapter',
      'lesson': 'Lesson',
      'part': 'Part'
    };
    
    return `${typeMap[sectionType] || 'Section'} ${sectionNumber}`;
  }

  private static parseContentIntoSections(organizedContent: string, userPrompt: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    
    // Enhanced section parsing with multiple formats
    const sectionRegexes = [
      /##\s*(.+?)\n([\s\S]*?)(?=##|$)/g,
      /#{1,3}\s*(.+?)\n([\s\S]*?)(?=#{1,3}|$)/g,
      /^(.+?)\n[-=]{3,}\n([\s\S]*?)(?=^.+?\n[-=]{3,}|$)/gm
    ];
    
    let sectionIndex = 1;
    let sectionsFound = false;
    
    for (const sectionRegex of sectionRegexes) {
      let match;
      const tempSections = [];
      
      while ((match = sectionRegex.exec(organizedContent)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        
        if (content.length > 80) { // Minimum content threshold
          tempSections.push({
            id: `section_${sectionIndex}`,
            title,
            content,
            type: 'text' as const,
            order: sectionIndex
          });
          sectionIndex++;
        }
      }
      
      if (tempSections.length > 0) {
        sections.push(...tempSections);
        sectionsFound = true;
        break;
      }
    }

    // Fallback: treat entire content as one section if no sections found
    if (!sectionsFound && organizedContent.trim().length > 100) {
      sections.push({
        id: 'section_1',
        title: 'Course Content',
        content: organizedContent.trim(),
        type: 'text',
        order: 1
      });
    }

    console.log('📋 Section parsing result:', {
      sectionsFound: sections.length,
      totalContentLength: sections.reduce((sum, s) => sum + s.content.length, 0),
      averageContentLength: sections.length > 0 ? sections.reduce((sum, s) => sum + s.content.length, 0) / sections.length : 0
    });

    return sections;
  }
}
