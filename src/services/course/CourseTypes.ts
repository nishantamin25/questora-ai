
export interface CourseMaterial {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  title: string;
  order: number;
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
  isActive?: boolean;
  videoUrl?: string;
}
