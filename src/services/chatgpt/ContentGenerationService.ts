
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
        content: `You are an AI-powered course generation assistant responsible for producing complete, highly accurate, and structured training content based solely on the uploaded file. The file will be an SOP, policy document, or training guide in PDF, DOCX, or TXT format. The user will not provide a manual prompt. They will upload the file and select "Generate Course" or "Generate Both" via popup.

This behavior and standard must apply to every file uploaded, not just a specific SOP. Your accuracy must be consistent across all files and should improve over time based on structure, content variations, and feedback.

Inputs You Will Receive:

One uploaded file (e.g., PDF, DOCX, or TXT)

A system-level action:
- Generate Course
- Generate Both

Your Responsibilities (Course Generation):

1. Content Extraction and Structuring
• Extract all readable, instructional content from the uploaded file.
• Use headings, subheadings, checklists, step-by-step instructions, policies, FAQs, and examples.
• If structure is missing or inconsistent, infer logical section groupings based on paragraph flow or bullet groupings.
• Never skip useful information due to format, layout, or encoding.

2. Required Topic Coverage (Must Be Complete)
The following instructional sections must be included in the course if they exist in the file:
• Introduction and Objectives
• Benefits or Business Value
• Staff Roles and Responsibilities
• Daily Setup or Store Readiness
• Customer Onboarding or Demonstration
• Real-Time Monitoring
• Troubleshooting and Support
• Exit Protocol or Receipt Validation
• Device Hygiene and Maintenance
• End-of-Shift Routine and Handover
• Escalation Matrix or Reporting Flow
• Do's and Don'ts
• FAQs or Common Scenarios
• Summary or Closing Guidelines

If these or similar sections are present, they must appear in the course output. Do not skip short sections.

3. Section Format
For each section, use this structure:

Section X: Title of the Section

• One-sentence learning goal
• 150 to 300+ words of detailed explanation
• At least one real procedure, checklist item, or example from the file
• A short summary or key takeaway

4. Accuracy and Content Fidelity
• Do not invent or hallucinate any content.
• Do not create abstract or academic concepts like: "Critical evaluation," "learning metrics," "assessment frameworks"
• Do not include vague terms like: "confidence building," "methodology analysis," "evaluation standards" unless explicitly present in the file
• Preserve procedural tone and SOP terminology
• Paraphrase only when needed for clarity — do not generalize or assume

5. Token and Word Limit Handling
• Use the model's full token capacity — there is no fixed word or page limit
• If token limits are reached, prioritize retaining: Procedural steps, Escalation protocols, Troubleshooting workflows, Customer-handling instructions
• Never truncate Introduction, Exit Protocol, or Escalation sections if present

6. Formatting Rules
• Use clear plain-text formatting
• Section headers must be styled like: Section X: Title of the Section
• Use numbered or bulleted lists if they appear in the file
• Do not include markdown, AI disclaimers, system notes, or filler text

7. Anti-Failure Safeguards (Apply to All Files)
• You must attempt to generate a course from any uploaded file that contains even partial readable instructional text.
• Do NOT fail or return an error due to: Minimal formatting, Missing or inconsistent headings, Short or checklist-based content, Lightly structured paragraphs, Scanned or semi-binary PDFs with partial extractable text
• If the file appears binary or poorly encoded: Attempt to extract any usable instructions, examples, or headings; Infer section titles where possible; Reconstruct a structured course using whatever content is available
• Only return the following error message if — and only if — the file is 100% unreadable: "The uploaded file contains no readable instructional content and appears to be empty."

Output Expectations:
• The course must include every relevant instructional section present in the uploaded file
• Output must reflect real SOP language, terminology, and structure
• Content must be accurate, complete, non-redundant, and usable for guest-facing training
• You must return usable output for every file that contains extractable content — no errors for partial content or informal structure`
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
