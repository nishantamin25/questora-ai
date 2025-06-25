import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class ContentProcessor {
  private static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static isRealContent(content: string): boolean {
    if (!content || content.length < 100) {
      console.log('Content rejected: too short');
      return false;
    }
    
    // Check for meaningful words (not just random characters)
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /^[a-zA-Z]/.test(word)
    );
    
    const hasEnoughWords = words.length > 30; // Increased threshold
    const hasLetters = /[a-zA-Z]/.test(content);
    const readableRatio = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length / content.length;
    
    // Check for garbage content patterns
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content);
    const hasTooManyNumbers = (content.match(/\d/g) || []).length > content.length * 0.3;
    const hasRepeatingPatterns = /(.)\1{10,}/.test(content);
    
    // Check for PDF garbage patterns
    const pdfGarbagePatterns = [
      /PDF-[\d.]+/,
      /%%EOF/,
      /\/Type\s*\/\w+/,
      /\/Length\s+\d+/,
      /\/Filter\s*\/\w+/,
      /stream.*?endstream/,
      /\d+\s+\d+\s+obj/,
      /endobj/,
      /xref/,
      /startxref/,
      /BT.*?ET/,
      /Td|TD|Tm|T\*|TL|Tc|Tw|Tz|Tf|Tr|Ts/
    ];

    let garbageCount = 0;
    for (const pattern of pdfGarbagePatterns) {
      if (pattern.test(content)) {
        garbageCount++;
      }
    }

    // Check for meaningful educational content indicators
    const educationalTerms = (content.match(/\b(?:chapter|section|introduction|conclusion|analysis|method|result|discussion|summary|overview|concept|principle|theory|practice|application|implementation|strategy|approach|technique|process|system|framework|model|design|development|research|study|data|information|knowledge|understanding|learning|education|training|course|lesson|topic|subject|content|material|resource|guide|manual|handbook|document|report|paper|article|book|text|definition|explanation|example|illustration|demonstration|case|scenario|problem|solution|question|answer|issue|challenge|opportunity|benefit|advantage|requirement|standard|criteria|guideline|recommendation|best|practices|methodology|procedure|step|stage|phase|level|degree|scope|range|scale|measure|metric|indicator|factor|element|component|aspect|feature|characteristic|property|quality|performance|effectiveness|efficiency|improvement|optimization|enhancement|innovation|technology|digital|platform|service|business|management|organization|operation|function|capability|capacity|resource|tool|equipment|facility|environment|condition|situation|context|background|history|evolution|development|progress|advancement|achievement|success|accomplishment|goal|objective|purpose|aim|target|mission|vision|value|benefit|impact|effect|influence|change|transformation|growth|expansion|increase|improvement|enhancement|optimization|innovation)+\b/gi) || []).length;
    
    const isValid = hasEnoughWords && 
                   hasLetters && 
                   readableRatio > 0.8 && 
                   !hasControlChars && 
                   !hasTooManyNumbers && 
                   !hasRepeatingPatterns &&
                   garbageCount < 3 &&
                   educationalTerms >= 5; // Must have meaningful educational content

    console.log('✅ Enhanced content validation:', { 
      length: content.length, 
      wordCount: words.length,
      hasEnoughWords, 
      hasLetters,
      readableRatio: readableRatio.toFixed(2),
      hasControlChars,
      hasTooManyNumbers,
      hasRepeatingPatterns,
      garbageCount,
      educationalTerms,
      isValid,
      preview: content.substring(0, 150) + '...'
    });
    
    return isValid;
  }

  static async createCourseSectionsFromRealContent(content: string, sourceName: string): Promise<CourseMaterial[]> {
    console.log('Creating course sections from REAL content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 300) + '...',
      sourceName
    });
    
    // CRITICAL: Strict content validation
    if (!this.isRealContent(content)) {
      console.error('❌ Content validation failed - content is not suitable for course generation');
      throw new Error(`Invalid or corrupted content from ${sourceName}. The extracted content appears to be garbage, corrupted, or insufficient for course generation.`);
    }

    const sections: CourseMaterial[] = [];
    
    try {
      // FIXED: Use ChatGPT to structure the ACTUAL content into educational sections
      console.log('✅ Using ChatGPT to structure REAL content into course sections...');
      
      const structurePrompt = `Create exactly 3 comprehensive educational course sections from the following REAL extracted document content. 

CRITICAL INSTRUCTIONS:
- Base your sections EXCLUSIVELY on the content provided below
- Do NOT add any information not present in the source material
- Create specific, detailed sections using ONLY the actual information from the document
- Each section should focus on different aspects/topics found in the content
- Make sections substantial and educational (minimum 200 words each)
- Use the actual terminology, concepts, and information from the source

REAL DOCUMENT CONTENT TO USE:
"""
${content}
"""

Create exactly 3 sections with:
1. Clear, descriptive titles based on the actual content topics found in the document
2. Comprehensive content for each section using ONLY the information from the source above
3. Educational formatting suitable for course learning
4. Each section should be substantial (at least 200 words) and based on different aspects of the source content

Format each section clearly with a title and detailed content based on the source material.`;

      const structuredContent = await ChatGPTService.generateContent(structurePrompt);
      
      if (structuredContent && structuredContent.length > 600) {
        console.log('✅ ChatGPT successfully structured content:', structuredContent.length, 'characters');
        const sectionParts = this.splitIntoSections(structuredContent);
        
        sectionParts.forEach((section, index) => {
          if (section.trim().length > 200) {
            sections.push({
              id: this.generateId(),
              type: 'text',
              title: this.extractSectionTitle(section, index + 1, sourceName),
              content: section.trim(),
              order: index + 1
            });
          }
        });
        
        console.log('✅ Created', sections.length, 'sections from structured content');
      }

      // If ChatGPT structuring didn't produce enough quality sections, create direct sections
      if (sections.length < 2) {
        console.log('⚠️ ChatGPT structuring insufficient, creating direct sections from content...');
        return this.createDirectSectionsFromContent(content, sourceName);
      } else {
        console.log('✅ Successfully created', sections.length, 'sections from ChatGPT structuring');
      }

    } catch (error) {
      console.error('❌ Error in ChatGPT structuring, creating direct sections:', error);
      return this.createDirectSectionsFromContent(content, sourceName);
    }

    const finalSections = sections.length > 0 ? sections.slice(0, 3) : this.createDirectSectionsFromContent(content, sourceName);
    
    console.log('✅ Final course sections created:', {
      count: finalSections.length,
      titles: finalSections.map(s => s.title),
      averageLength: Math.round(finalSections.reduce((sum, s) => sum + s.content.length, 0) / finalSections.length)
    });
    
    return finalSections;
  }

  private static createDirectSectionsFromContent(content: string, sourceName: string): CourseMaterial[] {
    console.log('Creating direct sections from content...');
    const sections: CourseMaterial[] = [];
    
    // Identify natural content divisions based on actual content structure
    const contentDivisions = this.identifyContentDivisions(content);
    
    if (contentDivisions.length >= 2) {
      // Use identified divisions
      contentDivisions.slice(0, 3).forEach((division, index) => {
        if (division.content.trim().length > 150) {
          sections.push({
            id: this.generateId(),
            type: 'text',
            title: division.title || `${sourceName} - Section ${index + 1}`,
            content: division.content.trim(),
            order: index + 1
          });
        }
      });
    } else {
      // Split content into meaningful chunks based on content structure
      const chunks = this.splitContentIntelligently(content, 800);
      
      chunks.forEach((chunk, index) => {
        if (chunk.trim().length > 150) {
          sections.push({
            id: this.generateId(),
            type: 'text',
            title: this.generateContentBasedTitle(chunk, index + 1, sourceName),
            content: chunk.trim(),
            order: index + 1
          });
        }
      });
    }
    
    // Ensure we have at least one section
    if (sections.length === 0 && content.length > 150) {
      sections.push({
        id: this.generateId(),
        type: 'text',
        title: `${sourceName} - Content Overview`,
        content: content.trim(),
        order: 1
      });
    }
    
    return sections.slice(0, 3);
  }

  private static identifyContentDivisions(content: string): Array<{title: string, content: string}> {
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

  private static splitContentIntelligently(content: string, targetLength: number): string[] {
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

    return chunks.filter(chunk => chunk.trim().length > 100);
  }

  private static generateContentBasedTitle(content: string, index: number, sourceName: string): string {
    // Extract key terms and concepts from the content to create a meaningful title
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Look for title-like patterns in the first few sentences
    for (let i = 0; i < Math.min(3, sentences.length); i++) {
      const sentence = sentences[i].trim();
      
      // Check for title-like characteristics
      if (sentence.length > 10 && sentence.length < 80) {
        // Remove common sentence starters to see if it could be a title
        const cleanSentence = sentence.replace(/^(?:This|The|In|On|For|With|By|As|When|Where|What|How|Why)\s+/i, '');
        
        if (cleanSentence.length < 60 && !cleanSentence.includes(' and ') && !cleanSentence.includes(' or ')) {
          const titleCandidate = this.cleanTitle(cleanSentence);
          if (titleCandidate.length > 8) {
            return titleCandidate;
          }
        }
      }
    }
    
    // Extract key concepts for title generation
    const keyTerms = this.extractKeyTermsFromContent(content);
    
    if (keyTerms.length > 0) {
      const title = keyTerms.slice(0, 3).join(' & ');
      if (title.length > 8 && title.length < 60) {
        return this.cleanTitle(title);
      }
    }
    
    // Fallback to source-based title
    return `${sourceName} - Section ${index}`;
  }

  private static extractKeyTermsFromContent(content: string): string[] {
    // Extract meaningful terms that could form a good title
    const importantTerms = content.match(/\b(?:Introduction|Overview|Analysis|Implementation|Strategy|Technology|Innovation|Management|Operations|Customer|Market|Business|Digital|Platform|Solution|System|Service|Process|Data|Security|Performance|Quality|Development|Framework|Standards|Best|Practices|Artificial|Intelligence|Machine|Learning|Retail|Commerce|Analytics|Optimization|Research|Study|Method|Approach|Technique|Procedure|Application|Practice|Theory|Concept|Principle|Model|Design|Architecture|Structure|Organization|Function|Operation|Capability|Feature|Characteristic|Property|Component|Element|Factor|Aspect|Consideration|Requirement|Specification|Criteria|Standard|Guideline|Recommendation|Benefit|Advantage|Value|Impact|Effect|Influence|Result|Outcome|Achievement|Success|Goal|Objective|Purpose|Mission|Vision|Strategy|Plan|Policy|Rule|Regulation|Law|Legal|Compliance|Governance|Leadership|Direction|Guidance|Support|Training|Education|Learning|Knowledge|Understanding|Skill|Expertise|Experience|Competence|Professional|Industry|Sector|Domain|Field|Area|Region|Market|Customer|Client|User|Stakeholder|Partner|Supplier|Vendor|Provider|Resource|Material|Equipment|Tool|Instrument|Device|Technology|Software|Hardware|Platform|Environment|Context|Situation|Condition|State|Status|Position|Location|Place|Site|Area|Zone|Region|Territory|Domain|Field|Sector|Industry|Market|Segment|Category|Type|Kind|Sort|Class|Group|Set|Collection|Series|Sequence|Order|Arrangement|Organization|Structure|Pattern|Design|Layout|Format|Style|Appearance|Look|View|Perspective|Angle|Point|Opinion|Viewpoint|Position|Stance|Attitude|Approach|Method|Way|Manner|Mode|Style|Technique|Procedure|Process|System|Framework|Model|Pattern|Template|Framework|Structure|System|Architecture|Organization|Configuration|Setup|Installation|Implementation|Application|Usage|Utilization|Employment|Deployment|Operation|Function|Performance|Behavior|Conduct|Activity|Action|Practice|Exercise|Training|Preparation|Planning|Development|Creation|Production|Manufacturing|Construction|Building|Assembly|Installation|Maintenance|Repair|Service|Support|Assistance|Help|Aid|Resource|Tool|Equipment|Facility|Infrastructure|Environment|Setting|Context|Situation|Condition|State|Status|Position|Location|Place|Site|Area|Zone|Region|Territory|Domain|Field|Sector|Industry|Market|Segment|Category|Type|Kind|Sort|Class|Group|Set|Collection|Series|Sequence|Order|Arrangement|Organization|Structure|Pattern|Design|Layout|Format|Style|Appearance|Look|View|Perspective|Angle|Point|Opinion|Viewpoint|Position|Stance|Attitude|Approach|Method|Way|Manner|Mode|Style|Technique|Procedure|Process|System|Framework|Model|Pattern|Template)\b/gi) || [];
    
    const uniqueTerms = [...new Set(importantTerms.map(term => 
      term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()
    ))];
    
    return uniqueTerms.slice(0, 8);
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
    
    return sections.filter(section => section.trim().length > 150);
  }

  private static extractSectionTitle(section: string, index: number, sourceName: string): string {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const firstLine = lines[0];
    if (firstLine && firstLine.length > 8 && firstLine.length < 100 && !firstLine.endsWith('.')) {
      return this.cleanTitle(firstLine);
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
