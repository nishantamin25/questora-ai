
export class TitleGenerator {
  static generateContentBasedTitle(content: string, index: number, sourceName: string): string {
    // Extract key terms and concepts from the content to create a meaningful title
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Look for title-like patterns in the first few sentences
    for (let i = 0; i < Math.min(3, sentences.length); i++) {
      const sentence = sentences[i].trim();
      
      // Check for title-like characteristics
      if (sentence.length > 10 && sentence.length < 80) {
        // Remove common sentence starters to see if it could be a title
        const cleanSentence = sentence.replace(/^(?:This|The|In|On|For|With|By|As|When|Where|What|How|Why)\s+/i, '');
        
        if (cleanSentence.length < 60 && !cleanSentence.includes(' and ') && !cleanSentence.includes(' or ')) {
          const titleCandidate = this.cleanTitle(cleanSentence);
          if (titleCandidate.length > 8) {
            return titleCandidate;
          }
        }
      }
    }
    
    // Extract key concepts for title generation
    const keyTerms = this.extractKeyTermsFromContent(content);
    
    if (keyTerms.length > 0) {
      const title = keyTerms.slice(0, 3).join(' & ');
      if (title.length > 8 && title.length < 60) {
        return this.cleanTitle(title);
      }
    }
    
    // Fallback to source-based title
    return `${sourceName} - Section ${index}`;
  }

  static extractKeyTermsFromContent(content: string): string[] {
    // Extract meaningful terms that could form a good title
    const importantTerms = content.match(/\b(?:Introduction|Overview|Analysis|Implementation|Strategy|Technology|Innovation|Management|Operations|Customer|Market|Business|Digital|Platform|Solution|System|Service|Process|Data|Security|Performance|Quality|Development|Framework|Standards|Best|Practices|Artificial|Intelligence|Machine|Learning|Retail|Commerce|Analytics|Optimization|Research|Study|Method|Approach|Technique|Procedure|Application|Practice|Theory|Concept|Principle|Model|Design|Architecture|Structure|Organization|Function|Operation|Capability|Feature|Characteristic|Property|Component|Element|Factor|Aspect|Consideration|Requirement|Specification|Criteria|Standard|Guideline|Recommendation|Benefit|Advantage|Value|Impact|Effect|Influence|Result|Outcome|Achievement|Success|Goal|Objective|Purpose|Mission|Vision|Strategy|Plan|Policy|Rule|Regulation|Law|Legal|Compliance|Governance|Leadership|Direction|Guidance|Support|Training|Education|Learning|Knowledge|Understanding|Skill|Expertise|Experience|Competence|Professional|Industry|Sector|Domain|Field|Area|Region|Market|Customer|Client|User|Stakeholder|Partner|Supplier|Vendor|Provider|Resource|Material|Equipment|Tool|Instrument|Device|Technology|Software|Hardware|Platform|Environment|Context|Situation|Condition|State|Status|Position|Location|Place|Site|Area|Zone|Region|Territory|Domain|Field|Sector|Industry|Market|Segment|Category|Type|Kind|Sort|Class|Group|Set|Collection|Series|Sequence|Order|Arrangement|Organization|Structure|Pattern|Design|Layout|Format|Style|Appearance|Look|View|Perspective|Angle|Point|Opinion|Viewpoint|Position|Stance|Attitude|Approach|Method|Way|Manner|Mode|Style|Technique|Procedure|Process|System|Framework|Model|Pattern|Template|Framework|Structure|System|Architecture|Organization|Configuration|Setup|Installation|Implementation|Application|Usage|Utilization|Employment|Deployment|Operation|Function|Performance|Behavior|Conduct|Activity|Action|Practice|Exercise|Training|Preparation|Planning|Development|Creation|Production|Manufacturing|Construction|Building|Assembly|Installation|Maintenance|Repair|Service|Support|Assistance|Help|Aid|Resource|Tool|Equipment|Facility|Infrastructure|Environment|Setting|Context|Situation|Condition|State|Status|Position|Location|Place|Site|Area|Zone|Region|Territory|Domain|Field|Sector|Industry|Market|Segment|Category|Type|Kind|Sort|Class|Group|Set|Collection|Series|Sequence|Order|Arrangement|Organization|Structure|Pattern|Design|Layout|Format|Style|Appearance|Look|View|Perspective|Angle|Point|Opinion|Viewpoint|Position|Stance|Attitude|Approach|Method|Way|Manner|Mode|Style|Technique|Procedure|Process|System|Framework|Model|Pattern|Template)\b/gi) || [];
    
    const uniqueTerms = [...new Set(importantTerms.map(term => 
      term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()
    ))];
    
    return uniqueTerms.slice(0, 8);
  }

  static cleanTitle(title: string): string {
    return title
      .replace(/[^\w\s&\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
