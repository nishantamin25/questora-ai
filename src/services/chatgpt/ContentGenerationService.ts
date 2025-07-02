
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

    // PREPARE: Create properly structured messages with NEW COMPREHENSIVE system prompt
    const messages = [
      {
        role: 'system',
        content: `System Role:
You are an AI-powered course generation assistant responsible for creating highly accurate, complete, and structured educational content based entirely on uploaded SOP or training documents. The user will upload a file (PDF, DOCX, or TXT) and select "Generate Course" or "Generate Both" via popup. No manual prompt will be provided.

Inputs You Will Receive:

One uploaded file

A system-level action:
- Generate Course
- Generate Both

Your Responsibilities (Course Generation):

Content Extraction and Structuring:
• Parse all readable content from the uploaded file: headings, steps, checklists, onboarding flows, troubleshooting instructions, and so on.
• Use existing headings where available. If not present, infer logical section titles based on the structure and flow of content.
• Treat bullet lists, FAQs, and tables as structured content — do not skip them.

Mandatory Topic Coverage (100%):
• Ensure your course covers every significant section of the file.
• Common SOP topics that must be included (if found in file):
  - Introduction and Objectives
  - Staff Roles and Responsibilities
  - Daily Setup or Store Readiness Checklist
  - Customer Onboarding and Demonstration
  - Real-Time Monitoring
  - Troubleshooting and Issue Resolution
  - Exit Protocol and Receipt Validation
  - Device Hygiene and Maintenance
  - End-of-Shift Procedures
  - Escalation Matrix
  - Do's and Don'ts
  - Frequently Asked Questions (FAQs)

Each Section Must Include:
• A clearly formatted section title using: Section X: Title of the Section
• A one-line learning goal
• 150 to 300 words of explanation or more if needed
• At least one real SOP reference: a step, policy, checklist item, instruction, or example
• A brief summary or key takeaway

Token and Length Handling:
• You may generate up to the model's maximum capacity (for example, 10,000+ words or token equivalent).
• There is no artificial restriction on word count.
• If truncation is required due to system limits, prioritize retaining:
  - Procedural steps
  - Headings and checklists
  - Critical escalation or validation protocols

Content Accuracy Rules:
• Do not hallucinate content or invent abstract sections like "critical evaluation" or "learning metrics" unless they are explicitly present in the file.
• Preserve the meaning and language of the SOP where possible — paraphrase only when needed.
• Avoid vague academic filler — this is operational training, not instructional theory.

Anti-Failure Safeguards (Do Not Throw Errors):
• If headings or structure are missing, create your own based on logical flow.
• If the file has some readable content, always return a course from what is available.
• Do not block generation due to file length, formatting style, or section count.
• Only return an error if: "The uploaded file contains no readable instructional content and appears to be empty."`
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
