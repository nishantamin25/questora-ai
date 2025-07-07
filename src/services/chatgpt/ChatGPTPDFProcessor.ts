import { ApiKeyManager } from './ApiKeyManager';
import { ApiCallService } from './ApiCallService';
import { PDFTextExtractor } from './PDFTextExtractor';
import { VisualContentPipeline, ProcessedVisualContent } from './VisualContentPipeline';

export class ChatGPTPDFProcessor {
  private static visualPipeline = new VisualContentPipeline();

  static async processPDFWithChatGPT(file: File): Promise<{
    content: string;
    analysis: {
      type: string;
      complexity: 'basic' | 'intermediate' | 'advanced';
      keyTopics: string[];
      wordCount: number;
      isEducational: boolean;
    };
    visualContent?: ProcessedVisualContent;
  }> {
    console.log('🤖 PROCESSING PDF WITH ENHANCED CHATGPT EXTRACTION AND VISUAL ANALYSIS:', file.name);

    if (!ApiKeyManager.hasApiKey()) {
      throw new Error('OpenAI API key required for PDF processing');
    }

    try {
      // STEP 1: Process visual content in parallel with text extraction
      console.log('🎨 Starting visual content analysis...');
      const visualContentPromise = this.visualPipeline.processFileVisualContent(file);

      // STEP 2: Extract base64 from PDF for maximum accuracy
      console.log('📄 Converting PDF to base64 for ChatGPT processing...');
      const base64Data = await this.fileToBase64(file);
      
      console.log('✅ PDF conversion successful:', {
        size: Math.round(base64Data.length * 0.75 / 1024) + 'KB',
        fileName: file.name
      });

      // STEP 3: Wait for visual content processing
      const visualContent = await visualContentPromise;
      console.log('✅ Visual content processing completed:', {
        hasVisualElements: visualContent.hasVisualElements,
        diagramCount: visualContent.diagrams.length
      });
      
      // STEP 4: Use ChatGPT for COMPLETE content extraction with visual context
      const systemPrompt = `You are an expert PDF content extractor with ENHANCED VISUAL PROCESSING capabilities.

YOUR PRIMARY OBJECTIVES:
1. Extract EVERY SINGLE WORD, sentence, and piece of information from the PDF
2. Preserve ALL formatting, structure, hierarchy, and organization
3. **VISUAL CONTENT INTEGRATION**: Incorporate visual elements into the text extraction
4. Maintain ALL bullet points, numbered lists, definitions, and examples
5. Include ALL section headings, subheadings, and titles exactly as they appear
6. Preserve ALL technical terminology, names, and specific details
7. Extract ALL tables, charts, and structured data completely
8. Maintain the exact logical flow and organization of the original document

🎨 ENHANCED VISUAL CONTENT PROCESSING:
${visualContent.hasVisualElements ? `
VISUAL ELEMENTS DETECTED: ${visualContent.diagrams.length} diagrams found
VISUAL SUMMARY: ${visualContent.visualSummary}

DIAGRAM INTEGRATION REQUIREMENTS:
${visualContent.diagrams.map((diagram, index) => `
${index + 1}. **${diagram.title}** (${diagram.type})
   - Description: ${diagram.description}
   - Context: ${diagram.context}
   - Integration: Include this diagram's description in the relevant text section
`).join('')}

INTEGRATION INSTRUCTIONS:
${visualContent.integrationInstructions.map(instruction => `• ${instruction}`).join('\n')}
` : 'No visual elements detected in this document.'}

CRITICAL EXTRACTION REQUIREMENTS:
• Extract verbatim - do not paraphrase, summarize, or condense ANY content
• **VISUAL INTEGRATION**: When extracting text near diagrams, include the diagram descriptions
• Preserve every bullet point and list item completely
• Include every definition, explanation, and example mentioned
• Maintain all section structures and hierarchies
• Extract all categorizations, classifications, and taxonomies
• Include every feature, characteristic, and attribute listed
• Preserve all technical specifications and details
• Extract all procedural steps and instructions completely
• **DIAGRAM CONTEXT**: Reference visual elements in their appropriate text sections

FORMATTING PRESERVATION:
• Maintain original headings and subheadings
• Preserve bullet point structures and indentation
• Keep numbered lists in their original format
• Maintain paragraph structure and breaks
• Preserve any special formatting or emphasis
• **VISUAL MARKERS**: Include references to diagrams/charts where they appear

ANALYSIS REQUIREMENTS:
• Provide accurate word count of extracted content
• Identify main topics based on actual content (not assumptions)
• Assess complexity based on technical depth present in document
• Determine if content is educational based on structure and purpose

FORBIDDEN ACTIONS:
• Do not summarize or condense any information
• Do not paraphrase or rewrite content in your own words
• Do not skip any sections, paragraphs, or details
• Do not add interpretations or explanations not in the original
• Do not reorganize content unless preserving original structure
• **Do not ignore visual elements** - they must be integrated into the text

Return your response in this exact JSON format:
{
  "cleanedContent": "Complete verbatim extraction of all text content with perfect structure preservation AND integrated visual element descriptions",
  "analysis": {
    "type": "educational|business|technical|research|other",
    "complexity": "basic|intermediate|advanced", 
    "keyTopics": ["exact topics from document", "not assumptions"],
    "wordCount": actual_word_count_number,
    "isEducational": true|false,
    "summary": "Brief factual summary based only on extracted content including visual elements"
  }
}`;

      const userPrompt = `Extract ALL content from this PDF with COMPLETE ACCURACY, NO SUMMARIZATION, and FULL VISUAL INTEGRATION. 

CRITICAL REQUIREMENTS:
- Extract every word, sentence, bullet point, and list item
- Preserve all headings, subheadings, and structure exactly
- Include every definition, feature, and characteristic mentioned
- Maintain all categorizations and classifications
- Preserve the complete logical organization and flow
- **INTEGRATE VISUAL ELEMENTS**: Include diagram descriptions in relevant sections
- Do not condense, summarize, or paraphrase anything

${visualContent.hasVisualElements ? `
VISUAL CONTENT TO INTEGRATE:
${visualContent.diagrams.map(d => `• ${d.title}: ${d.description}`).join('\n')}

These visual elements should be described and integrated into the appropriate sections of the extracted content.
` : ''}

This is for comprehensive course generation with visual learning support - I need the COMPLETE, DETAILED content including all visual elements.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'input_file',
              filename: file.name,
              file_data: base64Data
            }
          ]
        }
      ];

      const requestBody = {
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_tokens: 12000, // Significantly increased for complete extraction
        temperature: 0.0, // Maximum accuracy
        response_format: { type: "json_object" }
      };

      console.log('📤 Sending PDF to ChatGPT for COMPLETE content extraction with visual integration...');
      const response = await ApiCallService.makeApiCall(requestBody, 'CHATGPT_COMPLETE_PDF_EXTRACTION_WITH_VISUALS');

      if (!response) {
        throw new Error('No response from ChatGPT PDF extraction');
      }

      const parsedResponse = JSON.parse(response);
      
      if (!parsedResponse.cleanedContent || !parsedResponse.analysis) {
        throw new Error('Invalid response format from ChatGPT PDF extraction');
      }

      // ENHANCED VALIDATION for complete extraction with visuals
      const extractedWordCount = parsedResponse.cleanedContent.split(/\s+/).length;
      
      console.log('✅ CHATGPT COMPLETE PDF EXTRACTION WITH VISUALS SUCCESS:', {
        extractedLength: parsedResponse.cleanedContent.length,
        extractedWordCount: extractedWordCount,
        reportedWordCount: parsedResponse.analysis.wordCount,
        type: parsedResponse.analysis.type,
        complexity: parsedResponse.analysis.complexity,
        isEducational: parsedResponse.analysis.isEducational,
        keyTopicsCount: parsedResponse.analysis.keyTopics.length,
        hasVisualContent: visualContent.hasVisualElements,
        diagramsIntegrated: visualContent.diagrams.length
      });

      // Validate extraction completeness
      if (extractedWordCount < 100) {
        console.warn('⚠️ Extracted content seems insufficient:', extractedWordCount, 'words');
      }

      return {
        content: parsedResponse.cleanedContent,
        analysis: parsedResponse.analysis,
        visualContent: visualContent.hasVisualElements ? visualContent : undefined
      };

    } catch (error) {
      console.error('❌ ChatGPT complete PDF processing with visuals failed:', error);
      throw new Error(`ChatGPT PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  static async extractTextWithFallback(file: File): Promise<string> {
    try {
      const result = await this.processPDFWithChatGPT(file);
      return result.content;
    } catch (error) {
      console.error('ChatGPT PDF processing failed:', error);
      
      // Try direct text extraction as last resort
      try {
        console.log('🔄 Attempting direct PDF text extraction as fallback...');
        const directText = await PDFTextExtractor.extractTextFromPDF(file);
        if (directText && directText.length > 200) {
          return directText;
        }
      } catch (directError) {
        console.error('Direct extraction also failed:', directError);
      }
      
      throw new Error(`PDF processing completely failed. The file "${file.name}" may be image-based, corrupted, or password-protected. Please ensure the PDF contains selectable text.`);
    }
  }
}
