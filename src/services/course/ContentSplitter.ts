
export class ContentSplitter {
  static splitContentIntelligently(content: string, targetLength: number): string[] {
    if (!content || content.length <= targetLength) {
      return content ? [content] : [];
    }

    const chunks: string[] = [];
    
    // First try to split by paragraphs
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length >= 3) {
      // Group paragraphs into chunks
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        const proposedChunk = currentChunk 
          ? `${currentChunk}\n\n${paragraph}`
          : paragraph;
          
        if (proposedChunk.length <= targetLength) {
          currentChunk = proposedChunk;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
          }
          currentChunk = paragraph.length > targetLength 
            ? paragraph.substring(0, targetLength - 3) + '...'
            : paragraph;
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk);
      }
    } else {
      // Fall back to sentence-based splitting
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      let currentChunk = '';

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        const proposedChunk = currentChunk 
          ? `${currentChunk}. ${trimmedSentence}`
          : trimmedSentence;

        if (proposedChunk.length <= targetLength) {
          currentChunk = proposedChunk;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk + '.');
          }
          currentChunk = trimmedSentence.length > targetLength 
            ? trimmedSentence.substring(0, targetLength - 3) + '...'
            : trimmedSentence;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
    }

    // More lenient filtering - accept chunks with at least 50 characters
    return chunks.filter(chunk => chunk.trim().length > 50);
  }
}
