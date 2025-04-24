import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Users, UserCheck, School, BarChart, ChevronRight, UserPlus, BookOpen, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import AddStudentForm from '../components/AddStudentForm';
import AddTeacherForm from '../components/AddTeacherForm';
import { deleteDoc, doc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { AddHodForm } from '../components/AddHodForm';
import { EditUserForm } from '../components/EditUserForm';

type Teacher = {
  id: string;
  name: string;
  email: string;
  department: string;
  employeeId: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  enrollmentId: string;
  course: string;
};

type AttendanceSummary = {
  studentId: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalDays: number;
  attendancePercentage: number;
};

const HodDashboard = () => {
  const { currentUser, logout, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<Record<string, AttendanceSummary>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<{
    id: string;
    data: any;
    type: 'teacher' | 'student' | 'hod';
  } | null>(null);

  // Redirect if not logged in or not an HOD
  useEffect(() => {
    if (!currentUser || userRole !== 'hod') {
      navigate('/');
    }
  }, [currentUser, userRole, navigate]);

  // Fetch teachers data
  useEffect(() => {
    const fetchTeachers = async () => {
      if (!currentUser) return;
      
      try {
        const teachersRef = collection(db, 'users');
        const q = query(
          teachersRef,
          where('role', '==', 'teacher'),
          orderBy('name')
        );
        
        const querySnapshot = await getDocs(q);
        const teachersList: Teacher[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          teachersList.push({
            id: doc.id,
            name: data.name || data.email.split('@')[0],
            email: data.email,
            department: data.department || 'N/A',
            employeeId: data.employeeId || 'N/A'
          });
        });
        
        setTeachers(teachersList);
      } catch (error) {
        console.error('Error fetching teachers data:', error);
        toast({
          title: "Error",
          description: "Failed to load teachers data",
          variant: "destructive"
        });
      }
    };
    
    fetchTeachers();
  }, [currentUser, toast]);

  // Fetch students data
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const studentsRef = collection(db, 'users');
        const q = query(
          studentsRef,
          where('role', '==', 'student'),
          orderBy('name')
        );
        
        const querySnapshot = await getDocs(q);
        const studentsList: Student[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          studentsList.push({
            id: doc.id,
            name: data.name || data.email.split('@')[0],
            email: data.email,
            enrollmentId: data.enrollmentId || 'N/A',
            course: data.course || 'N/A'
          });
        });
        
        setStudents(studentsList);
        
        // Fetch attendance summaries
        await fetchAttendanceSummaries(studentsList);
      } catch (error) {
        console.error('Error fetching students data:', error);
        toast({
          title: "Error",
          description: "Failed to load students data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, [currentUser, toast]);

  // Fetch attendance summaries for all students
  const fetchAttendanceSummaries = async (studentsList: Student[]) => {
    if (!currentUser || !studentsList.length) return;
    
    try {
      const summaries: Record<string, AttendanceSummary> = {};
      
      // Create a promise for each student
      const promises = studentsList.map(async (student) => {
        const attendanceRef = collection(db, 'attendance');
        const q = query(
          attendanceRef,
          where('studentId', '==', student.id)
        );
        
        const querySnapshot = await getDocs(q);
        
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'present') presentDays++;
          else if (data.status === 'absent') absentDays++;
          else if (data.status === 'late') lateDays++;
        });
        
        const totalDays = presentDays + absentDays + lateDays;
        const attendancePercentage = totalDays > 0 
          ? Math.round(((presentDays + (lateDays * 0.5)) / totalDays) * 100) 
          : 0;
        
        summaries[student.id] = {
          studentId: student.id,
          presentDays,
          absentDays,
          lateDays,
          totalDays,
          attendancePercentage
        };
      });
      
      await Promise.all(promises);
      setAttendanceSummaries(summaries);
    } catch (error) {
      console.error('Error fetching attendance summaries:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get attendance status label and color
  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 90) return { label: 'Excellent', color: 'text-green-600 bg-green-50' };
    if (percentage >= 75) return { label: 'Good', color: 'text-blue-600 bg-blue-50' };
    if (percentage >= 60) return { label: 'Average', color: 'text-yellow-600 bg-yellow-50' };
    return { label: 'Poor', color: 'text-red-600 bg-red-50' };
  };

  const handleDeleteUser = async (userId: string, userEmail: string, userType: 'teacher' | 'student') => {
    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      toast({
        title: "Success",
        description: `${userType === 'teacher' ? 'Teacher' : 'Student'} deleted successfully`,
      });
      
      // Update local state to remove the deleted user
      if (userType === 'teacher') {
        setTeachers(prev => prev.filter(teacher => teacher.id !== userId));
      } else {
        setStudents(prev => prev.filter(student => student.id !== userId));
      }
    } catch (error: any) {
      console.error(`Error deleting ${userType}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${userType}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand-900">Head of Department Dashboard</h1>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid gap-6 mb-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-brand-50 border-brand-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-brand-900">Total Teachers</h3>
                <div className="bg-white p-2 rounded-full">
                  <Users className="h-5 w-5 text-brand-700" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-brand-800">{teachers.length}</p>
                <p className="text-xs text-brand-600">Active Faculty Members</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-green-900">Total Students</h3>
                <div className="bg-white p-2 rounded-full">
                  <UserCheck className="h-5 w-5 text-green-700" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-green-800">{students.length}</p>
                <p className="text-xs text-green-600">Enrolled Students</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-purple-900">Department</h3>
                <div className="bg-white p-2 rounded-full">
                  <School className="h-5 w-5 text-purple-700" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl font-bold text-purple-800">Computer Science</p>
                <p className="text-xs text-purple-600">Current Department</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-blue-900">Avg. Attendance</h3>
                <div className="bg-white p-2 rounded-full">
                  <BarChart className="h-5 w-5 text-blue-700" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                {Object.values(attendanceSummaries).length > 0 ? (
                  <p className="text-3xl font-bold text-blue-800">
                    {Math.round(
                      Object.values(attendanceSummaries).reduce(
                        (acc, curr) => acc + curr.attendancePercentage, 
                        0
                      ) / Object.values(attendanceSummaries).length
                    )}%
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-blue-800">-</p>
                )}
                <p className="text-xs text-blue-600">Department Average</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Tabs defaultValue="students">
            <TabsList className="mb-4">
              <TabsTrigger value="teachers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Teachers
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Students
              </TabsTrigger>
              <TabsTrigger value="management" className="flex items-center gap-2">
                <School className="h-4 w-4" />
                Management
              </TabsTrigger>
              <TabsTrigger value="add-hod" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add HOD
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="teachers">
              <Card>
                <CardHeader>
                  <CardTitle>Teacher Management</CardTitle>
                  <CardDescription>View all teachers and their details</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-800"></div>
                    </div>
                  ) : teachers.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teachers.map((teacher) => (
                            <TableRow key={teacher.id}>
                              <TableCell className="font-medium">{teacher.name}</TableCell>
                              <TableCell>{teacher.email}</TableCell>
                              <TableCell>{teacher.employeeId}</TableCell>
                              <TableCell>{teacher.department}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    className="flex items-center gap-1 text-brand-600 hover:text-brand-800"
                                    onClick={() => setSelectedUserForEdit({
                                      id: teacher.id,
                                      data: teacher,
                                      type: 'teacher'
                                    })}
                                  >
                                    Edit
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this teacher? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-red-600 hover:bg-red-700"
                                          onClick={() => handleDeleteUser(teacher.id, teacher.email, 'teacher')}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-gray-500">No teachers found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Student Attendance Overview</CardTitle>
                  <CardDescription>View all students and their attendance details</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-800"></div>
                    </div>
                  ) : students.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Attendance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map((student) => {
                            const summary = attendanceSummaries[student.id] || {
                              presentDays: 0,
                              absentDays: 0,
                              lateDays: 0,
                              totalDays: 0,
                              attendancePercentage: 0
                            };
                            
                            const status = getAttendanceStatus(summary.attendancePercentage);
                            
                            return (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>{student.enrollmentId}</TableCell>
                                <TableCell>{student.course}</TableCell>
                                <TableCell>
                                  {summary.totalDays > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-brand-600 h-2 rounded-full" 
                                          style={{ width: `${summary.attendancePercentage}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm">{summary.attendancePercentage}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">No data</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {summary.totalDays > 0 ? (
                                    <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                                      {status.label}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      className="flex items-center gap-1 text-brand-600 hover:text-brand-800"
                                      onClick={() => setSelectedUserForEdit({
                                        id: student.id,
                                        data: student,
                                        type: 'student'
                                      })}
                                    >
                                      Edit
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this student? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700"
                                            onClick={() => handleDeleteUser(student.id, student.email, 'student')}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-gray-500">No students found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="management">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-brand-600" />
                      Student Registration
                    </CardTitle>
                    <CardDescription>Add a new student to the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddStudentForm />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-brand-600" />
                      Teacher Registration
                    </CardTitle>
                    <CardDescription>Add a new teacher to the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AddTeacherForm />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Add HOD Tab */}
            <TabsContent value="add-hod">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-brand-600" />
                    HOD Registration
                  </CardTitle>
                  <CardDescription>Add a new Head of Department to the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <AddHodForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {selectedUserForEdit && (
        <EditUserForm
          userId={selectedUserForEdit.id}
          initialData={selectedUserForEdit.data}
          userType={selectedUserForEdit.type}
          open={!!selectedUserForEdit}
          onClose={() => setSelectedUserForEdit(null)}
        />
      )}
    </div>
  );
};

export default HodDashboard;
