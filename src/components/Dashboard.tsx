
import { useState, useEffect } from 'react';
import { Plus, Settings, Users, BarChart3, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from "@/hooks/use-toast";
import QuestionnaireDisplay from './QuestionnaireDisplay';
import GenerateTestDialog from './GenerateTestDialog';
import SettingsDialog from './SettingsDialog';
import AdminAnalytics from './AdminAnalytics';
import ResponseManagement from './ResponseManagement';
import Leaderboard from './Leaderboard';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { CourseService } from '@/services/CourseService';
import { PDFGeneratorService } from '@/services/PDFGeneratorService';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('questionnaires');
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const allQuestionnaires = user.role === 'admin' 
        ? QuestionnaireService.getAllQuestionnaires()
        : QuestionnaireService.getActiveQuestionnaires();
      
      const allCourses = CourseService.getAllCourses();
      
      setQuestionnaires(allQuestionnaires);
      setCourses(allCourses);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    }
  };

  const handleGenerateTest = async (
    testName: string, 
    difficulty: 'easy' | 'medium' | 'hard', 
    numberOfQuestions: number, 
    timeframe: number, 
    includeCourse: boolean, 
    includeQuestionnaire: boolean, 
    numberOfSets: number
  ) => {
    setIsGenerating(true);
    try {
      const options = {
        testName,
        difficulty,
        numberOfQuestions,
        timeframe,
        includeCourse,
        includeQuestionnaire
      };

      const result = await QuestionnaireService.generateQuestionnaire(
        testName,
        options,
        [],
        1,
        numberOfSets
      );

      if (result.course) {
        CourseService.saveCourse(result.course);
      }

      QuestionnaireService.saveQuestionnaire(result.questionnaire);
      loadData();
      
      toast({
        title: "Success!",
        description: `Generated ${result.course ? 'course and ' : ''}test successfully!`,
      });

      setIsGenerateDialogOpen(false);
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCoursePDF = (course: any) => {
    try {
      if (course.pdfUrl) {
        PDFGeneratorService.downloadPDF(course.pdfUrl, `${course.name}.pdf`);
        toast({
          title: "Success",
          description: "Course PDF downloaded successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: "PDF not available for this course",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  const handleQuestionnaireUpdate = (updatedQuestionnaire: any) => {
    QuestionnaireService.saveQuestionnaire(updatedQuestionnaire);
    loadData();
  };

  const handleQuestionnaireDelete = (questionnaireId: string) => {
    try {
      QuestionnaireService.deleteQuestionnaire(questionnaireId);
      loadData();
      toast({
        title: "Success",
        description: "Test deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete test",
        variant: "destructive"
      });
    }
  };

  const filteredQuestionnaires = user.role === 'guest' 
    ? questionnaires.filter(q => {
        const accessCheck = QuestionnaireService.canAccessQuestionnaire(q.id, user.role);
        return accessCheck.canAccess || q.requiresCourseCompletion;
      })
    : questionnaires;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user.username}!
            </h1>
            <p className="text-gray-600">
              {user.role === 'admin' ? 'Admin Dashboard' : 'Student Portal'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <Button
                onClick={() => setIsGenerateDialogOpen(true)}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Test'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            
            <Button
              variant="outline"
              onClick={onLogout}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs for Admin */}
        {user.role === 'admin' && (
          <div className="mb-6">
            <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
              {[
                { key: 'questionnaires', label: 'Tests', icon: FileText },
                { key: 'courses', label: 'Courses', icon: FileText },
                { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                { key: 'responses', label: 'Responses', icon: Users },
                { key: 'leaderboard', label: 'Leaderboard', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        {(activeTab === 'questionnaires' || user.role === 'guest') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {user.role === 'admin' ? 'All Tests' : 'Available Tests'}
              </h2>
            </div>
            
            {filteredQuestionnaires.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">
                    {user.role === 'admin' 
                      ? 'No tests created yet. Click "Generate Test" to create your first test.'
                      : 'No tests available at the moment.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredQuestionnaires.map((questionnaire) => (
                  <QuestionnaireDisplay
                    key={questionnaire.id}
                    questionnaire={questionnaire}
                    isAdmin={user.role === 'admin'}
                    onUpdate={handleQuestionnaireUpdate}
                    onDelete={handleQuestionnaireDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'courses' && user.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Generated Courses</h2>
            </div>
            
            {courses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">
                    No courses generated yet. Create a test with course option enabled.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {courses.map((course) => (
                  <Card key={course.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{course.name}</span>
                        {course.pdfUrl && (
                          <Button 
                            onClick={() => handleDownloadCoursePDF(course)}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{course.description}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>📖 {course.materials?.length || 0} sections</span>
                        <span>⏱️ ~{course.estimatedTime || 0} minutes</span>
                        <span>📅 {new Date(course.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && user.role === 'admin' && <AdminAnalytics />}
        {activeTab === 'responses' && user.role === 'admin' && <ResponseManagement />}
        {activeTab === 'leaderboard' && <Leaderboard />}
      </div>

      <GenerateTestDialog
        open={isGenerateDialogOpen}
        prompt=""
        uploadedFiles={[]}
        processedFileContent=""
        onGenerate={handleGenerateTest}
        onCancel={() => setIsGenerateDialogOpen(false)}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userRole={user.role}
      />
    </div>
  );
};

export default Dashboard;
