
import { PayloadValidator } from './PayloadValidator';
import { ApiCallService } from './ApiCallService';

export class ContentGenerationService {
  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    console.log('🔍 CONTENT GENERATION START:', {
      promptLength: prompt.length,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length
    });

    // Input validation
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required for content generation');
    }

    // MERGE: Combine prompt and file content properly
    const mergedContent = PayloadValidator.mergePromptAndFileContent(prompt, fileContent);
    
    // VALIDATE: Check word count before processing
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 2000);
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ CONTENT GENERATION - Word count validated:', wordValidation.wordCount, 'words');
    
    const strictPrompt = fileContent 
      ? `USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

STRICT GENERATION RULES:
- Respond to the user's request using ONLY the document content provided
- Do NOT add educational terminology, frameworks, or concepts not in the document
- Do NOT fabricate "learning objectives", "assessment preparation", "educational structure" unless in source
- Honor the user's intent while staying strictly within document boundaries
- Generate content based on actual file information only

Generate response now:`
      : `USER REQUEST: "${prompt}"

Generate focused content based strictly on this request. Do not add generic educational frameworks or methodologies unless specifically requested.`;

    // PREPARE: Create properly structured messages
    const messages = [
      {
        role: 'system',
        content: 'You generate content that respects user intent and source material boundaries. When provided with source content, you use ONLY that content. You never fabricate educational frameworks, methodologies, or terminology not present in the source or explicitly requested by the user.'
      },
      {
        role: 'user',
        content: strictPrompt
      }
    ];

    const maxTokens = 2000;
    const model = 'gpt-4.1-2025-04-14';

    // VALIDATE: Ensure payload is properly structured
    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ CONTENT GENERATION - Payload validation failed:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    if (payloadValidation.error) {
      console.warn('⚠️ CONTENT GENERATION - Payload warning:', payloadValidation.error);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.2
    };

    try {
      const content = await ApiCallService.makeApiCall(requestBody, 'CONTENT GENERATION');
      
      if (!content) {
        throw new Error('No content generated from OpenAI API');
      }
      
      console.log('✅ CONTENT GENERATION SUCCESS:', content.length, 'characters');
      return content;
    } catch (error) {
      console.error('❌ Content generation failed:', error);
      throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCourseContent(prompt: string, fileContent: string = ''): Promise<string> {
    console.log('🔍 ENHANCED COURSE CONTENT GENERATION START:', {
      promptLength: prompt.length,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length
    });

    // Input validation
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required for course content generation');
    }

    if (!fileContent || fileContent.length < 200) {
      throw new Error('Course generation requires substantial file content (minimum 200 characters)');
    }

    // MERGE: Combine prompt and file content properly
    const mergedContent = PayloadValidator.mergePromptAndFileContent(prompt, fileContent);
    
    // VALIDATE: Check word count before processing - increased limit for comprehensive coverage
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 15000);
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ ENHANCED COURSE CONTENT GENERATION - Word count validated:', wordValidation.wordCount, 'words');
    
    // ENHANCED FILE CONTENT PREVIEW for debugging
    console.log('🔍 FILE CONTENT STRUCTURE ANALYSIS:', {
      totalLines: fileContent.split('\n').length,
      totalCharacters: fileContent.length,
      totalWords: fileContent.split(/\s+/).length,
      hasBulletPoints: /[•\-\*]\s/.test(fileContent),
      hasNumberedLists: /^\d+\.\s/m.test(fileContent),
      hasHeaders: /^[A-Z][^a-z\n]*$/m.test(fileContent),
      hasDefinitions: /:\s/.test(fileContent),
      contentPreview: fileContent.substring(0, 300) + '...'
    });
    
    const enhancedCourseGenerationPrompt = `UPLOADED FILE CONTENT - COMPLETE EXTRACTION REQUIRED:
"""
${fileContent}
"""

CRITICAL INSTRUCTION: Generate a comprehensive, detailed course that EXTRACTS and EXPANDS upon ALL content from the uploaded file. DO NOT SUMMARIZE - EXTRACT EVERYTHING.`;

    // PREPARE: Create properly structured messages with ENHANCED COMPREHENSIVE system prompt
    const messages = [
      {
        role: 'system',
        content: `You are an AI course generation specialist with one critical mission: COMPLETE CONTENT EXTRACTION AND EXPANSION.

CORE PRINCIPLES:
1. NEVER SUMMARIZE - Always extract and expand upon ALL content
2. PRESERVE every detail, definition, example, and explanation from the source
3. Transform the source material into a comprehensive educational course
4. Maintain all technical accuracy and specificity
5. Include ALL bullet points, lists, classifications, and categories mentioned
6. Expand explanations while preserving original terminology and concepts

EXTRACTION REQUIREMENTS:
• Extract EVERY section, subsection, and detail point
• Preserve ALL definitions exactly as written
• Include ALL features, characteristics, and classifications mentioned
• Maintain ALL technical terminology and explanations
• Convert bullet points into detailed explanations while preserving the original information
• Include ALL examples and use cases mentioned

COURSE STRUCTURE REQUIREMENTS:
• Create comprehensive sections for each major topic in the source
• Each section should be 300-800 words with complete detail extraction
• Use clear headings that reflect the source material structure
• Include detailed explanations for every concept mentioned
• Preserve all categorizations and classifications from the source
• Maintain the logical flow and organization of the original content

CONTENT EXPANSION GUIDELINES:
• Take each bullet point and expand it into a full paragraph with complete explanations
• Preserve all technical definitions and expand with context
• Include detailed descriptions for all features and characteristics mentioned
• Maintain accuracy while providing comprehensive coverage
• Use the exact terminology from the source document
• Do NOT add content not present in the source - only expand what's already there

FORBIDDEN ACTIONS:
• Do not summarize or condense any information
• Do not skip any sections or details from the source
• Do not add generic educational frameworks not in the source
• Do not create learning objectives unless they exist in the source
• Do not add assessment criteria unless mentioned in the source

OUTPUT FORMAT:
Generate a comprehensive course with clear section headings, detailed explanations, and complete coverage of all source material. Each section should extract and expand upon the corresponding content in the source document.

Your goal is to create the most comprehensive, detailed course possible while staying strictly within the boundaries of the source material.`
      },
      {
        role: 'user',
        content: enhancedCourseGenerationPrompt
      }
    ];

    const maxTokens = 6000; // Increased significantly for comprehensive content
    const model = 'gpt-4.1-2025-04-14';

    // VALIDATE: Ensure payload is properly structured
    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ ENHANCED COURSE CONTENT GENERATION - Payload validation failed:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    if (payloadValidation.error) {
      console.warn('⚠️ ENHANCED COURSE CONTENT GENERATION - Payload warning:', payloadValidation.error);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.1 // Lower temperature for more accurate extraction
    };

    try {
      const content = await ApiCallService.makeApiCall(requestBody, 'ENHANCED COURSE CONTENT GENERATION');
      
      // ENHANCED VALIDATION LOGIC
      if (!content) {
        console.error('❌ API returned no content');
        throw new Error('No course content generated from OpenAI API');
      }
      
      const contentLength = content.length;
      const wordCount = content.split(/\s+/).length;
      const sectionCount = (content.match(/^##\s/gm) || []).length;
      
      console.log('🔍 ENHANCED GENERATED CONTENT ANALYSIS:', {
        contentLength,
        wordCount,
        sectionCount,
        hasMarkdownHeaders: /^##\s/m.test(content),
        sourceWordCount: fileContent.split(/\s+/).length,
        expansionRatio: wordCount / fileContent.split(/\s+/).length,
        preview: content.substring(0, 300) + '...'
      });
      
      // COMPREHENSIVE CONTENT VALIDATION
      if (contentLength < 500) {
        console.error('❌ Content too short for comprehensive course:', contentLength, 'characters');
        console.error('📄 ACTUAL CONTENT:', content);
        throw new Error(`Generated course content is insufficient (${contentLength} characters). Expected comprehensive extraction and expansion of source material.`);
      }
      
      if (wordCount < 200) {
        console.error('❌ Content has too few words for comprehensive course:', wordCount);
        console.error('📄 ACTUAL CONTENT:', content);
        throw new Error(`Generated course content has insufficient detail (${wordCount} words). Expected comprehensive coverage of all source material.`);
      }
      
      // Check for comprehensive coverage indicators
      const sourceWordCount = fileContent.split(/\s+/).length;
      const expansionRatio = wordCount / sourceWordCount;
      
      if (expansionRatio < 0.8) {
        console.warn('⚠️ Generated content may be too condensed:', {
          sourceWords: sourceWordCount,
          generatedWords: wordCount,
          expansionRatio: expansionRatio.toFixed(2)
        });
      }
      
      console.log('✅ ENHANCED COURSE CONTENT GENERATION SUCCESS:', {
        contentLength,
        wordCount,
        sectionCount,
        sourceWordCount,
        expansionRatio: expansionRatio.toFixed(2),
        comprehensiveCoverage: expansionRatio >= 0.8
      });
      
      return content;
    } catch (error) {
      console.error('❌ Enhanced course content generation failed:', error);
      
      // Enhanced error with debugging info
      if (error instanceof Error && error.message.includes('insufficient')) {
        throw error; // Re-throw with existing debugging info
      }
      
      throw new Error(`Failed to generate comprehensive course content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
