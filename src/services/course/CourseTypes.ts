
export interface CourseMaterial {
  type: 'text' | 'image' | 'video';
  content: string;
  title: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  materials: CourseMaterial[];
  estimatedTime: number;
  createdAt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pdfUrl?: string;
}
