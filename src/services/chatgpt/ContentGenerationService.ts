
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
    
    // VALIDATE: Reduced word count limit to accommodate short but valid documents
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 5000);
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
- Work with whatever content is available, even if brief

Generate response now:`
      : `USER REQUEST: "${prompt}"

Generate focused content based strictly on this request. Do not add generic educational frameworks or methodologies unless specifically requested.`;

    // PREPARE: Create properly structured messages
    const messages = [
      {
        role: 'system',
        content: 'You generate content that respects user intent and source material boundaries. When provided with source content, you use ONLY that content. You never fabricate educational frameworks, methodologies, or terminology not present in the source or explicitly requested by the user. You work effectively with both comprehensive and concise source materials.'
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

    // REDUCED: Lower minimum requirement to support short but valid instructional content
    if (!fileContent || fileContent.length < 50) {
      throw new Error('Course generation requires file content (minimum 50 characters)');
    }

    // MERGE: Combine prompt and file content properly
    const mergedContent = PayloadValidator.mergePromptAndFileContent(prompt, fileContent);
    
    // VALIDATE: Significantly increased word limit and made more lenient for short documents
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 20000);
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
    
    const enhancedCourseGenerationPrompt = `UPLOADED FILE CONTENT - WORK WITH AVAILABLE CONTENT:
"""
${fileContent}
"""

INSTRUCTION: Generate a comprehensive course that EXTRACTS and EXPANDS upon ALL content from the uploaded file. Work effectively with whatever content is available, whether extensive or concise. Make the most of brief content by explaining concepts thoroughly.`;

    // PREPARE: Create properly structured messages with UPDATED system prompt for short content handling
    const messages = [
      {
        role: 'system',
        content: `You are an AI-powered course generator that creates clear, structured, concept-driven courses from uploaded files (PDF, DOCX, TXT). You work effectively with both comprehensive documents and concise content like SOPs, training summaries, or slide-based guides.

🎯 Your Main Goal
Teach what the file actually contains, regardless of length. Extract maximum educational value from available content.

For ANY document (short or long):
• Extract key concepts, definitions, procedures
• Explain terminology and frameworks present
• Expand on brief points with clear explanations
• Structure content logically for learning

✅ Content Structure
For each topic in the file, create sections like this:

Section X: [Descriptive Title]

Learning Goal:
What should the learner understand?

Explanation:
150–300+ words explaining the topic using file content.
For brief source material, expand explanations while staying accurate.
Define terms, walk through steps, explain clearly.

Example or Instruction:
Use actual content from the file (steps, rules, examples).

Summary:
Brief takeaway in plain language.

⚠️ Short Content Strategy:
- Extract maximum value from limited content
- Expand explanations while staying truthful to source
- Create comprehensive learning from concise material
- Never fabricate content not in the source

✅ Error-Safe Logic
Work with whatever content is available:
➤ Short files: Create focused, thorough explanations
➤ Long files: Create comprehensive multi-section courses
➤ Always generate useful educational content

🛡️ Fallback only for completely empty files:
"The uploaded file contains no readable instructional content."

✅ Output Expectations
• Well-structured course regardless of source length
• Maximum educational value from available content
• Clear explanations suitable for learners
• Works with any content length or complexity`
      },
      {
        role: 'user',
        content: enhancedCourseGenerationPrompt
      }
    ];

    const maxTokens = 6000;
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
      temperature: 0.1
    };

    try {
      const content = await ApiCallService.makeApiCall(requestBody, 'ENHANCED COURSE CONTENT GENERATION');
      
      // UPDATED: More lenient validation for short but valid content
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
      
      // LENIENT: Reduced minimum thresholds to support short source materials
      if (contentLength < 200) {
        console.error('❌ Content too short for meaningful course:', contentLength, 'characters');
        console.error('📄 ACTUAL CONTENT:', content);
        throw new Error(`Generated course content is insufficient (${contentLength} characters). Source material may be too brief for course generation.`);
      }
      
      if (wordCount < 50) {
        console.error('❌ Content has too few words for meaningful course:', wordCount);
        console.error('📄 ACTUAL CONTENT:', content);
        throw new Error(`Generated course content has insufficient detail (${wordCount} words). Source material may be too brief for comprehensive course generation.`);
      }
      
      // More lenient coverage analysis for short source materials
      const sourceWordCount = fileContent.split(/\s+/).length;
      const expansionRatio = wordCount / sourceWordCount;
      
      if (expansionRatio < 0.5 && sourceWordCount > 100) {
        console.warn('⚠️ Generated content may be too condensed for longer source:', {
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
        adequateCoverage: expansionRatio >= 0.5 || sourceWordCount <= 100
      });
      
      return content;
    } catch (error) {
      console.error('❌ Enhanced course content generation failed:', error);
      
      // Enhanced error with debugging info
      if (error instanceof Error && error.message.includes('insufficient')) {
        throw error; // Re-throw with existing debugging info
      }
      
      throw new Error(`Failed to generate course content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
