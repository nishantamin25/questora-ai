import { CourseMaterial } from './CourseTypes';
import { ChatGPTService } from '../ChatGPTService';

export class CourseSectionCreator {
  static async createStrictFileBasedSections(
    prompt: string,
    fileContent: string
  ): Promise<CourseMaterial[]> {
    console.log('🔍 CREATING sections from file content (backward compatibility)...');
    
    // Use enhanced method with basic analysis for backward compatibility
    const basicAnalysis = {
      type: 'general_educational',
      complexity: 'intermediate',
      keyTopics: [],
      hasStructure: false,
      wordCount: fileContent.split(/\s+/).length,
      sections: [],
      learningObjectives: []
    };
    
    return this.createEnhancedFileBasedSections(prompt, fileContent, basicAnalysis);
  }

  static async createEnhancedFileBasedSections(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('🚀 CREATING ENHANCED sections with content analysis:', {
      contentType: contentAnalysis.type,
      complexity: contentAnalysis.complexity,
      keyTopics: contentAnalysis.keyTopics.slice(0, 3),
      hasStructure: contentAnalysis.hasStructure,
      wordCount: contentAnalysis.wordCount
    });

    if (!fileContent || fileContent.length < 200) {
      console.error('❌ Insufficient content for section creation');
      throw new Error('Insufficient file content for course section creation. Minimum 200 characters required.');
    }

    const sections: CourseMaterial[] = [];
    
    try {
      // ENHANCED: Create sections based on content analysis
      if (contentAnalysis.hasStructure) {
        // Content has clear structure - use it to create sections
        sections.push(...await this.createStructureBasedSections(prompt, fileContent, contentAnalysis));
      } else {
        // Content lacks structure - create logical sections based on analysis
        sections.push(...await this.createAnalysisBasedSections(prompt, fileContent, contentAnalysis));
      }
      
      // Ensure we have at least basic sections
      if (sections.length === 0) {
        console.log('🔄 Falling back to basic section creation...');
        sections.push(...await this.createBasicSections(prompt, fileContent, contentAnalysis));
      }

      console.log(`✅ ENHANCED SECTION CREATION SUCCESS: ${sections.length} sections created`);
      return sections;

    } catch (error) {
      console.error('❌ Enhanced section creation failed:', error);
      
      // Fallback to basic section creation
      console.log('🔄 Using fallback section creation...');
      return this.createBasicSections(prompt, fileContent, contentAnalysis);
    }
  }

  private static async createStructureBasedSections(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('🏗️ Creating sections based on detected structure...');
    
    const sections: CourseMaterial[] = [];
    const detectedSections = contentAnalysis.sections;
    
    if (detectedSections.length > 0) {
      // Split content by detected sections
      const contentParts = this.splitContentBySections(fileContent, detectedSections);
      
      for (let i = 0; i < Math.min(contentParts.length, 6); i++) {
        const part = contentParts[i];
        if (part.content.length > 100) {
          sections.push({
            id: this.generateId(),
            title: part.title || `Section ${i + 1}: ${contentAnalysis.keyTopics[i] || 'Key Concepts'}`,
            content: await this.enhanceContentForLearning(part.content, contentAnalysis),
            type: 'text',
            order: i + 1
          });
        }
      }
    }
    
    return sections;
  }

