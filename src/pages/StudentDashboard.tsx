
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { LogOut, Calendar as CalendarIcon } from 'lucide-react';

type AttendanceRecord = {
  date: Date;
  status: 'present' | 'absent' | 'late';
};

const StudentDashboard = () => {
  const { currentUser, logout, userRole } = useAuth();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  
  // Redirect if not logged in or not a student
  useEffect(() => {
    if (!currentUser || userRole !== 'student') {
      navigate('/');
    }
  }, [currentUser, userRole, navigate]);

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Start and end of selected month
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        
        const attendanceRef = collection(db, 'attendance');
        const q = query(
          attendanceRef,
          where('studentId', '==', currentUser.uid),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
        
        const querySnapshot = await getDocs(q);
        const records: AttendanceRecord[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          records.push({
            date: data.date.toDate(),
            status: data.status
          });
        });
        
        setAttendanceData(records);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendance();
  }, [currentUser, selectedMonth, selectedYear]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Generate month options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Generate year options (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  // Function to get day CSS class based on attendance
  const getDayClass = (date: Date): string => {
    const record = attendanceData.find(record => 
      record.date.getDate() === date.getDate() &&
      record.date.getMonth() === date.getMonth() &&
      record.date.getFullYear() === date.getFullYear()
    );
    
    if (!record) return '';
    
    switch (record.status) {
      case 'present':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand-900">Student Attendance Portal</h1>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Info Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="h-24 w-24 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-semibold">
                    {currentUser?.email?.[0].toUpperCase() || 'S'}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium">{currentUser?.email?.split('@')[0] || 'Student'}</p>
                  <p className="text-sm text-gray-500">{currentUser?.email || 'student@example.com'}</p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500">ID Number</p>
                  <p>{currentUser?.uid.substring(0, 8) || 'STD12345'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Attendance Calendar */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Monthly Attendance
              </CardTitle>
              <CardDescription>View your attendance for the selected month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="w-full md:w-40">
                  <label className="text-sm font-medium text-gray-500 mb-1 block">Month</label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={month} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-40">
                  <label className="text-sm font-medium text-gray-500 mb-1 block">Year</label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center h-72">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-800"></div>
                </div>
              ) : (
                <>
                  <Calendar
                    mode="single"
                    month={new Date(selectedYear, selectedMonth)}
                    className="rounded-md border"
                    modifiers={{
                      booked: attendanceData.map(record => record.date),
                    }}
                    modifiersStyles={{
                      booked: { 
                        backgroundColor: 'var(--brand-50)',
                        color: 'var(--brand-900)'
                      },
                    }}
                    onDayClick={(date) => {
                      // Just for visual feedback, no actual action
                      console.log('Clicked date:', date);
                    }}
                  />
                  
                  <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-green-100"></div>
                      <span className="text-sm text-gray-600">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-yellow-100"></div>
                      <span className="text-sm text-gray-600">Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-100"></div>
                      <span className="text-sm text-gray-600">Absent</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Attendance Summary Card */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
              <CardDescription>Your attendance statistics for {months[selectedMonth]} {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-green-600 font-medium">Present Days</p>
                    <p className="text-3xl font-bold text-green-800">
                      {attendanceData.filter(record => record.status === 'present').length}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <CalendarIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 font-medium">Late Arrivals</p>
                    <p className="text-3xl font-bold text-yellow-800">
                      {attendanceData.filter(record => record.status === 'late').length}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <CalendarIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-red-600 font-medium">Absent Days</p>
                    <p className="text-3xl font-bold text-red-800">
                      {attendanceData.filter(record => record.status === 'absent').length}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <CalendarIcon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
