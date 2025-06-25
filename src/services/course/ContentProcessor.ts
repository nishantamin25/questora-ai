
import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';
import { ContentValidator } from './ContentValidator';
import { SectionExtractor } from './SectionExtractor';
import { ContentSplitter } from './ContentSplitter';
import { TitleGenerator } from './TitleGenerator';

export class ContentProcessor {
  private static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static isRealContent(content: string): boolean {
    return ContentValidator.isRealContent(content);
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
        const sectionParts = SectionExtractor.splitIntoSections(structuredContent);
        
        sectionParts.forEach((section, index) => {
          if (section.trim().length > 200) {
            sections.push({
              id: this.generateId(),
              type: 'text',
              title: SectionExtractor.extractSectionTitle(section, index + 1, sourceName),
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
    const contentDivisions = SectionExtractor.identifyContentDivisions(content);
    
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
      const chunks = ContentSplitter.splitContentIntelligently(content, 800);
      
      chunks.forEach((chunk, index) => {
        if (chunk.trim().length > 150) {
          sections.push({
            id: this.generateId(),
            type: 'text',
            title: TitleGenerator.generateContentBasedTitle(chunk, index + 1, sourceName),
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
}
