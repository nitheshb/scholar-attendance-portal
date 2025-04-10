
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  Timestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { LogOut, MoreVertical, UserCheck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

type Student = {
  id: string;
  name: string;
  email: string;
  enrollmentId: string;
};

type AttendanceRecord = {
  id?: string;
  studentId: string;
  date: Date;
  status: 'present' | 'absent' | 'late';
  createdBy: string;
};

const TeacherDashboard = () => {
  const { currentUser, logout, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Redirect if not logged in or not a teacher
  useEffect(() => {
    if (!currentUser || userRole !== 'teacher') {
      navigate('/');
    }
  }, [currentUser, userRole, navigate]);

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
            name: data.name,
            email: data.email,
            enrollmentId: data.enrollmentId || 'N/A'
          });
        });
        
        setStudents(studentsList);
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

  // Fetch attendance data for selected date
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!currentUser || !selectedDate) return;
      
      try {
        // Start and end of selected date
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        
        const attendanceRef = collection(db, 'attendance');
        const q = query(
          attendanceRef,
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
        
        const querySnapshot = await getDocs(q);
        const records: AttendanceRecord[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          records.push({
            id: doc.id,
            studentId: data.studentId,
            date: data.date.toDate(),
            status: data.status,
            createdBy: data.createdBy
          });
        });
        
        setAttendanceData(records);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        toast({
          title: "Error",
          description: "Failed to load attendance data",
          variant: "destructive"
        });
      }
    };
    
    fetchAttendance();
  }, [currentUser, selectedDate, toast]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get attendance status for a specific student
  const getAttendanceStatus = (studentId: string) => {
    const record = attendanceData.find(record => record.studentId === studentId);
    return record ? record.status : null;
  };

  // Mark attendance for a student
  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!currentUser || !selectedDate) {
      console.log("Missing user or date:", { currentUser, selectedDate });
      toast({
        title: "Error",
        description: "User not logged in or no date selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log("Marking attendance:", { studentId, status, date: selectedDate });
      const record = attendanceData.find(record => record.studentId === studentId);
      
      // If record exists, update it
      if (record && record.id) {
        const attendanceRef = doc(db, 'attendance', record.id);
        await updateDoc(attendanceRef, {
          status,
          updatedAt: Timestamp.now()
        });
        
        // Update local state
        setAttendanceData(prev => 
          prev.map(item => 
            item.studentId === studentId ? { ...item, status } : item
          )
        );
      } 
      // If no record exists, create a new one
      else {
        const newRecord = {
          studentId,
          date: Timestamp.fromDate(selectedDate),
          status,
          createdBy: currentUser.uid,
          createdAt: Timestamp.now()
        };
        
        const docRef = await addDoc(collection(db, 'attendance'), newRecord);
        
        // Update local state
        setAttendanceData(prev => [
          ...prev, 
          { 
            id: docRef.id, 
            studentId, 
            date: selectedDate, 
            status,
            createdBy: currentUser.uid
          }
        ]);
      }
      
      toast({
        title: "Success",
        description: `Marked ${status} for student`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive"
      });
    }
  };

  // Format date to display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand-900">Teacher Dashboard</h1>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Teacher Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Teacher Profile</CardTitle>
              <CardDescription>Your information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-semibold mb-4">
                  {currentUser?.email?.[0].toUpperCase() || 'T'}
                </div>
                <h3 className="text-lg font-medium">
                  {currentUser?.email?.split('@')[0] || 'Teacher'}
                </h3>
                <p className="text-sm text-gray-500">{currentUser?.email || 'teacher@example.com'}</p>
                
                <div className="w-full mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Department</span>
                    <span className="text-sm">Computer Science</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Teacher ID</span>
                    <span className="text-sm">{currentUser?.uid.substring(0, 8) || 'TCH12345'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Management</CardTitle>
                <CardDescription>Select a date to view and mark student attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium mb-2">Select Date</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium mb-2">Current Selection</h3>
                    <div className="bg-brand-50 p-4 rounded-lg">
                      <p className="text-lg font-medium text-brand-900">
                        {selectedDate ? formatDate(selectedDate) : 'No date selected'}
                      </p>
                      <p className="text-sm text-brand-600 mt-1">
                        {students.length} students in this class
                      </p>
                      
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="bg-white rounded p-2 text-center">
                          <p className="text-green-600 text-lg font-medium">
                            {attendanceData.filter(record => record.status === 'present').length}
                          </p>
                          <p className="text-xs text-gray-500">Present</p>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <p className="text-yellow-600 text-lg font-medium">
                            {attendanceData.filter(record => record.status === 'late').length}
                          </p>
                          <p className="text-xs text-gray-500">Late</p>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <p className="text-red-600 text-lg font-medium">
                            {attendanceData.filter(record => record.status === 'absent').length}
                          </p>
                          <p className="text-xs text-gray-500">Absent</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Students Attendance List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Students Attendance
                    </CardTitle>
                    <CardDescription>
                      {selectedDate ? formatDate(selectedDate) : 'Select a date to mark attendance'}
                    </CardDescription>
                  </div>
                </div>
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
                          <TableHead>Student Name</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => {
                          const status = getAttendanceStatus(student.id);
                          return (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.name || student.email.split('@')[0]}</TableCell>
                              <TableCell>{student.enrollmentId}</TableCell>
                              <TableCell>
                                {status === 'present' && (
                                  <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                                    <CheckCircle className="h-3 w-3" />
                                    Present
                                  </span>
                                )}
                                {status === 'absent' && (
                                  <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
                                    <XCircle className="h-3 w-3" />
                                    Absent
                                  </span>
                                )}
                                {status === 'late' && (
                                  <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs">
                                    <Clock className="h-3 w-3" />
                                    Late
                                  </span>
                                )}
                                {status === null && (
                                  <span className="text-gray-400 text-xs">Not marked</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-green-600 cursor-pointer"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        markAttendance(student.id, 'present');
                                      }}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      <span>Mark Present</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-yellow-600 cursor-pointer"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        markAttendance(student.id, 'late');
                                      }}
                                    >
                                      <Clock className="mr-2 h-4 w-4" />
                                      <span>Mark Late</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 cursor-pointer"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        markAttendance(student.id, 'absent');
                                      }}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      <span>Mark Absent</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
