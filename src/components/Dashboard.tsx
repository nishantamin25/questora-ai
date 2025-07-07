import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shell } from "@/components/Shell"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from 'react-router-dom';
import { CourseService } from '@/services/CourseService';
import { QuestionnaireManager } from '@/services/questionnaire/QuestionnaireManager';
import { AuthService } from '@/services/AuthService';
import { GuestFilterService } from '@/services/questionnaire/GuestFilterService';

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: any[];
  createdAt: string;
  isActive?: boolean;
  testName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isSaved?: boolean;
  timeframe?: number;
  setNumber?: number;
  totalSets?: number;
  courseContent?: any;
  course?: any;
}

const Dashboard = () => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();

  useEffect(() => {
    document.title = 'Dashboard | Quiz Platform';
    loadQuestionnaires();
    loadCompletedCourses();
  }, []);

  const loadCompletedCourses = useCallback(async () => {
    if (user.role === 'admin') return;

    try {
      const courses = await CourseService.getCourses();
      const completed = new Set(courses.filter(course => course.isCompleted).map(course => course.id));
      setCompletedCourses(completed);
      console.log('✅ Completed courses loaded:', completed.size);
    } catch (error) {
      console.error('Error loading completed courses:', error);
      toast({
        title: "Error",
        description: "Failed to load completed courses",
        variant: "destructive"
      });
    }
  }, [user.role, toast]);

  const loadQuestionnaires = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allQuestionnaires = await QuestionnaireManager.getAllQuestionnaires();
      console.log('📊 Total questionnaires loaded:', allQuestionnaires.length);
      
      // Apply guest filtering (removes completed questionnaires for guests)
      const filtered = await GuestFilterService.filterQuestionnairesForGuest(allQuestionnaires);
      const validQuestionnaires = filtered.filter(q => q && typeof q === 'object');
      
      // For guest users, filter out questionnaires that have associated courses which haven't been completed
      const accessibleQuestionnaires = user.role === 'admin' 
        ? validQuestionnaires 
        : validQuestionnaires.filter(q => {
            // If questionnaire has an associated course, check if it's completed
            if (q.courseContent || q.course) {
              const courseId = q.courseContent?.id || q.course?.id;
              if (courseId) {
                return completedCourses.has(courseId);
              }
            }
            // If no associated course, questionnaire is accessible
            return true;
          });

      console.log('📋 Accessible questionnaires after filtering:', accessibleQuestionnaires.length);
      
      setQuestionnaires(accessibleQuestionnaires);
    } catch (error) {
      console.error('Error loading questionnaires:', error);
      setError('Failed to load questionnaires');
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  }, [user.role, completedCourses]);

  const handleCreateQuestionnaire = () => {
    navigate('/create');
  };

  return (
    <Shell>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          {user.role === 'admin' && (
            <Button onClick={handleCreateQuestionnaire}>Create Questionnaire</Button>
          )}
        </div>
        {loading && <p>Loading questionnaires...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {questionnaires.map((questionnaire) => (
            <Card key={questionnaire.id} className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl overflow-hidden">
              <CardHeader>
                <CardTitle>{questionnaire.title}</CardTitle>
                <CardDescription>{questionnaire.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created At: {new Date(questionnaire.createdAt).toLocaleDateString()}
                </p>
                {questionnaire.difficulty && (
                  <p className="text-sm text-muted-foreground">
                    Difficulty: {questionnaire.difficulty}
                  </p>
                )}
                {questionnaire.timeframe && (
                  <p className="text-sm text-muted-foreground">
                    Timeframe: {questionnaire.timeframe} minutes
                  </p>
                )}
                <Button onClick={() => navigate(`/questionnaire/${questionnaire.id}`)} className="mt-4">
                  View Questionnaire
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {questionnaires.length === 0 && !loading && !error && (
          <p>No questionnaires available.</p>
        )}
      </div>
    </Shell>
  );
};

export default Dashboard;
