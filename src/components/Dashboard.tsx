import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus } from 'lucide-react';
import { CourseService } from '@/services/CourseService';
import { QuestionnaireService } from '@/services/QuestionnaireService';
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from '@/hooks/useAuth';
import { getUserInfo } from '@/utils';
import { Questionnaire } from '@/services/questionnaire/QuestionnaireTypes';

const Dashboard = () => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast()

  useEffect(() => {
    loadQuestionnaires();
    loadCourses();
  }, []);

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      const allQuestionnaires = await QuestionnaireService.getAllQuestionnaires();
      setQuestionnaires(allQuestionnaires);
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem loading questionnaires.",
      })
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const courses = await CourseService.getAllCourses();
      setCourses(courses);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem loading courses.",
      })
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTest = async (questionnaire: Questionnaire) => {
    try {
      console.log('🎯 Taking test:', questionnaire.id);
      
      // For tests with multiple sets (A/B testing), assign guest users to specific sets
      if (questionnaire.totalSets && questionnaire.totalSets > 1) {
        const { userId, username } = await getUserInfo();
        
        if (userId === 'anonymous') {
          // For guest users, we'll use a simple round-robin assignment
          // This is a simplified version since we removed the complex guest assignment service
          const guestAssignments = JSON.parse(localStorage.getItem('guestAssignments') || '[]');
          const existingAssignment = guestAssignments.find((a: any) => 
            a.guestName === username && a.testId === questionnaire.id
          );
          
          let setNumber = 1;
          if (existingAssignment) {
            setNumber = existingAssignment.setNumber;
          } else {
            // Simple round-robin assignment
            const testAssignments = guestAssignments.filter((a: any) => a.testId === questionnaire.id);
            setNumber = (testAssignments.length % questionnaire.totalSets) + 1;
            
            // Store the assignment
            guestAssignments.push({
              guestName: username,
              testId: questionnaire.id,
              setNumber,
              assignedAt: new Date().toISOString()
            });
            localStorage.setItem('guestAssignments', JSON.stringify(guestAssignments));
          }
          
          console.log(`👤 Guest ${username} assigned to set ${setNumber} for test ${questionnaire.id}`);
          
          // Navigate to the specific set
          const setId = `${questionnaire.id}-set${setNumber}`;
          navigate(`/questionnaire/${setId}`);
          return;
        }
      }
      
      // For single-set tests or authenticated users, use the original questionnaire ID
      navigate(`/questionnaire/${questionnaire.id}`);
    } catch (error) {
      console.error('Error taking test:', error);
      navigate(`/questionnaire/${questionnaire.id}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={user?.user_metadata?.username || "Avatar"} />
                  <AvatarFallback>{user?.user_metadata?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mr-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link to="/profile" className="w-full h-full block">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/billing" className="w-full h-full block">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link to="/settings" className="w-full h-full block">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Questionnaires Section */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Tests</CardTitle>
            <Link to="/questionnaire/create">
              <Button variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : questionnaires.length > 0 ? (
                questionnaires.map((questionnaire) => (
                  <Card key={questionnaire.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="text-white">{questionnaire.title}</div>
                      <Button variant="outline" size="sm" onClick={() => handleTakeTest(questionnaire)}>
                        Take Test
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-gray-400">No tests available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Courses Section */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Courses</CardTitle>
            <Link to="/course/create">
              <Button variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : courses.length > 0 ? (
                courses.map((course) => (
                  <Card key={course.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="text-white">{course.title}</div>
                      <Button variant="outline" size="sm">
                        View Course
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-gray-400">No courses available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for Analytics or other widgets */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Analytics</CardTitle>
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-gray-400">
              <p>Coming Soon: Track your progress and performance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
