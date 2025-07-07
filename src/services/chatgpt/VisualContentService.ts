
import { ApiCallService } from './ApiCallService';
import { PayloadValidator } from './PayloadValidator';

export interface DiagramInfo {
  id: string;
  title: string;
  description: string;
  type: 'flowchart' | 'diagram' | 'chart' | 'illustration' | 'network' | 'other';
  context: string;
  pageReference?: number;
  relatedSection?: string;
}

export interface VisualAnalysisResult {
  hasDiagrams: boolean;
  diagrams: DiagramInfo[];
  visualElements: {
    charts: number;
    flowcharts: number;
    networkDiagrams: number;
    illustrations: number;
    other: number;
  };
  extractionQuality: 'high' | 'medium' | 'low';
}

export class VisualContentService {
  async analyzeVisualContent(base64Image: string, fileName: string): Promise<VisualAnalysisResult> {
    console.log('🔍 VISUAL CONTENT ANALYSIS START:', {
      fileName,
      imageDataLength: base64Image.length
    });

    // PREPARE: Create vision-specific prompt for diagram detection
    const diagramDetectionPrompt = `Analyze this PDF page for visual elements and diagrams. You are a diagram extraction specialist.

CRITICAL ANALYSIS REQUIREMENTS:
1. Identify ALL visual elements: diagrams, charts, flowcharts, network diagrams, illustrations
2. For each visual element found, provide:
   - A descriptive title/label
   - Detailed description of what it shows
   - Type classification (flowchart, network diagram, chart, etc.)
   - Context of how it relates to the surrounding text
3. Assess the extraction quality based on image clarity
4. Count different types of visual elements

Return your analysis in this exact JSON format:
{
  "hasDiagrams": boolean,
  "diagrams": [
    {
      "id": "unique_id",
      "title": "descriptive title",
      "description": "detailed description of the diagram",
      "type": "flowchart|diagram|chart|illustration|network|other",
      "context": "how it relates to the content"
    }
  ],
  "visualElements": {
    "charts": number,
    "flowcharts": number,
    "networkDiagrams": number,
    "illustrations": number,
    "other": number
  },
  "extractionQuality": "high|medium|low"
}`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: diagramDetectionPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ];

    const maxTokens = 2000;
    const model = 'gpt-4o';

    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ VISUAL CONTENT ANALYSIS - Payload validation failed:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    try {
      const response = await ApiCallService.makeApiCall(requestBody, 'VISUAL CONTENT ANALYSIS');
      
      if (!response) {
        throw new Error('No response from visual content analysis');
      }

      const analysis = JSON.parse(response) as VisualAnalysisResult;
      
      console.log('✅ VISUAL CONTENT ANALYSIS SUCCESS:', {
        hasDiagrams: analysis.hasDiagrams,
        diagramCount: analysis.diagrams.length,
        extractionQuality: analysis.extractionQuality,
        visualElements: analysis.visualElements
      });

      return analysis;
    } catch (error) {
      console.error('❌ Visual content analysis failed:', error);
      throw new Error(`Failed to analyze visual content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractDiagramDescriptions(base64Image: string, identifiedDiagrams: DiagramInfo[]): Promise<DiagramInfo[]> {
    console.log('📊 DIAGRAM DESCRIPTION EXTRACTION START:', {
      diagramCount: identifiedDiagrams.length
    });

    if (identifiedDiagrams.length === 0) {
      return [];
    }

    const enhancedDescriptionPrompt = `Focus on these specific diagrams identified in the image and provide enhanced educational descriptions:

IDENTIFIED DIAGRAMS:
${identifiedDiagrams.map((d, i) => `${i + 1}. ${d.title} (${d.type})`).join('\n')}

For each diagram, provide:
1. A comprehensive educational description
2. Key components and their relationships
3. How it supports learning objectives
4. Technical details visible in the diagram

Return enhanced descriptions in this JSON format:
{
  "enhancedDiagrams": [
    {
      "id": "diagram_id",
      "title": "enhanced title",
      "description": "comprehensive educational description",
      "type": "diagram_type",
      "context": "educational context",
      "keyComponents": ["component1", "component2"],
      "learningValue": "how this diagram helps students learn"
    }
  ]
}`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: enhancedDescriptionPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ];

    const requestBody = {
      model: 'gpt-4o',
      messages,
      max_tokens: 3000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    try {
      const response = await ApiCallService.makeApiCall(requestBody, 'DIAGRAM DESCRIPTION EXTRACTION');
      
      if (!response) {
        throw new Error('No response from diagram description extraction');
      }

      const result = JSON.parse(response);
      
      console.log('✅ DIAGRAM DESCRIPTION EXTRACTION SUCCESS:', {
        enhancedDiagramCount: result.enhancedDiagrams.length
      });

      return result.enhancedDiagrams || [];
    } catch (error) {
      console.error('❌ Diagram description extraction failed:', error);
      throw new Error(`Failed to extract diagram descriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
