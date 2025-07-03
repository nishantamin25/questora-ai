
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
    
    // ENHANCED FILE CONTENT PREVIEW for debugging
    console.log('🔍 FILE CONTENT PREVIEW (first 500 chars):', fileContent.substring(0, 500));
    console.log('🔍 FILE CONTENT STRUCTURE:', {
      totalLines: fileContent.split('\n').length,
      hasHeaders: /^#+\s|^[A-Z][^a-z]*:|^\d+\./m.test(fileContent),
      wordCount: fileContent.split(/\s+/).length,
      containsSteps: /step|procedure|instruction|process/i.test(fileContent)
    });
    
    const courseGenerationPrompt = `UPLOADED FILE CONTENT:
"""
${fileContent}
"""

SYSTEM TRIGGER: Course Generation

Generate a comprehensive course based on the uploaded file content following the structure and requirements below.`;

    // PREPARE: Create properly structured messages with UPDATED COMPREHENSIVE system prompt
    const messages = [
      {
        role: 'system',
        content: `You are an AI-powered course generation assistant responsible for producing complete, highly accurate, and structured training content based solely on the uploaded file. The file will be an SOP, policy document, or training guide in PDF, DOCX, or TXT format. The user will not provide a manual prompt. They will upload the file and select "Generate Course" or "Generate Both" via popup.

This behavior and standard must apply to every file uploaded, and you must never return fallback error messages based on length or formatting — instead, generate whatever usable instructional content is available.

Inputs You Will Receive:

One uploaded file (e.g., PDF, DOCX, or TXT)

A system-level action:
- Generate Course
- Generate Both

Your Responsibilities (Course Generation):

Extract all readable instructional content from the uploaded file
• Use all available material: headings, checklists, workflows, steps, policies, and examples
• If structure is missing or weak, infer groupings based on natural topic flow
• Do not return fallback errors like "file is empty" unless absolutely no text is available
• If the file includes partial, minimal, or informal instructional text, still generate a simplified but usable course

Section Coverage:

Include the following sections only if they exist:
• Introduction and Objectives
• Benefits
• Roles and Responsibilities
• Setup or Readiness Checklist
• Customer Onboarding
• Real-Time Monitoring
• Troubleshooting and Escalation
• Exit Protocol
• Device Care
• Shift Handover
• Do's and Don'ts
• FAQs
• Summary

If few of these exist, generate a short course with whatever is available — but do not throw an error.

Section Format:

Use section headers:
Section X: Title of the Section

For each:
• One-sentence learning goal
• 100–300+ words of clear explanation
• One real example, procedure, or list item
• A summary sentence

If you cannot build multiple sections, create a single "Quick Guide" section that captures the key idea(s).

Content Accuracy:
• Use only content from the file
• Never hallucinate, generalize, or invent instructional theory
• Never return default messages like "the file contains no readable content" unless it is truly blank

Token Limit:
• No hard word count required
• If the file only supports 1–2 sections, return them — do not fail

Failure Handling — Do NOT Return Fallback Text Unless Truly Empty:

If file = blank:
"The uploaded file contains no readable instructional content and appears to be empty."

Otherwise:
Return any usable content, even if:
• Only 1 section can be generated
• Only a checklist or 1 paragraph exists

Never respond with:
• "Generated content has insufficient words…"
• "The file appears to be binary or empty…"

Instead, build a concise, minimal course with any content found

Output Expectations:
• Always return usable content if any readable instruction exists
• Never throw errors due to short file length, few words, or weak formatting
• Return a short course (1–2 sections) if needed — no error fallback unless the file is fully blank`
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
      
      // RELAXED VALIDATION LOGIC - Much more tolerant
      if (!content) {
        console.error('❌ API returned no content');
        throw new Error('No course content generated from OpenAI API');
      }
      
      const contentLength = content.length;
      const wordCount = content.split(/\s+/).length;
      const sectionCount = (content.match(/^##\s/gm) || []).length;
      
      console.log('🔍 GENERATED CONTENT ANALYSIS:', {
        contentLength,
        wordCount,
        sectionCount,
        hasMarkdownHeaders: /^##\s/m.test(content),
        preview: content.substring(0, 200) + '...'
      });
      
      // RELAXED THRESHOLDS - Accept much smaller content
      if (contentLength < 50) {
        console.error('❌ Content extremely short:', contentLength, 'characters');
        console.error('📄 ACTUAL CONTENT:', content);
        throw new Error(`Generated content is too short (${contentLength} characters). Content preview: "${content.substring(0, 100)}..."`);
      }
      
      if (wordCount < 20) {
        console.error('❌ Content has too few words:', wordCount);
        console.error('📄 ACTUAL CONTENT:', content);
        throw new Error(`Generated content has insufficient words (${wordCount} words). Content preview: "${content.substring(0, 100)}..."`);
      }
      
      // WARN but don't reject for borderline cases
      if (contentLength < 300) {
        console.warn('⚠️ Generated content is shorter than expected but acceptable:', contentLength, 'characters');
      }
      
      if (sectionCount < 2) {
        console.warn('⚠️ Generated content has fewer sections than expected but acceptable:', sectionCount);
      }
      
      console.log('✅ COURSE CONTENT GENERATION SUCCESS:', {
        contentLength,
        wordCount,
        sectionCount,
        acceptedWithWarnings: contentLength < 300 || sectionCount < 2
      });
      
      return content;
    } catch (error) {
      console.error('❌ Course content generation failed:', error);
      
      // Enhanced error with debugging info
      if (error instanceof Error && error.message.includes('too short')) {
        throw error; // Re-throw with existing debugging info
      }
      
      throw new Error(`Failed to generate course content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