  private static async createAnalysisBasedSections(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('🔍 Creating sections based on content analysis...');
    
    const sections: CourseMaterial[] = [];
    const { keyTopics, complexity, type, learningObjectives } = contentAnalysis;
    
    // Create introduction section
    sections.push({
      id: this.generateId(),
      title: 'Introduction and Overview',
      content: await this.createIntroductionContent(prompt, fileContent, contentAnalysis),
      type: 'text',
      order: 1
    });
    
    // Create topic-based sections
    const topicsToUse = keyTopics.slice(0, 4);
    for (let i = 0; i < topicsToUse.length; i++) {
      const topic = topicsToUse[i];
      const topicContent = this.extractTopicRelevantContent(fileContent, topic);
      
      if (topicContent.length > 150) {
        sections.push({
          id: this.generateId(),
          title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} - Deep Dive`,
          content: await this.enhanceContentForLearning(topicContent, contentAnalysis),
          type: 'text',
          order: i + 2
        });
      }
    }
    
    // Create practical application section if content supports it
    if (complexity !== 'basic' && fileContent.length > 1500) {
      sections.push({
        id: this.generateId(),
        title: 'Practical Applications and Examples',
        content: await this.createApplicationContent(fileContent, contentAnalysis),
        type: 'text',
        order: sections.length + 1
      });
    }
    
    // Create summary/conclusion section
    sections.push({
      id: this.generateId(),
      title: 'Key Takeaways and Summary',
      content: await this.createSummaryContent(fileContent, contentAnalysis),
      type: 'text',
      order: sections.length + 1
    });
    
    return sections;
  }

  private static async createBasicSections(
    prompt: string,
    fileContent: string,
    contentAnalysis: any
  ): Promise<CourseMaterial[]> {
    console.log('📝 Creating basic sections as fallback...');
    
    const sections: CourseMaterial[] = [];
    const contentLength = fileContent.length;
    const wordsPerSection = Math.max(200, Math.floor(contentLength / 4));
    
    // Split content into roughly equal parts
    const words = fileContent.split(/\s+/);
    const totalWords = words.length;
    const sectionCount = Math.min(Math.ceil(totalWords / wordsPerSection), 5);
    
    for (let i = 0; i < sectionCount; i++) {
      const startIndex = i * wordsPerSection;
      const endIndex = Math.min((i + 1) * wordsPerSection, totalWords);
      const sectionWords = words.slice(startIndex, endIndex);
      const sectionContent = sectionWords.join(' ');
      
      if (sectionContent.length > 100) {
        sections.push({
          id: this.generateId(),
          title: `Learning Module ${i + 1}`,
          content: await this.enhanceContentForLearning(sectionContent, contentAnalysis),
          type: 'text',
          order: i + 1
        });
      }
    }
    
    return sections;
  }

  private static splitContentBySections(content: string, sectionHeaders: string[]): Array<{title: string, content: string}> {
    const parts: Array<{title: string, content: string}> = [];
    let currentIndex = 0;
    
    for (let i = 0; i < sectionHeaders.length; i++) {
      const header = sectionHeaders[i];
      const headerIndex = content.indexOf(header, currentIndex);
      
      if (headerIndex !== -1) {
        const nextHeaderIndex = i < sectionHeaders.length - 1 
          ? content.indexOf(sectionHeaders[i + 1], headerIndex + 1)
          : content.length;
        
        const sectionContent = content.substring(
          headerIndex, 
          nextHeaderIndex !== -1 ? nextHeaderIndex : content.length
        ).trim();
        
        if (sectionContent.length > 100) {
          parts.push({
            title: header.replace(/^#+\s*|^\d+\.\s*/, '').trim(),
            content: sectionContent
          });
        }
        
        currentIndex = headerIndex + header.length;
      }
    }
    
    return parts;
  }

  private static extractTopicRelevantContent(content: string, topic: string): string {
    const sentences = content.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes(topic.toLowerCase()) ||
      this.isContextuallyRelated(sentence, topic)
    );
    
    // Add some context around relevant sentences
    const expandedContent = relevantSentences.map(sentence => {
      const index = sentences.indexOf(sentence);
      const contextBefore = sentences[index - 1] || '';
      const contextAfter = sentences[index + 1] || '';
      return [contextBefore, sentence, contextAfter].filter(s => s.trim()).join('. ');
    }).join(' ');
    
    return expandedContent.length > 150 ? expandedContent : content.substring(0, 500);
  }

  private static isContextuallyRelated(sentence: string, topic: string): boolean {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    
    // Check for word overlap
    const overlap = topicWords.filter(word => 
      sentenceWords.some(sWord => sWord.includes(word) || word.includes(sWord))
    );
    
    return overlap.length > 0;
  }

  private static async enhanceContentForLearning(content: string, contentAnalysis: any): Promise<string> {
    try {
      // Add educational structure to raw content
      let enhancedContent = `## Learning Content\n\n${content}\n\n`;
      
      // Add key points if we can identify them
      const keyPoints = this.extractKeyPoints(content);
      if (keyPoints.length > 0) {
        enhancedContent += `### Key Points:\n`;
        keyPoints.forEach((point, index) => {
          enhancedContent += `${index + 1}. ${point}\n`;
        });
        enhancedContent += '\n';
      }
      
      // Add learning reflection questions
      enhancedContent += `### Reflection Questions:\n`;
      enhancedContent += `- What are the main concepts presented in this section?\n`;
      enhancedContent += `- How does this information relate to the overall topic?\n`;
      enhancedContent += `- What practical applications can you identify?\n\n`;
      
      return enhancedContent;
      
    } catch (error) {
      console.error('Content enhancement failed, using original:', error);
      return content;
    }
  }

  private static extractKeyPoints(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Look for sentences that seem to contain key information
    const keyPoints = sentences.filter(sentence => {
      const trimmed = sentence.trim();
      return (
        /^(important|key|main|primary|essential|critical|significant)/i.test(trimmed) ||
        /is|are|means|refers to|defined as/i.test(trimmed) ||
        trimmed.length < 150 // Shorter sentences often contain key facts
      );
    });
    
    return keyPoints.slice(0, 5).map(point => point.trim());
  }

  private static async createIntroductionContent(prompt: string, fileContent: string, contentAnalysis: any): Promise<string> {
    const { keyTopics, learningObjectives } = contentAnalysis;
    
    let intro = `# Introduction\n\n`;
    intro += `Welcome to this comprehensive learning experience based on the provided content. `;
    intro += `This course has been designed to help you understand and master the key concepts presented.\n\n`;
    
    if (keyTopics.length > 0) {
      intro += `## What You'll Learn\n\n`;
      intro += `This course covers the following main topics:\n`;
      keyTopics.slice(0, 5).forEach((topic, index) => {
        intro += `- ${topic.charAt(0).toUpperCase() + topic.slice(1)}\n`;
      });
      intro += '\n';
    }
    
    if (learningObjectives.length > 0) {
      intro += `## Learning Objectives\n\n`;
      learningObjectives.forEach((objective, index) => {
        intro += `${index + 1}. ${objective}\n`;
      });
      intro += '\n';
    }
    
    // Add a preview of the content
    const contentPreview = fileContent.substring(0, 300) + '...';
    intro += `## Course Overview\n\n${contentPreview}\n\n`;
    intro += `Let's begin this learning journey together!`;
    
    return intro;
  }

  private static async createApplicationContent(fileContent: string, contentAnalysis: any): Promise<string> {
    let applicationContent = `# Practical Applications\n\n`;
    applicationContent += `Now that we've covered the theoretical aspects, let's explore how this knowledge can be applied in practice.\n\n`;
    
    // Extract examples from content
    const examples = this.extractExamples(fileContent);
    if (examples.length > 0) {
      applicationContent += `## Real-World Examples\n\n`;
      examples.forEach((example, index) => {
        applicationContent += `### Example ${index + 1}\n${example}\n\n`;
      });
    }
    
    applicationContent += `## Application Exercise\n\n`;
    applicationContent += `Consider how you might apply these concepts in your own context:\n`;
    applicationContent += `1. Identify a relevant situation in your field\n`;
    applicationContent += `2. Select the most appropriate concepts from this course\n`;
    applicationContent += `3. Develop a plan for implementation\n`;
    applicationContent += `4. Consider potential challenges and solutions\n\n`;
    
    return applicationContent;
  }

  private static async createSummaryContent(fileContent: string, contentAnalysis: any): Promise<string> {
    const { keyTopics } = contentAnalysis;
    
    let summary = `# Course Summary and Key Takeaways\n\n`;
    summary += `Congratulations on completing this comprehensive course! Let's review the key concepts and insights covered.\n\n`;
    
    if (keyTopics.length > 0) {
      summary += `## Main Topics Covered\n\n`;
      keyTopics.slice(0, 6).forEach((topic, index) => {
        summary += `### ${index + 1}. ${topic.charAt(0).toUpperCase() + topic.slice(1)}\n`;
        summary += `Key insights and applications related to ${topic}.\n\n`;
      });
    }
    
    summary += `## Final Thoughts\n\n`;
    summary += `The concepts presented in this course provide a solid foundation for further learning and practical application. `;
    summary += `Continue to explore these topics and apply the knowledge in your professional and personal contexts.\n\n`;
    
    summary += `## Next Steps\n\n`;
    summary += `- Review the key concepts regularly\n`;
    summary += `- Practice applying the knowledge in real situations\n`;
    summary += `- Seek additional resources for deeper understanding\n`;
    summary += `- Share your learning with others\n\n`;
    
    return summary;
  }

  private static extractExamples(content: string): string[] {
    const examples: string[] = [];
    
    // Look for common example indicators
    const examplePatterns = [
      /for example[,:]\s*([^.!?]*[.!?])/gi,
      /such as[,:]\s*([^.!?]*[.!?])/gi,
      /instance[,:]\s*([^.!?]*[.!?])/gi,
      /consider[,:]\s*([^.!?]*[.!?])/gi
    ];
    
    examplePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const example = match.replace(pattern, '$1').trim();
          if (example.length > 20 && example.length < 300) {
            examples.push(example);
          }
        });
      }
    });
    
    return examples.slice(0, 3);
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }
}
