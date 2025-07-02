
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
    console.log('🔍 COURSE CONTENT GENERATION START:', {
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
    
    // VALIDATE: Check word count before processing
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 3000);
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ COURSE CONTENT GENERATION - Word count validated:', wordValidation.wordCount, 'words');
    
    const courseGenerationPrompt = `USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

COURSE GENERATION INSTRUCTIONS:
Generate a structured 3-page course based SOLELY on the uploaded file content following these strict rules:

1. FILE PARSING & CONTENT UNDERSTANDING:
- Extract and use only readable text from the provided document
- Parse content by structure (headings, paragraphs, examples, definitions)
- Identify core topics, key concepts, and examples from the actual file content

2. COURSE STRUCTURE (3 pages unless specified otherwise):
- Page 1: Introduction to the topic, including key definitions, context, and objectives from the file
- Page 2: Practical applications, use cases, or benefits found in the document
- Page 3: Challenges, limitations, ethics, or future outlook mentioned in the file

3. EACH PAGE MUST INCLUDE:
- A clear heading (e.g., "Page 1: Introduction to [Topic from File]")
- A short learning goal based on file content
- 150-200 words of concise, clear explanation using file information
- One real example or reference directly from the file content
- A 1-2 sentence summary or takeaway

4. CONTENT QUALITY RULES:
- Do NOT fabricate content — only use what's present in the uploaded file
- Avoid hallucinated structures like "learning outcomes," "academic strategies," or "assessment prep" unless found in the file
- Keep tone beginner-friendly and jargon-free
- Use plain English and relatable examples when applicable
- Do not duplicate content across pages

5. FORMATTING:
- Use Markdown format
- Use proper section titles
- Use bulleted points where relevant
- Use bold or italic for emphasis sparingly
- No AI disclaimers or auto-signatures

Generate the 3-page course now based strictly on the file content:`;

    // PREPARE: Create properly structured messages with specialized system prompt
    const messages = [
      {
        role: 'system',
        content: `You are an AI-powered course generation assistant responsible for creating high-quality, structured, and accurate educational content (courses) based solely on the content of user-uploaded files. Your task is to extract and understand the material and produce a clear, modular, multi-section course suitable for beginner learners.

CORE RESPONSIBILITIES:
- Extract all readable text from uploaded files
- Parse content by structure (headings, paragraphs, examples, definitions)
- Generate structured 3-page courses with specific formatting
- Use ONLY content present in the uploaded file
- Never fabricate educational frameworks or methodologies
- Keep content beginner-friendly and jargon-free

BEHAVIORAL GUIDELINES:
- Do not infer or create educational frameworks unless instructed
- Do not duplicate content across pages
- If file lacks depth, summarize what is available without fabrication
- Respond with clear course breakdown, not generic text blocks`
      },
      {
        role: 'user',
        content: courseGenerationPrompt
      }
    ];

    const maxTokens = 2500;
    const model = 'gpt-4.1-2025-04-14';

    // VALIDATE: Ensure payload is properly structured
    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ COURSE CONTENT GENERATION - Payload validation failed:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    if (payloadValidation.error) {
      console.warn('⚠️ COURSE CONTENT GENERATION - Payload warning:', payloadValidation.error);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.2
    };

    try {
      const content = await ApiCallService.makeApiCall(requestBody, 'COURSE CONTENT GENERATION');
      
      if (!content) {
        throw new Error('No course content generated from OpenAI API');
      }
      
      console.log('✅ COURSE CONTENT GENERATION SUCCESS:', content.length, 'characters');
      return content;
    } catch (error) {
      console.error('❌ Course content generation failed:', error);
      throw new Error(`Failed to generate course content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
