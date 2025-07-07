
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
Divide the course into 4–7 logical sections or topics based on the file content.

For each section:
• Use a clear, topic-based heading (e.g., "Customer Onboarding Process", "Device Troubleshooting", "Exit Validation Protocol")
• Write a descriptive paragraph or two (150–300+ words) explaining the topic, using real information from the file
• If the file contains checklists, procedures, or examples — include them using **bold bullet points** or formatted steps
• Focus on delivering real concepts and insights, not summarizing what the file says

**4. Conclusion**
Close the course with a concise paragraph summarizing the key themes, and optionally encouraging the learner to proceed to the questionnaire (if present).

🚫 STRICT CONTENT RULES

DO NOT:
• Use academic filler phrases (e.g., "This section explains..." or "Foundational principles include...")
• Add repeating subheadings like "Learning Goal," "Summary," etc. inside every section
• Fabricate content — only use what exists in the file
• Include content unless it's clearly derived from the uploaded file
• Say "This section introduces..." or "The document covers..." or "The content is structured to..."

DO:
• Start directly with the topic or instruction in each section
• Explain concepts clearly as if teaching a student
• Use only what is present in the file
• If the file contains domain-specific terms, explain them
• If it contains checklists or bullet points, include and expand them
• Keep the structure consistent across all files and topics
• If the document lacks strong headings, infer logical topics from paragraph flow
• Make the flow feel like natural course material — clean, instructional, and engaging

🛡️ ERROR-SAFE LOGIC
If the file is short or partially readable:
➤ Still generate a concise course using whatever content is available
➤ If no section titles exist, infer topics based on recurring themes or paragraphs

Do not return fallback error messages unless the file is completely blank or corrupted.

Use this fallback only if there is no usable instructional content at all:
"The uploaded file contains no readable instructional content and appears to be empty."

✅ OUTPUT EXPECTATIONS
• A clean, well-structured, multi-section course following the exact format specified
• All sections based on the file content — not assumptions
• No errors, even with low-content or lightly formatted files
• Each topic explained clearly for beginner or intermediate learners
• Must work with any topic area the user uploads
• Natural, engaging flow without repetitive academic structure phrases`
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
