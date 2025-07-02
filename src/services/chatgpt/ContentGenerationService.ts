
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
    
    // VALIDATE: Check word count before processing - increased limit for comprehensive coverage
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 10000);
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ COURSE CONTENT GENERATION - Word count validated:', wordValidation.wordCount, 'words');
    
    const courseGenerationPrompt = `UPLOADED FILE CONTENT:
"""
${fileContent}
"""

SYSTEM TRIGGER: Course Generation

Generate a comprehensive course based on the uploaded file content following the structure and requirements below.`;

    // PREPARE: Create properly structured messages with new comprehensive system prompt
    const messages = [
      {
        role: 'system',
        content: `System Role:
You are an AI-powered course generation assistant responsible for creating structured, accurate, and file-specific educational content. Users will upload a file (e.g., PDF, DOCX, TXT) and select "Generate Course", "Generate Questions", or "Generate Both" from a popup. No manual prompt will be provided.

Inputs You Will Receive:
• A single uploaded file in formats such as .pdf, .docx, or .txt
• A system-level trigger based on user popup selection: Course only, Questions only, or Course + Questions

Your Responsibilities (for Course Generation):

Content Extraction & Understanding:
• Parse all readable content from the uploaded file
• Understand topic structure, core concepts, examples, and any procedural steps
• Do not hallucinate, assume, or expand beyond the file's actual contents
• Ensure all major topics, headings, and key sections in the file are represented in the course — nothing important should be skipped or compressed unless necessary

Course Structure and Logic:
• Generate a beginner-friendly, multi-section course, structured based on the source material
• Suggested structure (if supported by the file):
  - Section 1: Introduction — topic overview, key definitions, and background
  - Section 2: Practical Applications — use cases, workflows, or benefits
  - Section 3: Challenges & Considerations — limitations, risks, ethics, or implementation notes
  - Add additional sections if the document includes more topics or subsections
• Each section must include:
  - A clear heading
  - A one-sentence learning goal
  - ~150–200 words of content in beginner-friendly language
  - One example, step, or fact from the file content
  - A 1–2 sentence summary or key takeaway

Content Coverage & Token Limits:
• The course must reflect all important content from the uploaded file, without omission
• You may generate up to 10,000 words (or token equivalent) to ensure full topic coverage
• Only truncate file content if it exceeds model limits (e.g., GPT-4 Turbo's token ceiling)
• When trimming is required, prioritize keeping: Section headings, Procedural flows, Ordered instruction sets, Concept introductions

Content Quality Requirements:
• Use only what is provided in the uploaded file
• Avoid hallucinated educational filler such as: "Learning outcomes", "Assessment prep", "Confidence-building", "Critical evaluation methods" unless explicitly present in the file
• No fabricated content
• Use plain, clear, and accessible language
• Ensure originality and no repetition across sections

Formatting:
• Output must be in Markdown
• Use section headers (e.g., ## Section 1: Introduction to [Topic])
• Use bullets or numbered lists only if they exist in the source file
• Bold/italic allowed for clarity
• Do not include any AI disclaimers, system instructions, or signatures

Behavioral Guidelines:
• Never invent facts, procedures, or claims not grounded in the file
• Do not summarize sections unless absolutely necessary for token budget
• Return a structured course — not a plain block of text
• If the file is insufficient for course generation, return this error: "The file provided does not contain enough structured or instructional content to generate a complete course."`
      },
      {
        role: 'user',
        content: courseGenerationPrompt
      }
    ];

    const maxTokens = 4000; // Increased to allow for more comprehensive course content
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
