import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class ContentProcessor {
  static isRealContent(content: string): boolean {
    if (!content || content.length < 30) return false;
    
    // Much more lenient validation - focus on actual readable content
    const words = content.split(/\s+/).filter(word => word.length > 2);
    const hasEnoughWords = words.length > 5;
    const hasLetters = /[a-zA-Z]/.test(content);
    const readableRatio = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length / content.length;
    
    console.log('Content validation:', { 
      length: content.length, 
      hasEnoughWords, 
      hasLetters,
      readableRatio,
      wordCount: words.length 
    });
    
    return hasEnoughWords && hasLetters && readableRatio > 0.3;
  }

  static async createCourseSectionsFromRealContent(content: string, sourceName: string): Promise<CourseMaterial[]> {
    console.log('Creating course sections from content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 300) + '...',
      sourceName
    });
    
    // More lenient content validation
    if (content.length < 50) {
      throw new Error(`Insufficient content extracted from ${sourceName}. Only ${content.length} characters available.`);
    }

    const sections: CourseMaterial[] = [];
    
    try {
      // For any substantial content, try ChatGPT structuring
      if (content.length > 200) {
        try {
          const structurePrompt = `Create 3 educational sections from this content. Structure the information into clear learning sections with meaningful titles and substantial content for each section.

CONTENT:
${content.substring(0, 4000)}

Create 3 sections with:
1. Clear educational titles based on the content
2. Substantial content for each section using the information provided
3. Make it suitable for course learning and assessment`;

          const structuredContent = await ChatGPTService.generateContent(structurePrompt);
          
          if (structuredContent && structuredContent.length > 300) {
            const sectionParts = this.splitIntoSections(structuredContent);
            
            sectionParts.forEach((section, index) => {
              if (section.trim().length > 80) {
                sections.push({
                  type: 'text',
                  title: this.extractSectionTitle(section, index + 1, sourceName),
                  content: section.trim()
                });
              }
            });
          }
        } catch (error) {
          console.log('ChatGPT structuring failed, using direct extraction:', error);
        }
      }

      // If ChatGPT approach didn't work or content is smaller, use direct extraction
      if (sections.length === 0) {
        console.log('Using direct content extraction approach');
        return this.extractSectionsDirectly(content, sourceName);
      }

    } catch (error) {
      console.log('Error in course section creation, using direct extraction:', error);
      return this.extractSectionsDirectly(content, sourceName);
    }

    return sections.length > 0 ? sections.slice(0, 3) : this.extractSectionsDirectly(content, sourceName);
  }

  private static extractSectionsDirectly(content: string, sourceName: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    
    const chunks = this.splitContentIntoMeaningfulChunks(content);
    
    chunks.forEach((chunk, index) => {
      if (chunk.trim().length > 30) {
        sections.push({
          type: 'text',
          title: this.extractRealSectionTitle(chunk, index + 1, sourceName),
          content: chunk.trim()
        });
      }
    });
    
    if (sections.length === 0 && content.length > 30) {
      sections.push({
        type: 'text',
        title: `${sourceName} - Main Content`,
        content: content.trim()
      });
    }
    
    return sections.slice(0, 3);
  }

  private static splitContentIntoMeaningfulChunks(content: string): string[] {
    if (!content || content.length < 50) {
      return content ? [content] : [];
    }

    let chunks: string[] = [];
    
    if (content.includes('\n\n')) {
      chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 30);
    }
    
    if (chunks.length < 2) {
      chunks = this.splitContentIntoChunks(content, 600);
    }
    
    return chunks.length > 0 ? chunks : [content];
  }

  private static extractRealSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      
      if (line.length > 5 && line.length < 80) {
        if (line === line.toUpperCase() && /[A-Z\s&]+/.test(line)) {
          return this.cleanTitle(line);
        }
        if (/^[A-Z][^.]*[^.]$/.test(line) && line.split(' ').length <= 8) {
          return this.cleanTitle(line);
        }
        if (line.endsWith(':') && line.split(' ').length <= 6) {
          return this.cleanTitle(line.slice(0, -1));
        }
      }
    }
    
    const businessTerms = section.match(/\b(?:Platform|Commerce|Business|Strategy|Digital|Technology|Innovation|Management|Operations|Analytics|Customer|Market|Revenue|Growth|Integration|Solution|Framework|System|Service|Experience|Performance|Overview|Introduction|Summary|Analysis|Implementation|Development|Process|Data|Security|Mobile|Cloud|API|Network|Enterprise|Corporate|Industry|Product|Quality|Efficiency|Optimization|Standards|Compliance|Best|Practices)\b/gi) || [];
    
    if (businessTerms.length > 0) {
      const uniqueTerms = [...new Set(businessTerms.map(term => term.toLowerCase()))];
      const title = uniqueTerms.slice(0, 2).map(term => 
        term.charAt(0).toUpperCase() + term.slice(1)
      ).join(' & ');
      
      if (title.length > 5) {
        return title;
      }
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private static cleanTitle(title: string): string {
    return title
      .replace(/[^\w\s&-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private static splitIntoSections(content: string): string[] {
    const sections = content.split(/(?:\n\s*(?:Section|Chapter|Part|##)\s*\d*|\n\s*#{1,3}\s*)/i);
    
    if (sections.length < 2) {
      return this.splitContentIntoChunks(content, 800);
    }
    
    return sections.filter(section => section.trim().length > 80);
  }

  private static extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const firstLine = lines[0];
    if (firstLine && firstLine.length > 5 && firstLine.length < 80 && !firstLine.endsWith('.')) {
      return firstLine;
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private static splitContentIntoChunks(content: string, maxLength: number): string[] {
    if (!content || content.length <= maxLength) {
      return content ? [content] : [];
    }

    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const proposedChunk = currentChunk 
        ? `${currentChunk}. ${trimmedSentence}`
        : trimmedSentence;

      if (proposedChunk.length <= maxLength) {
        currentChunk = proposedChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence.length > maxLength 
          ? trimmedSentence.substring(0, maxLength - 3) + '...'
          : trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks.filter(chunk => chunk.trim().length > 20);
  }
}
