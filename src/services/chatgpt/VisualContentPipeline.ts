
import { VisualContentService, DiagramInfo, VisualAnalysisResult } from './VisualContentService';

export interface ProcessedVisualContent {
  hasVisualElements: boolean;
  diagrams: DiagramInfo[];
  visualSummary: string;
  integrationInstructions: string[];
  processingMetadata: {
    totalDiagrams: number;
    processingQuality: 'high' | 'medium' | 'low';
    recommendedSections: string[];
  };
}

export class VisualContentPipeline {
  private visualService = new VisualContentService();

  async processFileVisualContent(file: File): Promise<ProcessedVisualContent> {
    console.log('🎯 VISUAL CONTENT PIPELINE START:', file.name);

    try {
      // Step 1: Convert file to base64 for vision analysis
      const base64Data = await this.fileToBase64(file);
      
      // Step 2: Analyze visual content
      const visualAnalysis = await this.visualService.analyzeVisualContent(base64Data, file.name);
      
      // Step 3: Extract enhanced descriptions if diagrams found
      let enhancedDiagrams: DiagramInfo[] = [];
      if (visualAnalysis.hasDiagrams && visualAnalysis.diagrams.length > 0) {
        enhancedDiagrams = await this.visualService.extractDiagramDescriptions(
          base64Data, 
          visualAnalysis.diagrams
        );
      }

      // Step 4: Generate integration instructions
      const integrationInstructions = this.generateIntegrationInstructions(visualAnalysis, enhancedDiagrams);
      
      // Step 5: Create visual summary
      const visualSummary = this.createVisualSummary(visualAnalysis, enhancedDiagrams);

      const result: ProcessedVisualContent = {
        hasVisualElements: visualAnalysis.hasDiagrams,
        diagrams: enhancedDiagrams.length > 0 ? enhancedDiagrams : visualAnalysis.diagrams,
        visualSummary,
        integrationInstructions,
        processingMetadata: {
          totalDiagrams: visualAnalysis.diagrams.length,
          processingQuality: visualAnalysis.extractionQuality,
          recommendedSections: this.generateRecommendedSections(enhancedDiagrams)
        }
      };

      console.log('✅ VISUAL CONTENT PIPELINE SUCCESS:', {
        hasVisualElements: result.hasVisualElements,
        diagramCount: result.diagrams.length,
        processingQuality: result.processingMetadata.processingQuality
      });

      return result;
    } catch (error) {
      console.error('❌ Visual content pipeline failed:', error);
      
      // Return empty result on failure
      return {
        hasVisualElements: false,
        diagrams: [],
        visualSummary: 'No visual content could be processed from this file.',
        integrationInstructions: [],
        processingMetadata: {
          totalDiagrams: 0,
          processingQuality: 'low',
          recommendedSections: []
        }
      };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  private generateIntegrationInstructions(analysis: VisualAnalysisResult, diagrams: DiagramInfo[]): string[] {
    const instructions: string[] = [];

    if (analysis.hasDiagrams) {
      instructions.push('Integrate visual diagrams into course sections where contextually relevant');
      
      diagrams.forEach((diagram, index) => {
        instructions.push(`Include "${diagram.title}" in section related to ${diagram.context}`);
      });

      if (analysis.visualElements.flowcharts > 0) {
        instructions.push('Use flowchart descriptions to explain process flows and decision points');
      }

      if (analysis.visualElements.networkDiagrams > 0) {
        instructions.push('Incorporate network diagram explanations for system architecture concepts');
      }

      if (analysis.visualElements.charts > 0) {
        instructions.push('Reference chart data and trends in analytical sections');
      }
    }

    return instructions;
  }

  private createVisualSummary(analysis: VisualAnalysisResult, diagrams: DiagramInfo[]): string {
    if (!analysis.hasDiagrams) {
      return 'No visual diagrams or charts detected in this document.';
    }

    const summary = [
      `Visual Content Summary: ${diagrams.length} diagrams detected with ${analysis.extractionQuality} extraction quality.`
    ];

    if (analysis.visualElements.flowcharts > 0) {
      summary.push(`Contains ${analysis.visualElements.flowcharts} flowchart(s) showing process flows.`);
    }

    if (analysis.visualElements.networkDiagrams > 0) {
      summary.push(`Contains ${analysis.visualElements.networkDiagrams} network diagram(s) illustrating system architecture.`);
    }

    if (analysis.visualElements.charts > 0) {
      summary.push(`Contains ${analysis.visualElements.charts} chart(s) with data visualizations.`);
    }

    if (diagrams.length > 0) {
      summary.push(`Key diagrams: ${diagrams.map(d => d.title).join(', ')}.`);
    }

    return summary.join(' ');
  }

  private generateRecommendedSections(diagrams: DiagramInfo[]): string[] {
    const sections = new Set<string>();

    diagrams.forEach(diagram => {
      switch (diagram.type) {
        case 'flowchart':
          sections.add('Process Overview');
          sections.add('Step-by-Step Procedures');
          break;
        case 'network':
          sections.add('System Architecture');
          sections.add('Network Configuration');
          break;
        case 'chart':
          sections.add('Data Analysis');
          sections.add('Performance Metrics');
          break;
        case 'illustration':
          sections.add('Conceptual Framework');
          sections.add('Visual Examples');
          break;
        default:
          sections.add('Visual References');
      }
    });

    return Array.from(sections);
  }
}
