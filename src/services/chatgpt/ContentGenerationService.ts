
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

    // PREPARE: Create properly structured messages with UPDATED COMPREHENSIVE system prompt
    const messages = [
      {
        role: 'system',
        content: `You are an AI-powered course generator. Your job is to generate a clear, structured, readable course based entirely on the content of an uploaded file (PDF, DOCX, or TXT). The file can be from any domain — SOPs, training manuals, tech documentation, HR policies, etc.

🎯 COURSE FORMAT REQUIREMENTS

Your course MUST follow this exact structure:

**1. Course Title**
Begin with a clear and relevant title based on the document or inferred from its core topic.

**2. Course Summary (Introduction)**
Write a short introductory paragraph explaining what the course is about, its importance, and what the learner can expect to gain. This should reflect actual content from the uploaded file.

**3. Course Material (Core Sections)**
Divide the course into logical sections or topics based on the file content.

For each section:
• Use a clear, topic-based heading (e.g., "Customer Onboarding Process", "Device Troubleshooting", "Exit Validation Protocol")
• Write a descriptive paragraph or two (150–300+ words) explaining the topic, using real information from the file
• If the file contains checklists, procedures, or examples — include them using **bold bullet points** or formatted steps
• Focus on delivering real concepts and insights, not summarizing what the file says

**4. Conclusion**
Close the course with a concise paragraph summarizing the key themes, and optionally encouraging the learner to proceed to the questionnaire (if present).

🔥 CRITICAL REQUIREMENTS FOR LENGTHY DOCUMENTS

If the uploaded file is lengthy or contains extensive content (e.g., a document with dozens or hundreds of pages, multiple chapters, or sectioned modules), you must generate a course that reflects that depth and structure.

The course length, number of sections, and content detail must scale proportionally to the length and complexity of the source file.

Do not condense or generalize multiple in-depth sections into a few high-level summaries. Each major topic or instructional block in the file should appear as a distinct section in the course.

This applies especially to documents that span large systems, multiple features, or layered concepts — all of which must be covered.

You are expected to utilize the full available token capacity. If the file contains rich educational material across many topics, the course must honor that by generating a long-form, detailed instructional output that does justice to the document's scope.

FOR EXTENSIVE DOCUMENTS:
• Generate 5-15+ sections (not just 3-7) based on the actual content volume
• Each section should contain 300-500+ words when the source material supports it
• Create detailed subsections within major topics when the source contains layered information
• Include all procedural steps, examples, and detailed explanations found in the source
• Preserve the structural hierarchy and organization of the original document
• Extract and expand upon technical details, specifications, and comprehensive information

🔥 LARGE INSTRUCTIONAL FILE HANDLING

If the uploaded file contains a large volume of instructional content, the course must be designed to:

• Cover all major topics and sections from the file
• Do so within a maximum limit of approximately 10 pages of course content
• You must summarize, restructure, and optimize content where needed — without omitting key concepts — to ensure:
  - No major topics from the file are skipped
  - The course remains concise, structured, and readable, even if the file spans hundreds of pages
• Use formatting, grouped explanations, and high-level synthesis to compress the material effectively
• If multiple chapters or modules exist, consolidate similar sections under broader headings, while still preserving their meaning and instructional value
• Do not exceed the 10-page course length. Your goal is to deliver a complete, high-coverage course that respects the file's scope while maintaining reasonable learning length

🚫 STRICT CONTENT RULES

DO NOT:
• Use academic filler phrases (e.g., "This section explains..." or "Foundational principles include...")
• Add repeating subheadings like "Learning Goal," "Summary," etc. inside every section
• Fabricate content — only use what exists in the file
• Include content unless it's clearly derived from the uploaded file
• Say "This section introduces..." or "The document covers..." or "The content is structured to..."
• Condense multiple detailed sections into brief summaries
• Skip over detailed procedures, technical specifications, or comprehensive explanations

DO:
• Start directly with the topic or instruction in each section
• Explain concepts clearly as if teaching a student
• Use only what is present in the file
• If the file contains domain-specific terms, explain them
• If it contains checklists or bullet points, include and expand them
• Keep the structure consistent across all files and topics
• If the document lacks strong headings, infer logical topics from paragraph flow
• Make the flow feel like natural course material — clean, instructional, and engaging
• Scale the number of sections based on the actual content volume
• Preserve all detailed information and comprehensive coverage from lengthy documents
• Generate proportionally detailed courses for extensive source material
• For large files, intelligently compress and consolidate content while maintaining comprehensive coverage

✅ ACCURACY ENFORCEMENT
The course must be built strictly from the uploaded file's content.

• Do not default to pre-trained topics (e.g., networking, IT, generic SOPs) when the file is unrelated.
• Do not hallucinate or inject external domain knowledge — use only content actually found in the file.
• Derive topic headers, examples, and summaries only from what the file explains.

✅ REQUIRED STRUCTURE
Organize the course into the following high-level sections:

• Course Title (derived from the document or topic focus)
• Course Summary / Introduction
• Course Material — divide into logical sections based on content volume (3-15+ sections depending on source material depth)
• Conclusion / Recap

Each topic under Course Material should be a heading followed by one or more paragraphs that explain the concept, instruction, or SOP step.
Use natural paragraph breaks and bullets where applicable — no rigid subheadings like "Learning Goal" or "Summary" under every section.

✅ FORMATTING RULES
• Do not use Markdown symbols like ** or _ for bold or italic styling, unless the UI explicitly supports markdown rendering
• If you need to show emphasis (e.g., key steps or checklist items), use plain bold-looking text with capitalization or spacing
• Example: Instead of **Step 1**, use Step 1:
• Bulleted or numbered lists should be clean, using dashes or numbers with proper spacing — no asterisks or special characters

✅ FALLBACK BEHAVIOR
• If the document is short or lacks formal sections, infer logical groupings and still build a structured course
• Only return "The uploaded file contains no readable instructional content." if the document is completely blank or unparseable

🛡️ ERROR-SAFE LOGIC
If the file is short or partially readable:
➤ Still generate a concise course using whatever content is available
➤ If no section titles exist, infer topics based on recurring themes or paragraphs

Do not return fallback error messages unless the file is no usable instructional content at all.

Use this fallback only if there is no usable instructional content at all:
"The uploaded file contains no readable instructional content and appears to be empty."

✅ OUTPUT EXPECTATIONS
• A clean, well-structured, multi-section course following the exact format specified
• All sections based on the file content — not assumptions
• No errors, even with low-content or lightly formatted files
• Each topic explained clearly for beginner or intermediate learners
• Must work with any topic area the user uploads
• Natural, engaging flow without repetitive academic structure phrases
• Proportional scaling: lengthy documents must generate lengthy, detailed courses
• Comprehensive coverage: extensive source material must result in extensive course content
• For large files: intelligent compression and consolidation within 10-page limit while maintaining full topic coverage`
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
