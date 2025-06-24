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
  const [generatedContent, setGeneratedContent] = useState<{ questionnaire?: any; course?: any } | null>(null);

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

  const handleGenerateTest = async (prompt: string, options: any, files: File[]) => {
    setIsGenerating(true);
    try {
      console.log('🚀 Starting test generation with files:', files.map(f => f.name));
      
      const result = await QuestionnaireService.generateQuestionnaire(
        prompt,
        options,
        files,
        1,
        1
      );

      console.log('✅ Generation completed:', {
        questionnaire: !!result.questionnaire,
        course: !!result.course,
        questionCount: result.questionnaire?.questions?.length || 0
      });

      // Save course if generated
      if (result.course) {
        CourseService.saveCourse(result.course);
        console.log('💾 Course saved');
      }

      // Save questionnaire
      QuestionnaireService.saveQuestionnaire(result.questionnaire);
      console.log('💾 Questionnaire saved');

      // Set generated content for immediate display
      setGeneratedContent(result);

      // Refresh data
      loadData();
      
      toast({
        title: "Success!",
        description: `Generated ${result.course ? 'course and ' : ''}test successfully!`,
      });

      setIsGenerateDialogOpen(false);
    } catch (error) {
      console.error('💥 Generation failed:', error);
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

  const renderGeneratedContent = () => {
    if (!generatedContent) return null;

    return (
      <div className="space-y-6 mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-green-800">🎉 Just Generated!</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setGeneratedContent(null)}
          >
            Clear
          </Button>
        </div>

        {generatedContent.course && (
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                📚 Generated Course: {generatedContent.course.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-700 mb-4">{generatedContent.course.description}</p>
              <div className="flex gap-4 text-sm text-gray-600 mb-4">
                <span>📖 {generatedContent.course.materials?.length || 0} sections</span>
                <span>⏱️ ~{generatedContent.course.estimatedTime || 0} minutes</span>
                <span>📅 {new Date(generatedContent.course.createdAt).toLocaleDateString()}</span>
              </div>
              {generatedContent.course.pdfUrl && (
                <Button 
                  onClick={() => handleDownloadCoursePDF(generatedContent.course)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Course PDF
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {generatedContent.questionnaire && (
          <QuestionnaireDisplay
            questionnaire={generatedContent.questionnaire}
            isAdmin={user.role === 'admin'}
            onUpdate={handleQuestionnaireUpdate}
            onDelete={handleQuestionnaireDelete}
          />
        )}
      </div>
    );
  };

  const filteredQuestionnaires = user.role === 'guest' 
    ? questionnaires.filter(q => {
        const accessCheck = QuestionnaireService.canAccessQuestionnaire(q.id, user.role);
        return accessCheck.canAccess || q.requiresCourseCompletion; // Show all for course flow
      })
    : questionnaires;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, {user.username}!
            </h1>
            <p className="text-purple-200">
              {user.role === 'admin' ? 'Admin Dashboard' : 'Student Portal'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Button
                onClick={() => setIsGenerateDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isGenerating}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Test'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            
            <Button
              variant="outline"
              onClick={onLogout}
              className="border-red-300/50 text-red-300 hover:bg-red-500/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {user.role === 'admin' && (
          <div className="flex gap-2 mb-6">
            {['questionnaires', 'courses', 'analytics', 'responses', 'leaderboard'].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'border-white/20 text-white hover:bg-white/10'
                }
              >
                {tab === 'questionnaires' && <FileText className="mr-2 h-4 w-4" />}
                {tab === 'courses' && <FileText className="mr-2 h-4 w-4" />}
                {tab === 'analytics' && <BarChart3 className="mr-2 h-4 w-4" />}
                {tab === 'responses' && <Users className="mr-2 h-4 w-4" />}
                {tab === 'leaderboard' && <Users className="mr-2 h-4 w-4" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>
        )}

        {renderGeneratedContent()}

        {(activeTab === 'questionnaires' || user.role === 'guest') && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {user.role === 'admin' ? 'All Tests' : 'Available Tests'}
            </h2>
            
            {filteredQuestionnaires.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">
                    {user.role === 'admin' 
                      ? 'No tests created yet. Click "Generate Test" to create your first test.'
                      : 'No tests available at the moment.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredQuestionnaires.map((questionnaire) => (
                <QuestionnaireDisplay
                  key={questionnaire.id}
                  questionnaire={questionnaire}
                  isAdmin={user.role === 'admin'}
                  onUpdate={handleQuestionnaireUpdate}
                  onDelete={handleQuestionnaireDelete}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'courses' && user.role === 'admin' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Generated Courses</h2>
            
            {courses.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">
                    No courses generated yet. Create a test with course option enabled.
                  </p>
                </CardContent>
              </Card>
            ) : (
              courses.map((course) => (
                <Card key={course.id} className="bg-white/90 backdrop-blur-sm">
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
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>📖 {course.materials?.length || 0} sections</span>
                      <span>⏱️ ~{course.estimatedTime || 0} minutes</span>
                      <span>📅 {new Date(course.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'analytics' && user.role === 'admin' && <AdminAnalytics />}
        {activeTab === 'responses' && user.role === 'admin' && <ResponseManagement />}
        {activeTab === 'leaderboard' && <Leaderboard />}
      </div>

      <GenerateTestDialog
        isOpen={isGenerateDialogOpen}
        onClose={() => setIsGenerateDialogOpen(false)}
        onGenerate={handleGenerateTest}
        isGenerating={isGenerating}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
