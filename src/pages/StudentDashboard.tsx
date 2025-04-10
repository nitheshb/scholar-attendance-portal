
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
import { Progress } from '../components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { format } from 'date-fns';
import { LogOut, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip 
} from 'recharts';

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
  const [greeting, setGreeting] = useState<string>('');
  
  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);
  
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

  // Calculate attendance stats for selected month
  const presentDays = attendanceData.filter(record => record.status === 'present').length;
  const lateDays = attendanceData.filter(record => record.status === 'late').length;
  const absentDays = attendanceData.filter(record => record.status === 'absent').length;
  const totalDays = presentDays + lateDays + absentDays;
  
  // Calculate attendance percentage for progress bar
  const attendancePercentage = totalDays > 0 
    ? Math.round(((presentDays + lateDays) / totalDays) * 100) 
    : 0;
    
  // Prepare data for charts
  const pieChartData = [
    { name: 'Present', value: presentDays, color: '#22c55e' },
    { name: 'Late', value: lateDays, color: '#eab308' },
    { name: 'Absent', value: absentDays, color: '#ef4444' }
  ].filter(item => item.value > 0);
  
  // Generate bar chart data - days of week analysis
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayWiseData = daysOfWeek.map(day => {
    const dayIndex = daysOfWeek.indexOf(day);
    const dayRecords = attendanceData.filter(record => record.date.getDay() === dayIndex);
    
    return {
      name: day.substring(0, 3),
      present: dayRecords.filter(record => record.status === 'present').length,
      absent: dayRecords.filter(record => record.status === 'absent').length,
      late: dayRecords.filter(record => record.status === 'late').length
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-900">Student Attendance Portal</h1>
            <p className="text-sm text-gray-500">{greeting}, {currentUser?.email?.split('@')[0] || 'Student'}</p>
          </div>
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
                    className="rounded-md border pointer-events-auto"
                    modifiers={{
                      present: attendanceData.filter(record => record.status === 'present').map(record => record.date),
                      absent: attendanceData.filter(record => record.status === 'absent').map(record => record.date),
                      late: attendanceData.filter(record => record.status === 'late').map(record => record.date),
                    }}
                    modifiersStyles={{
                      present: { fontWeight: 'bold' },
                      absent: { fontWeight: 'bold' },
                      late: { fontWeight: 'bold' },
                    }}
                    components={{
                      DayContent: ({ date, displayMonth }) => {
                        // Only customize days in the current display month
                        if (date.getMonth() !== displayMonth.getMonth()) {
                          return <span>{date.getDate()}</span>;
                        }
                        
                        const record = attendanceData.find(
                          r => 
                            r.date.getDate() === date.getDate() && 
                            r.date.getMonth() === date.getMonth() && 
                            r.date.getFullYear() === date.getFullYear()
                        );
                        
                        if (!record) return <span>{date.getDate()}</span>;
                        
                        let dotColor;
                        switch (record.status) {
                          case 'present': dotColor = 'bg-green-500'; break;
                          case 'absent': dotColor = 'bg-red-500'; break;
                          case 'late': dotColor = 'bg-yellow-500'; break;
                          default: dotColor = ''; break;
                        }
                        
                        return (
                          <div className="relative h-full w-full flex items-center justify-center">
                            <span>{date.getDate()}</span>
                            <div className={`absolute -bottom-1 h-2 w-2 rounded-full ${dotColor}`}></div>
                          </div>
                        );
                      }
                    }}
                    onDayClick={(date) => {
                      // Just for visual feedback, no actual action
                      const record = attendanceData.find(
                        r => 
                          r.date.getDate() === date.getDate() && 
                          r.date.getMonth() === date.getMonth() && 
                          r.date.getFullYear() === date.getFullYear()
                      );
                      
                      if (record) {
                        console.log(`${format(date, 'MMM dd, yyyy')}: ${record.status}`);
                      }
                    }}
                  />
                  
                  <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-600">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-gray-600">Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-500"></div>
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
            <CardContent className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-green-600 font-medium">Present Days</p>
                    <p className="text-3xl font-bold text-green-800">{presentDays}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 font-medium">Late Arrivals</p>
                    <p className="text-3xl font-bold text-yellow-800">{lateDays}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-red-600 font-medium">Absent Days</p>
                    <p className="text-3xl font-bold text-red-800">{absentDays}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
              
              {/* Attendance Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">Overall Attendance</h3>
                  <span className="text-sm font-medium">{attendancePercentage}%</span>
                </div>
                <Progress 
                  value={attendancePercentage} 
                  className={`h-2 ${
                    attendancePercentage >= 75 
                      ? 'bg-green-100' 
                      : attendancePercentage >= 50 
                        ? 'bg-yellow-100' 
                        : 'bg-red-100'
                  }`}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Poor (&lt;50%)</span>
                  <span>Good (75%+)</span>
                </div>
              </div>
              
              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                {/* Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Attendance Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-64">
                      {pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              label
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          No attendance data for this month
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Bar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Day-wise Attendance</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-64">
                      {totalDays > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dayWiseData}>
                            <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" />
                            <Bar dataKey="late" stackId="a" fill="#eab308" name="Late" />
                            <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
                            <Tooltip />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          No attendance data for this month
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
