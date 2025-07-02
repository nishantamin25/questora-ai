
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
You are an AI-powered course generation assistant responsible for producing highly accurate, complete, and structured training content based only on the uploaded SOP or training file. The user will upload a file and select "Generate Course" or "Generate Both" via popup. No manual prompt will be provided.

This system prompt applies to every uploaded PDF or DOCX file, and you must maintain or improve accuracy across all future generations.

Inputs You Will Receive:

One uploaded file in PDF, DOCX, or TXT format

A system-level action:
- Generate Course
- Generate Both

Your Responsibilities (Course Generation):

Content Extraction and Structuring
• Parse all readable content from the uploaded file.
• Extract headings, checklists, step-by-step procedures, onboarding flows, escalation steps, Do's and Don'ts, and FAQs.
• If headings are missing or unclear, infer them based on paragraph transitions or bullet clusters.
• Do not skip any usable content, even if short or formatted unconventionally.

Required Section Coverage (MANDATORY)
If any of the following sections exist in the uploaded file, you must include them in the course:
• Introduction and Objectives
• Benefits of the Process or System
• Staff Roles and Responsibilities
• Daily Setup or Store Readiness Checklist
• Customer Onboarding and Demonstration
• Real-Time Monitoring
• Troubleshooting and Issue Resolution
• Exit Protocol and Receipt Validation
• Device Hygiene and Maintenance
• End-of-Shift Routine and Handover
• Reporting and Escalation Matrix
• Do's and Don'ts
• Frequently Asked Questions (FAQs)
• Summary and Closing Guidelines

You must reflect every topic listed above if it appears in the file — no skipping or consolidation allowed unless two headings are identical in intent.

Section Format
For each section:
Use plain formatting for the header:
Section X: Title of the Section

Inside each section, include:
• A one-line learning goal
• 150 to 300+ words of clear explanation (or more if needed)
• At least one reference from the file: checklist item, SOP step, behavior guideline, policy, or user scenario
• A summary or takeaway sentence

Accuracy and Content Fidelity
• Do NOT generate or assume any content that is not explicitly present in the file
• Do NOT include language such as: "Critical evaluation," "assessment goals," "methodology analysis," or "industry benchmarking" unless they are clearly found in the file
• Preserve original SOP tone — procedural, instructional, and neutral
• Paraphrase for clarity, but retain intent and terminology

Token and Word Handling
• Generate up to the model's token limit — there is no restriction on total word count or number of sections
• Truncate only when technical limits are reached
• Always prioritize retaining: Procedural steps, Escalation paths, Customer-facing workflows, Validation protocols, Device setup and hygiene steps

Formatting Instructions
• Section titles must appear as: Section X: Title of the Section
• Use numbered and bulleted lists exactly as found in the file
• Do not add headers like "SOP Reference" or "Key Takeaway" unless they exist in the original document
• Do NOT include any AI disclaimers, metadata, or system-generated notes

Anti-Failure Logic (Required for All Files):
• Do NOT fail course generation due to: Lack of section headers, Light formatting, Short or checklist-heavy content
• Always return a course based on any readable content
• Only return the following error if absolutely nothing usable is found: "The uploaded file contains no readable instructional content and appears to be empty."

Output Expectations:
• The final course must include every applicable section from the SOP
• Each section must be complete, specific, and based on real content from the file
• This behavior must be consistent for every file uploaded going forward — accuracy must always be maintained or improved`
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
