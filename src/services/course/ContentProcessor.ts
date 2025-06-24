
import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class ContentProcessor {
  static isRealContent(content: string): boolean {
    if (!content || content.length < 50) return false;
    
    // Check for generic educational templates/patterns
    const genericPatterns = [
      /educational content designed for/i,
      /learning objectives/i,
      /students will gain understanding/i,
      /course provides comprehensive coverage of/i,
      /upon completion.*understanding/i,
      /theoretical foundations and core principles/i,
      /practical applications and real-world usage/i
    ];
    
    const hasGenericPatterns = genericPatterns.some(pattern => pattern.test(content));
    
    // Content should have specific terms, numbers, proper nouns
    const hasSpecificContent = /[\d,]+|\b[A-Z][a-z]+\s[A-Z][a-z]+|\b[A-Z]{2,}|\b\d+[A-Za-z]+|\b[A-Z][a-z]*\sTM\b|\b[A-Z][a-z]*®\b/.test(content);
    
    return !hasGenericPatterns && hasSpecificContent;
  }

  static async createCourseSectionsFromRealContent(content: string, sourceName: string): Promise<CourseMaterial[]> {
    const sections: CourseMaterial[] = [];
    
    try {
      console.log('Creating course sections from REAL content:', content.substring(0, 200) + '...');
      
      // CRITICAL: Use very specific prompt to force ChatGPT to use ONLY the provided content
      const structurePrompt = `CRITICAL INSTRUCTION: You must create course content using ONLY the information provided below. Do not add generic educational templates or fabricated content.

Extract the actual information from this document and organize it into 2-3 educational sections with clear titles. Use the real data, metrics, product names, and specific details found in the content.

REAL DOCUMENT CONTENT TO USE:
${content}

Requirements:
1. Extract only factual information from the provided content
2. Use actual product names, metrics, and specific details mentioned
3. Create section titles based on the real topics covered
4. Do not add generic learning objectives or educational templates
5. Structure the real information into educational sections
6. If metrics or specific data points exist, include them exactly as stated
7. Keep all original terminology and proper nouns

Respond with structured educational content based solely on the provided document.`;

      const structuredContent = await ChatGPTService.generateContent(structurePrompt);
      
      console.log('ChatGPT structured content:', structuredContent.substring(0, 300) + '...');
      
      // Verify the structured content still contains real information
      if (!this.containsRealInformation(structuredContent, content)) {
        console.error('ChatGPT response does not contain real content - using direct extraction');
        return this.extractSectionsDirectly(content, sourceName);
      }

      // Split the structured content into sections
      const sectionParts = this.splitIntoSections(structuredContent);
      
      sectionParts.forEach((section, index) => {
        if (section.trim().length > 200) {
          sections.push({
            type: 'text',
            title: this.extractSectionTitle(section, index + 1, sourceName),
            content: section.trim()
          });
        }
      });

    } catch (error) {
      console.error('Error creating structured sections with ChatGPT, using direct extraction:', error);
      return this.extractSectionsDirectly(content, sourceName);
    }

    return sections.slice(0, 3);
  }

  private static containsRealInformation(structuredContent: string, originalContent: string): boolean {
    // Extract key terms from original content
    const originalTerms = originalContent.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b|\b\d+[A-Za-z]*\b|\b[A-Z]{2,}\b/g) || [];
    const structuredTerms = structuredContent.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b|\b\d+[A-Za-z]*\b|\b[A-Z]{2,}\b/g) || [];
    
    // Check if structured content contains at least 30% of original key terms
    const commonTerms = originalTerms.filter(term => structuredTerms.includes(term));
    const overlap = commonTerms.length / Math.max(originalTerms.length, 1);
    
    console.log('Content overlap check:', { 
      originalTermsCount: originalTerms.length, 
      commonTermsCount: commonTerms.length, 
      overlap: overlap 
    });
    
    return overlap > 0.3;
  }

  private static extractSectionsDirectly(content: string, sourceName: string): CourseMaterial[] {
    const sections: CourseMaterial[] = [];
    
    // Split content into meaningful chunks based on structure
    const chunks = this.splitContentIntoMeaningfulChunks(content);
    
    chunks.forEach((chunk, index) => {
      if (chunk.trim().length > 200) {
        sections.push({
          type: 'text',
          title: this.extractRealSectionTitle(chunk, index + 1, sourceName),
          content: chunk.trim()
        });
      }
    });
    
    return sections.slice(0, 3);
  }

  private static splitContentIntoMeaningfulChunks(content: string): string[] {
    // Define regex patterns with explicit RegExp typing
    const patterns: RegExp[] = [
      /(?:\n\s*){2,}(?=[A-Z][^.]*(?:\n|$))/g,  // Double line breaks before headings
      /(?:\d+\.|\w+\)|\•)\s+/g,                // Numbered or bulleted lists
      /\n\s*[A-Z][A-Z\s]+\n/g,               // ALL CAPS headings
      /\n\s*[A-Z][^.]*:\s*\n/g               // Headings ending with colon
    ];
    
    let chunks: string[] = [content];
    
    // Process each pattern individually
    for (const pattern of patterns) {
      const newChunks: string[] = [];
      
      // Process each chunk
      for (const chunk of chunks) {
        // Split the chunk by the pattern
        const parts = chunk.split(pattern);
        
        // Add valid parts to newChunks
        for (const part of parts) {
          if (part && typeof part === 'string' && part.trim().length > 100) {
            newChunks.push(part);
          }
        }
      }
      
      // Only use the new chunks if they provide better segmentation
      if (newChunks.length > chunks.length && newChunks.length <= 5) {
        chunks = newChunks;
      }
    }
    
    // If no good natural breaks found, split by length
    if (chunks.length === 1 && chunks[0].length > 2000) {
      chunks = this.splitContentIntoChunks(content, 1500);
    }
    
    return chunks;
  }

  private static extractRealSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for title-like patterns in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      
      // Check for heading patterns
      if (line.length < 100 && line.length > 5) {
        // ALL CAPS headings
        if (line === line.toUpperCase() && /[A-Z\s&]+/.test(line)) {
          return this.cleanTitle(line);
        }
        // Title Case headings
        if (/^[A-Z][^.]*[^.]$/.test(line) && line.split(' ').length <= 8) {
          return this.cleanTitle(line);
        }
        // Headings with colons
        if (line.endsWith(':') && line.split(' ').length <= 6) {
          return this.cleanTitle(line.slice(0, -1));
        }
      }
    }
    
    // Extract key terms from the section for a meaningful title
    const keyTerms = section.match(/\b[A-Z][a-z]*(?:\s[A-Z][a-z]*)*\b/g) || [];
    if (keyTerms.length > 0) {
      const title = keyTerms.slice(0, 3).join(' ');
      if (title.length > 5 && title.length < 50) {
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
    const sections = content.split(/(?:\n\s*(?:Section|Chapter|Part)\s*\d+|\n\s*#{1,3}\s*)/i);
    
    if (sections.length < 2) {
      // Split by paragraphs if no clear sections
      return this.splitContentIntoChunks(content, 1200);
    }
    
    return sections.filter(section => section.trim().length > 100);
  }

  private static extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for a title-like first line
    const firstLine = lines[0];
    if (firstLine && firstLine.length < 100 && !firstLine.endsWith('.')) {
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
