
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
    console.log('🔒 CREATING: Strict file-based sections without fabrication');

    try {
      // Use ChatGPT with strict anti-fabrication prompt
      const organizedContent = await ChatGPTService.generateContent(userPrompt, fileContent);
      const sections = this.parseContentIntoSections(organizedContent);
      
      if (sections.length > 0) {
        console.log('✅ Content organized with strict validation');
        return sections;
      } else {
        console.warn('⚠️ ChatGPT organization failed, using direct content splitting');
        return this.createDirectContentSections(userPrompt, fileContent);
      }

    } catch (error) {
      console.error('❌ ChatGPT organization error:', error);
      console.log('🔄 Fallback: Direct content splitting');
      return this.createDirectContentSections(userPrompt, fileContent);
    }
  }

  static createDirectContentSections(userPrompt: string, fileContent: string): Promise<CourseMaterial[]> {
    console.log('📋 DIRECT: Creating sections from raw file content');
    
    // Determine section count from user prompt
    const promptLower = userPrompt.toLowerCase();
    let targetSections = 3; // default
    
    const pageMatch = promptLower.match(/(\d+)[-\s]*page/);
    const sectionMatch = promptLower.match(/(\d+)[-\s]*section/);
    const moduleMatch = promptLower.match(/(\d+)[-\s]*module/);
    
    if (pageMatch) targetSections = parseInt(pageMatch[1]);
    else if (sectionMatch) targetSections = parseInt(sectionMatch[1]);
    else if (moduleMatch) targetSections = parseInt(moduleMatch[1]);
    
    targetSections = Math.max(1, Math.min(5, targetSections));
    
    const materials: CourseMaterial[] = [];
    
    // Split content into paragraphs
    const paragraphs = fileContent.split(/\n\s*\n/).filter(p => p.trim().length > 100);
    
    if (paragraphs.length === 0) {
      // Split by sentences if no paragraphs
      const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 50);
      const chunkedSentences = this.chunkArray(sentences, Math.ceil(sentences.length / targetSections));
      
      chunkedSentences.forEach((chunk, index) => {
        if (chunk.length > 0) {
          materials.push({
            id: `section_${index + 1}`,
            title: this.generateStrictSectionTitle(userPrompt, index + 1, targetSections),
            content: chunk.join('. ').trim() + '.',
            type: 'text',
            order: index + 1
          });
        }
      });
    } else {
      // Group paragraphs into sections
      const chunkedParagraphs = this.chunkArray(paragraphs, Math.ceil(paragraphs.length / targetSections));
      
      chunkedParagraphs.forEach((chunk, index) => {
        if (chunk.length > 0) {
          materials.push({
            id: `section_${index + 1}`,
            title: this.generateStrictSectionTitle(userPrompt, index + 1, targetSections),
            content: chunk.join('\n\n').trim(),
            type: 'text',
            order: index + 1
          });
        }
      });
    }

    return Promise.resolve(materials.slice(0, targetSections));
  }

  private static generateStrictSectionTitle(userPrompt: string, sectionNumber: number, totalSections: number): string {
    const promptLower = userPrompt.toLowerCase();
    
    if (promptLower.includes('course')) {
      return `Module ${sectionNumber}`;
    } else if (promptLower.includes('page')) {
      return `Page ${sectionNumber}`;
    } else if (promptLower.includes('chapter')) {
      return `Chapter ${sectionNumber}`;
    } else if (promptLower.includes('lesson')) {
      return `Lesson ${sectionNumber}`;
    } else {
      return `Section ${sectionNumber}`;
    }
  }

  private static parseContentIntoSections(organizedContent: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    const sectionRegex = /##\s*(.+?)\n([\s\S]*?)(?=##|$)/g;
    let match;
    let sectionIndex = 1;

    while ((match = sectionRegex.exec(organizedContent)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim();
      
      if (content.length > 100) {
        sections.push({
          id: `section_${sectionIndex}`,
          title,
          content,
          type: 'text',
          order: sectionIndex
        });
        sectionIndex++;
      }
    }

    if (sections.length === 0 && organizedContent.trim().length > 100) {
      sections.push({
        id: 'section_1',
        title: 'Document Content',
        content: organizedContent.trim(),
        type: 'text',
        order: 1
      });
    }

    return sections;
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
