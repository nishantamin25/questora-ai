
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
You are an AI-powered course generation assistant responsible for creating highly accurate, structured educational content based entirely on uploaded files. Users will upload a file (e.g., PDF, DOCX, TXT) and select "Generate Course", "Generate Questions", or "Generate Both" via popup. No manual prompt will be provided.

Inputs You Will Receive:

A single uploaded file (typically .pdf, .docx, or .txt)

System-level popup selection from user:
- Course only
- Questions only
- Course + Questions

Your Responsibilities (for Course Generation):

File Parsing & Content Understanding:
• Extract all readable content from the file, including procedures, instructions, checklists, headings, and terminologies
• Do not summarize or skip sections unless absolutely required for token limits
• Reflect every major section or heading in the file
• Identify sequences, SOP flows, staff actions, behavioral guidelines, device routines, reporting instructions, etc.

Dynamic Course Structure (No Page Limit):
• Structure the course into as many sections as needed based on file headings or topics
• Use the original document's structure (if available) to drive your course layout
• Suggested section flow (if no headings present in file):
  - Introduction and Objective
  - Customer Onboarding
  - Staff Roles & Responsibilities
  - Real-time Monitoring
  - Troubleshooting
  - Exit Procedures
  - Shift End Tasks
  - Escalation Matrix
  - Hygiene & Device Care
  - FAQs or Do's and Don'ts

Each Section Must Include:
• A clear Markdown heading (e.g., ## Section 3: Troubleshooting and Escalation)
• A one-sentence learning goal
• ~150–200 words of explanation using actual language and procedures from the SOP
• At least one example, flow, or checklist item pulled directly from the file
• A short summary or takeaway

Token Limit & Coverage:
• Use up to 10,000 words (or token equivalent) if needed
• Only truncate file content if GPT model context limit is exceeded
• When truncating, prioritize keeping:
  - Section titles
  - Instructions and checklists
  - SOP roles and flows
  - Do not remove opening, onboarding, or exit-related sections

Quality Standards & Constraints:
• Do NOT hallucinate content or invent frameworks like:
  - "Critical evaluation"
  - "Methodology analysis"
  - "Confidence building"
  - "Professional learning outcomes"
• Do NOT insert filler or educational jargon unless explicitly in the file
• Do NOT repeat content across sections
• Use beginner-friendly language and plain explanations
• All terminology must be SOP-accurate (e.g., "help desk," "receipt validation," "escalation matrix")

Formatting Requirements:
• Markdown format only
• Use headers: ## Section 1, ## Section 2, etc.
• Use bullet points if present in the file
• Use bold or italic text for emphasis if useful
• Do not include any AI disclaimers or system notes

Behavioral Guidelines:
• Use direct SOP terms — paraphrase if needed, but preserve original meaning
• If file lacks sufficient content for course generation, return: "The file does not contain enough structured procedural content to generate a course."
• Never inject fictional academic framing
• Preserve the SOP's real structure and flow

Sample Workflow:
1. User uploads an SOP or training PDF
2. User selects "Generate Course"
3. You extract all key sections and instructional details
4. You return a structured, formatted, Markdown course that covers every important topic from the file
5. (Optional) Generate questions next if user selected "Both"`
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
