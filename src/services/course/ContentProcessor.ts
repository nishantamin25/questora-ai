
import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class ContentProcessor {
  static isRealContent(content: string): boolean {
    if (!content || content.length < 50) return false;
    
    // Much more lenient check for real documents
    const words = content.split(/\s+/).filter(word => word.length > 1);
    const hasWords = words.length > 10;
    const hasReadableContent = /[a-zA-Z0-9]/.test(content);
    
    console.log('Content validation:', { 
      length: content.length, 
      hasWords, 
      hasReadableContent,
      wordCount: words.length 
    });
    
    return hasWords && hasReadableContent;
  }

  static async createCourseSectionsFromRealContent(content: string, sourceName: string): Promise<CourseMaterial[]> {
    console.log('Creating course sections from content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 300) + '...',
      sourceName
    });
    
    // Always use the extracted content - don't be overly strict
    if (content.length < 100) {
      throw new Error(`Insufficient content extracted from ${sourceName}. Only ${content.length} characters available.`);
    }

    const sections: CourseMaterial[] = [];
    
    try {
      // For substantial content, try ChatGPT structuring
      if (content.length > 500) {
        try {
          const structurePrompt = `Create 3 educational sections from this document content. Use the actual information provided and structure it into clear learning sections with titles.

DOCUMENT CONTENT:
${content.substring(0, 4000)}

Create 3 sections with:
1. Clear educational titles
2. Substantial content for each section using the real information
3. Make it suitable for course learning`;

          const structuredContent = await ChatGPTService.generateContent(structurePrompt);
          
          if (structuredContent && structuredContent.length > 500) {
            const sectionParts = this.splitIntoSections(structuredContent);
            
            sectionParts.forEach((section, index) => {
              if (section.trim().length > 100) {
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

      // If ChatGPT approach didn't work, use direct extraction
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
    
    // Create meaningful sections from the content
    const chunks = this.splitContentIntoMeaningfulChunks(content);
    
    chunks.forEach((chunk, index) => {
      if (chunk.trim().length > 50) {
        sections.push({
          type: 'text',
          title: this.extractRealSectionTitle(chunk, index + 1, sourceName),
          content: chunk.trim()
        });
      }
    });
    
    // Ensure we have at least one section
    if (sections.length === 0 && content.length > 50) {
      sections.push({
        type: 'text',
        title: `${sourceName} - Main Content`,
        content: content.trim()
      });
    }
    
    return sections.slice(0, 3);
  }

  private static splitContentIntoMeaningfulChunks(content: string): string[] {
    if (!content || content.length < 100) {
      return content ? [content] : [];
    }

    let chunks: string[] = [];
    
    // Try splitting by natural document structure
    if (content.includes('\n\n')) {
      chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50);
    }
    
    // If that doesn't work well, try splitting by sentences into reasonable chunks
    if (chunks.length < 2) {
      chunks = this.splitContentIntoChunks(content, 800);
    }
    
    // Ensure we have reasonable chunks
    return chunks.length > 0 ? chunks : [content];
  }

  private static extractRealSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for title-like patterns in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      
      if (line.length > 5 && line.length < 80) {
        // Check for heading patterns
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
    
    // Extract key business terms for meaningful titles
    const businessTerms = section.match(/\b(?:Platform|Commerce|Business|Strategy|Digital|Technology|Innovation|Management|Operations|Analytics|Customer|Market|Revenue|Growth|Integration|Solution|Framework|System|Service|Experience|Performance|Overview|Introduction|Summary|Analysis|Implementation|Development|Process|Data|Security|Mobile|Cloud|API|Network|Enterprise|Corporate|Industry|Product|Service|Quality|Efficiency|Optimization|Standards|Compliance|Best|Practices)\b/gi) || [];
    
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
    // Try to split by section headers or natural breaks
    const sections = content.split(/(?:\n\s*(?:Section|Chapter|Part|##)\s*\d*|\n\s*#{1,3}\s*)/i);
    
    if (sections.length < 2) {
      return this.splitContentIntoChunks(content, 1000);
    }
    
    return sections.filter(section => section.trim().length > 100);
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

    return chunks.filter(chunk => chunk.trim().length > 30);
  }
}
