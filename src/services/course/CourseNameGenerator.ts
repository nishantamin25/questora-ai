
export class CourseNameGenerator {
  static generateCourseName(prompt: string): string {
    const words = prompt.split(' ').filter(word => 
      word.length > 2 && 
      !['the', 'and', 'for', 'with', 'from', 'create', 'course', 'questions'].includes(word.toLowerCase())
    );
    
    const courseWords = words.slice(0, 4).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
    
    return courseWords.join(' ') || 'Educational Course';
  }

  static generateStrictCourseDescription(prompt: string, files: File[] = [], materialCount: number): string {
    let description = `Course content based on: ${prompt}. `;
    
    if (files.length > 0) {
      description += `Created from ${files.length} uploaded file${files.length > 1 ? 's' : ''}. `;
    }
    
    description += `Contains ${materialCount} section${materialCount > 1 ? 's' : ''} extracted directly from the source material.`;
    
    return description;
  }

  static calculateEstimatedTime(materials: any[]): number {
    let totalTime = 0;
    
    materials.forEach(material => {
      switch (material.type) {
        case 'text':
          const wordCount = material.content.split(' ').length;
          totalTime += Math.ceil(wordCount / 200);
          break;
        case 'image':
          totalTime += 5;
          break;
        case 'video':
          totalTime += 10;
          break;
      }
    });

    return Math.max(totalTime, 15);
  }

  static generateId(): string {
    return 'course_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
