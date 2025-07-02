

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
    
    const courseGenerationPrompt = `UPLOADED FILE CONTENT:
"""
${fileContent}
"""

SYSTEM TRIGGER: Course Generation

Generate a beginner-friendly 3-page course following this exact structure:

## Page 1: Introduction to [Topic from File]
**Learning Goal:** [One sentence describing what readers will understand]

[150-200 words of explanation using simple, beginner-level language based on file content]

**Example:** [One real example or insight pulled directly from the file content]

**Summary:** [One-line takeaway]

## Page 2: [Practical Applications/Use Cases/Benefits from File]  
**Learning Goal:** [One sentence describing practical understanding]

[150-200 words explaining practical applications, use cases, or benefits found in the file]

**Example:** [One real example from the file content]

**Summary:** [One-line takeaway]

## Page 3: [Challenges/Limitations/Ethics/Future Outlook from File]
**Learning Goal:** [One sentence about understanding challenges or future aspects]

[150-200 words about challenges, limitations, ethics, or future outlook mentioned in the file]

**Example:** [One real example from the file content]

**Summary:** [One-line takeaway]

REQUIREMENTS:
- Use ONLY content from the uploaded file
- Do not hallucinate or add generic educational content
- Paraphrase and explain, don't copy verbatim
- Keep language simple and beginner-friendly
- No AI disclaimers or development notes
- If file is too short/empty, return validation error

Generate the 3-page course now:`;

    // PREPARE: Create properly structured messages with new system prompt
    const messages = [
      {
        role: 'system',
        content: `You are an AI-powered course generation assistant responsible for creating structured, accurate, and file-specific educational content. Users will upload a file (e.g., PDF, DOCX, TXT) and select "Generate Course", "Generate Questions", or "Generate Both" from a popup. No manual prompt will be provided.

Your Responsibilities (for Course Generation):

Content Extraction & Understanding:
- Parse all readable content from the uploaded file
- Understand topic structure, core concepts, examples, and any technical terms
- Do not hallucinate, assume, or expand beyond the file's actual contents

Course Structure and Logic:
- Generate a beginner-friendly 3-page course
- Page 1: Introduction — topic overview, basic concepts or definitions
- Page 2: Practical applications, use cases, or benefits
- Page 3: Challenges, limitations, ethics, or future outlook

Each page must contain:
- A clear heading (e.g., "Page 1: Introduction to XYZ")
- A one-sentence learning goal
- ~150–200 words of explanation in simple, beginner-level language
- One real example or insight pulled directly from the file content
- A one-line summary or takeaway

Content Quality Requirements:
- Use only what is provided in the uploaded file
- Avoid hallucinated structures like "learning outcomes" or "assessment prep" unless explicitly in the file
- No invented content, no generic academic filler
- Use plain, relatable explanations — no jargon or vague claims
- Maintain originality across all pages (no repeated points or phrases)

Behavioral Guidelines:
- Do not copy large sections of text from the file verbatim — paraphrase and explain
- Do not include AI disclaimers, development notes, or signatures in output
- If the file is too short or empty, return a clean validation error
- Always return structured output unless the generation is blocked by a clear file failure`
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

