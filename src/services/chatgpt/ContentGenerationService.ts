import { ApiCallService } from './ApiCallService';
import { PayloadValidator } from './PayloadValidator';
import { ProcessedVisualContent } from './VisualContentPipeline';

export class ContentGenerationService {
  async generateCourseContent(
    prompt: string, 
    fileContent: string,
    visualContent?: ProcessedVisualContent
  ): Promise<string> {
    console.log('📝 ENHANCED COURSE CONTENT GENERATION WITH VISUAL INTEGRATION:', {
      promptLength: prompt.length,
      contentLength: fileContent.length,
      hasVisualContent: !!visualContent,
      diagramCount: visualContent?.diagrams.length || 0
    });

    const enhancedSystemPrompt = `You are an expert educational content creator with ADVANCED VISUAL INTEGRATION capabilities.

🎯 PRIMARY OBJECTIVE:
Create comprehensive, beginner-friendly educational course content that seamlessly integrates visual elements with textual information.

${visualContent?.hasVisualElements ? `
🎨 VISUAL CONTENT INTEGRATION:
You have access to ${visualContent.diagrams.length} visual elements that MUST be integrated into your content:

VISUAL ELEMENTS AVAILABLE:
${visualContent.diagrams.map((diagram, index) => `
${index + 1}. **${diagram.title}** (${diagram.type})
   - Description: ${diagram.description}
   - Context: ${diagram.context}
   - Integration Point: Include this diagram's explanation in relevant sections
`).join('')}

VISUAL INTEGRATION REQUIREMENTS:
${visualContent.integrationInstructions.map(instruction => `• ${instruction}`).join('\n')}

VISUAL SUMMARY: ${visualContent.visualSummary}
` : 'No visual elements detected - focus on clear textual explanations.'}

📚 CONTENT CREATION GUIDELINES:

STRUCTURE & ORGANIZATION:
• Create well-organized, hierarchical content with clear headings
• Use progressive learning approach from basic to advanced concepts
• Include practical examples and real-world applications
• Maintain logical flow throughout the content

${visualContent?.hasVisualElements ? `
VISUAL-TEXT INTEGRATION:
• Reference diagrams naturally within the text flow
• Explain what each diagram shows and why it's important
• Connect visual elements to theoretical concepts
• Use diagrams to reinforce key learning points
• Include phrases like "As shown in the diagram..." or "The visual representation demonstrates..."
` : ''}

EDUCATIONAL BEST PRACTICES:
• Write in clear, accessible language for beginners
• Define technical terms when first introduced
• Include step-by-step explanations for complex concepts
• Provide context for why each topic is important
• Use bullet points and numbered lists for clarity

CONTENT REQUIREMENTS:
• Comprehensive coverage of the source material
• Beginner-friendly explanations without oversimplification
• Practical applications and examples
• Key takeaways and learning objectives
• Smooth transitions between topics

FORMATTING:
• Use proper headings (##, ###) for organization
• Include bullet points for lists and key concepts
• Bold important terms and concepts
• Maintain consistent formatting throughout

Your response should be substantial, educational, and fully integrated with any available visual content.`;

    const enhancedUserPrompt = `Generate comprehensive course content based on this material with ${visualContent?.hasVisualElements ? 'full visual integration' : 'clear textual explanations'}:

USER REQUEST: ${prompt}

SOURCE MATERIAL:
${fileContent}

${visualContent?.hasVisualElements ? `
VISUAL ELEMENTS TO INTEGRATE:
${visualContent.diagrams.map((diagram, index) => `
${index + 1}. ${diagram.title} (${diagram.type})
   ${diagram.description}
   Context: ${diagram.context}
`).join('\n')}

INTEGRATION INSTRUCTIONS:
${visualContent.integrationInstructions.join('\n')}

Please create educational content that seamlessly weaves these visual elements into the narrative, explaining their significance and how they support the learning objectives.
` : ''}

Create comprehensive, beginner-friendly course content that covers all important aspects of the material${visualContent?.hasVisualElements ? ' while naturally integrating the visual elements' : ''}.`;

    const messages = [
      {
        role: 'system',
        content: enhancedSystemPrompt
      },
      {
        role: 'user',
        content: enhancedUserPrompt
      }
    ];

    const maxTokens = visualContent?.hasVisualElements ? 8000 : 6000; // More tokens for visual integration
    const model = 'gpt-4.1-2025-04-14';

    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ Content generation payload validation failed:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.3, // Balanced creativity with consistency
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    };

    try {
      const response = await ApiCallService.makeApiCall(requestBody, 'ENHANCED_COURSE_CONTENT_GENERATION_WITH_VISUALS');
      
      if (!response) {
        throw new Error('No response from enhanced course content generation');
      }

      console.log('✅ ENHANCED COURSE CONTENT GENERATION SUCCESS:', {
        responseLength: response.length,
        wordCount: response.split(/\s+/).length,
        hasVisualIntegration: !!visualContent?.hasVisualElements,
        diagramsIntegrated: visualContent?.diagrams.length || 0
      });

      return response;
    } catch (error) {
      console.error('❌ Enhanced course content generation failed:', error);
      throw new Error(`Enhanced course content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Keep existing method for backward compatibility
  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    return this.generateCourseContent(prompt, fileContent);
  }
}
