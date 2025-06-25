
export class SectionExtractor {
  static identifyContentDivisions(content: string): Array<{title: string, content: string}> {
    const divisions: Array<{title: string, content: string}> = [];
    
    // Look for natural section breaks
    const sectionPatterns = [
      /(?:^|\n)\s*(?:Chapter|Section|Part)\s*\d*[:\-\.]?\s*([^\n]+)\n/gi,
      /(?:^|\n)\s*\d+\.\s*([^\n]+)\n/g,
      /(?:^|\n)\s*[A-Z][A-Z\s&\-]{5,50}\s*\n/g,
      /(?:^|\n)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:]\s*\n/g
    ];
    
    for (const pattern of sectionPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length >= 2) {
        // Found good section divisions
        let lastIndex = 0;
        matches.forEach((match, index) => {
          if (index > 0) {
            const sectionContent = content.substring(lastIndex, match.index).trim();
            if (sectionContent.length > 100) {
              divisions.push({
                title: this.cleanTitle(matches[index - 1][1] || `Section ${index}`),
                content: sectionContent
              });
            }
          }
          lastIndex = match.index || 0;
        });
        
        // Add final section
        const finalContent = content.substring(lastIndex).trim();
        if (finalContent.length > 100) {
          divisions.push({
            title: this.cleanTitle(matches[matches.length - 1][1] || `Final Section`),
            content: finalContent
          });
        }
        
        if (divisions.length >= 2) break;
      }
    }
    
    return divisions;
  }

  static splitIntoSections(content: string): string[] {
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
    
    return sections.filter(section => section.trim().length > 150);
  }

  static extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const firstLine = lines[0];
    if (firstLine && firstLine.length > 8 && firstLine.length < 100 && !firstLine.endsWith('.')) {
      return this.cleanTitle(firstLine);
    }
    
    return `${sourceName} - Section ${index}`;
  }

  private static cleanTitle(title: string): string {
    return title
      .replace(/[^\w\s&\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
