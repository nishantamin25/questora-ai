
import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class ContentProcessor {
  static isRealContent(content: string): boolean {
    if (!content || content.length < 100) {
      console.log('Content rejected: too short');
      return false;
    }
    
    // Check for meaningful words (not just random characters)
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /^[a-zA-Z]/.test(word)
    );
    
    const hasEnoughWords = words.length > 20;
    const hasLetters = /[a-zA-Z]/.test(content);
    const readableRatio = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length / content.length;
    
    // Check for garbage content patterns
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content);
    const hasTooManyNumbers = (content.match(/\d/g) || []).length > content.length * 0.3;
    const hasRepeatingPatterns = /(.)\1{10,}/.test(content);
    
    console.log('Content validation:', { 
      length: content.length, 
      wordCount: words.length,
      hasEnoughWords, 
      hasLetters,
      readableRatio,
      hasControlChars,
      hasTooManyNumbers,
      hasRepeatingPatterns,
      preview: content.substring(0, 100)
    });
    
    return hasEnoughWords && 
           hasLetters && 
           readableRatio > 0.8 && 
           !hasControlChars && 
           !hasTooManyNumbers && 
           !hasRepeatingPatterns;
  }

  static async createCourseSectionsFromRealContent(content: string, sourceName: string): Promise<CourseMaterial[]> {
    console.log('Creating course sections from content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200) + '...',
      sourceName
    });
    
    // Strict content validation
    if (!this.isRealContent(content)) {
      throw new Error(`Invalid or corrupted content from ${sourceName}. The extracted content appears to be garbage or unreadable.`);
    }

    const sections: CourseMaterial[] = [];
    
    try {
      // Use ChatGPT to structure the content into educational sections
      console.log('Using ChatGPT to structure content...');
      const structurePrompt = `Create exactly 3 educational course sections from the following real content. 
      
Structure this information into clear, comprehensive learning sections with meaningful titles and substantial educational content.

IMPORTANT: Base your sections ONLY on the content provided below. Do not add information not present in the source material.

CONTENT:
${content}

Create exactly 3 sections with:
1. Clear, descriptive titles based on the actual content topics
2. Comprehensive content for each section using ONLY the information from the source
3. Educational formatting suitable for course learning
4. Each section should be substantial (at least 200 words)

Format as sections with clear titles and content.`;

      const structuredContent = await ChatGPTService.generateContent(structurePrompt);
      
      if (structuredContent && structuredContent.length > 500) {
        const sectionParts = this.splitIntoSections(structuredContent);
        
        sectionParts.forEach((section, index) => {
          if (section.trim().length > 150) {
            sections.push({
              type: 'text',
              title: this.extractSectionTitle(section, index + 1, sourceName),
              content: section.trim()
            });
          }
        });
      }

      // If ChatGPT structuring didn't produce enough sections, create direct sections
      if (sections.length < 2) {
        console.log('ChatGPT structuring insufficient, creating direct sections...');
        return this.createDirectSections(content, sourceName);
      }

    } catch (error) {
      console.log('Error in ChatGPT structuring, creating direct sections:', error);
      return this.createDirectSections(content, sourceName);
    }

    return sections.length > 0 ? sections.slice(0, 3) : this.createDirectSections(content, sourceName);
  }

  private static createDirectSections(content: string, sourceName: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    
    // Split content into meaningful chunks
    const chunks = this.splitContentIntoChunks(content, 800);
    
    chunks.forEach((chunk, index) => {
      if (chunk.trim().length > 100) {
        sections.push({
          type: 'text',
          title: this.generateSectionTitle(chunk, index + 1, sourceName),
          content: chunk.trim()
        });
      }
    });
    
    // Ensure we have at least one section
    if (sections.length === 0 && content.length > 100) {
      sections.push({
        type: 'text',
        title: `${sourceName} - Content Overview`,
        content: content.trim()
      });
    }
    
    return sections.slice(0, 3);
  }

  private static generateSectionTitle(content: string, index: number, sourceName: string): string {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for a title-like first line
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      
      if (line.length > 10 && line.length < 100) {
        // Check if it looks like a title
        if (line === line.toUpperCase() && /^[A-Z\s&-]+$/.test(line)) {
          return this.cleanTitle(line);
        }
        if (/^[A-Z][^.]*[^.]$/.test(line) && line.split(' ').length <= 10) {
          return this.cleanTitle(line);
        }
        if (line.endsWith(':') && line.split(' ').length <= 8) {
          return this.cleanTitle(line.slice(0, -1));
        }
      }
    }
    
    // Extract key terms for title
    const keyTerms = this.extractKeyTerms(content);
    
    if (keyTerms.length > 0) {
      const title = keyTerms.slice(0, 3).join(' & ');
      if (title.length > 5) {
        return title;
      }
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private static extractKeyTerms(content: string): string[] {
    const businessTerms = content.match(/\b(?:Introduction|Overview|Analysis|Implementation|Strategy|Technology|Innovation|Management|Operations|Customer|Market|Business|Digital|Platform|Solution|System|Service|Process|Data|Security|Performance|Quality|Development|Framework|Standards|Best|Practices|Artificial|Intelligence|Machine|Learning|Retail|Commerce|Analytics|Optimization)\b/gi) || [];
    
    const uniqueTerms = [...new Set(businessTerms.map(term => 
      term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()
    ))];
    
    return uniqueTerms;
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
    // Try to split by section markers
    let sections = content.split(/(?:\n\s*(?:Section|Chapter|Part|\d+\.)\s*[:\d]*|\n\s*#{1,3}\s*)/i);
    
    if (sections.length < 2) {
      // Split by double line breaks
      sections = content.split(/\n\s*\n\s*\n/);
    }
    
    if (sections.length < 2) {
      // Split into equal chunks
      return this.splitContentIntoChunks(content, 1000);
    }
    
    return sections.filter(section => section.trim().length > 100);
  }

  private static extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const firstLine = lines[0];
    if (firstLine && firstLine.length > 5 && firstLine.length < 100 && !firstLine.endsWith('.')) {
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

    return chunks.filter(chunk => chunk.trim().length > 50);
  }
}
