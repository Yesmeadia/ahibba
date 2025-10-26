import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, addDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../config/firebase";
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import Swal from 'sweetalert2';
import { 
  FiLogOut, 
  FiUsers, 
  FiCalendar, 
  FiCheckSquare, 
  FiSearch, 
  FiFilter,
  FiDownload,
  FiFileText,
  FiBarChart2,
  FiPieChart,
  FiMapPin,
  FiUserCheck,
  FiFile,
  FiFilePlus,
  FiTrendingUp,
  FiPrinter,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiClock,
  FiWatch,
  FiAlertTriangle,
  FiMessageSquare,
  FiUserPlus,
  FiHome,
  FiUser,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiMinus,
  FiStar,
  FiThumbsUp,
  FiMessageCircle
} from "react-icons/fi";
import { 
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineChartBar,
  HiOutlineChartPie
} from "react-icons/hi";

const ZONES = [
  "Poonch",
  "Mandi",
  "Mendher",
  "Surankote",
  "Rajouri",
  "Jammu",
  "Srinagar",
  "North East",
  "South",
  "Rajasthan",
  "Maharashta",
  "PR Department",
  "Academia Department",
  "Directorate",
  "UAE",
  "Not Applicable"
];

// Session Schedule configurations with start and end times
const day1Schedule = {
  morning: { 
    start: "09:30", 
    end: "11:10", 
    display: "Morning 10:00 AM",
    date: "2025-10-25"
  },
  afternoon: { 
    start: "14:30", 
    end: "13:17", 
    display: "Afternoon 2:50 PM",
    date: "2025-10-25"
  },
  evening: { 
    start: "18:15", 
    end: "18:50", 
    display: "Evening 6:20 PM",
    date: "2025-10-25"
  }
};

const day2Schedule = {
  morning: { 
    start: "08:15", 
    end: "08:45", 
    display: "Morning 8:30 AM",
    date: "2025-10-26"
  },
  afternoon: { 
    start: "14:15", 
    end: "16:45", 
    display: "Afternoon 2:30 PM",
    date: "2025-10-26"
  },
  evening: { 
    start: "18:30", 
    end: "21:00", 
    display: "Evening 7:00 PM",
    date: "2025-10-26"
  }
};

// Helper function to calculate late minutes from session END time
const calculateLateMinutesFromEnd = (sessionEndTime, manualEntryTime) => {
  if (!sessionEndTime || !manualEntryTime) return 0;
  
  const [endHour, endMinute] = sessionEndTime.split(':').map(Number);
  const [entryHour, entryMinute] = manualEntryTime.split(':').map(Number);
  
  const sessionEndTotalMinutes = endHour * 60 + endMinute;
  const manualEntryTotalMinutes = entryHour * 60 + entryMinute;
  
  return Math.max(0, manualEntryTotalMinutes - sessionEndTotalMinutes);
};

// Helper function to check if session has ended
const isSessionEnded = (session) => {
  if (!session) return false;
  
  const now = new Date();
  const sessionDate = new Date(session.date);
  const [endHour, endMinute] = session.end.split(':').map(Number);
  
  const sessionEndTime = new Date(sessionDate);
  sessionEndTime.setHours(endHour, endMinute, 0, 0);
  
  return now > sessionEndTime;
};

// Helper function to get current time in HH:MM format
const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Helper function to format Firebase timestamp
const formatFirebaseTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (typeof timestamp === 'string') {
      return timestamp;
    } else if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return "Invalid Date";
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "N/A";
  }
};

// Helper function to get schedule display
const getScheduleDisplay = (dayNum, scheduleType) => {
  const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
  return schedule[scheduleType]?.display || scheduleType || "Not Marked";
};

// Helper function to get schedule time
const getScheduleTime = (dayNum, scheduleType) => {
  const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
  return schedule[scheduleType]?.time || "";
};

// Helper function to get date only for sorting/grouping
const getDateOnly = (timestamp) => {
  if (!timestamp) return new Date(0);
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date(0);
  } catch (error) {
    console.error("Error parsing timestamp:", error);
    return new Date(0);
  }
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg ${
          currentPage === 1
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
        }`}
      >
        <FiChevronLeft className="text-lg" />
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
          >
            1
          </button>
          {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-lg font-medium ${
            currentPage === page
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
        >
          {page}
        </button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-lg bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg ${
          currentPage === totalPages
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
        }`}
      >
        <FiChevronRight className="text-lg" />
      </button>
    </div>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPageUsers, setCurrentPageUsers] = useState([]);
  const [feedbackData, setFeedbackData] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [currentPageFeedback, setCurrentPageFeedback] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [reportFilter, setReportFilter] = useState("all");
  const [reportZoneFilter, setReportZoneFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState({ day1: "", day2: "" });
  const [manualAttendanceData, setManualAttendanceData] = useState({});
  const [selectedUserForManual, setSelectedUserForManual] = useState(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [feedbackPerPage] = useState(10);
  const [zones, setZones] = useState([...ZONES]);
  const [newZone, setNewZone] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    mobile: "",
    designation: "",
    zone: ""
  });
  const [manualAttendanceSearch, setManualAttendanceSearch] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  useEffect(() => {
    const unsubscribeRegistration = onSnapshot(collection(db, "registration"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Sort users by registration date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = getDateOnly(a.registeredAt || a.timestamp);
        const dateB = getDateOnly(b.registeredAt || b.timestamp);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setRegisteredUsers(sortedData);
      filterUsers(sortedData, searchQuery, zoneFilter, attendanceFilter, scheduleFilter);
      setLoading(false);
    });

    const unsubscribeFeedback = onSnapshot(collection(db, "feedback"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Sort feedback by submission date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = getDateOnly(a.submittedAt);
        const dateB = getDateOnly(b.submittedAt);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setFeedbackData(sortedData);
      filterFeedbackData(sortedData, feedbackSearch, feedbackFilter);
    });

    return () => {
      unsubscribeRegistration();
      unsubscribeFeedback();
    };
  }, []);

  // Update current page users when filtered users change
  useEffect(() => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    setCurrentPageUsers(filteredUsers.slice(indexOfFirstUser, indexOfLastUser));
  }, [filteredUsers, currentPage, usersPerPage]);

  // Update current page feedback when filtered feedback changes
  useEffect(() => {
    const indexOfLastFeedback = feedbackPage * feedbackPerPage;
    const indexOfFirstFeedback = indexOfLastFeedback - feedbackPerPage;
    setCurrentPageFeedback(filteredFeedback.slice(indexOfFirstFeedback, indexOfLastFeedback));
  }, [filteredFeedback, feedbackPage, feedbackPerPage]);

  const filterUsers = (users, search, zone, attendance, schedule) => {
    let filtered = users;

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(lowerSearch) ||
          u.mobile?.includes(lowerSearch)
      );
    }

    if (zone) {
      filtered = filtered.filter((u) => u.zone === zone);
    }

    if (attendance === "day1") {
      filtered = filtered.filter((u) => u.day1Attendance);
    } else if (attendance === "day2") {
      filtered = filtered.filter((u) => u.day2Attendance);
    } else if (attendance === "both") {
      filtered = filtered.filter((u) => u.day1Attendance && u.day2Attendance);
    } else if (attendance === "none") {
      filtered = filtered.filter((u) => !u.day1Attendance && !u.day2Attendance);
    } else if (attendance === "manual") {
      filtered = filtered.filter((u) => u.day1ManualEntry || u.day2ManualEntry);
    } else if (attendance === "late") {
      filtered = filtered.filter((u) => u.day1LateMinutes > 0 || u.day2LateMinutes > 0);
    }

    // Apply schedule filters
    if (schedule.day1) {
      filtered = filtered.filter((u) => u.day1Schedule === schedule.day1);
    }
    if (schedule.day2) {
      filtered = filtered.filter((u) => u.day2Schedule === schedule.day2);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const filterFeedbackData = (feedback, search, filter) => {
    let filtered = feedback;

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name?.toLowerCase().includes(lowerSearch) ||
          f.feedback?.toLowerCase().includes(lowerSearch) ||
          f.designation?.toLowerCase().includes(lowerSearch) ||
          f.zone?.toLowerCase().includes(lowerSearch)
      );
    }

    if (filter === "pending") {
      filtered = filtered.filter((f) => f.status === "pending");
    } else if (filter === "reviewed") {
      filtered = filtered.filter((f) => f.status === "reviewed");
    } else if (filter === "high") {
      filtered = filtered.filter((f) => f.rating >= 4);
    } else if (filter === "low") {
      filtered = filtered.filter((f) => f.rating <= 2);
    }

    setFilteredFeedback(filtered);
    setFeedbackPage(1); // Reset to first page when filters change
  };

  // Filter users for manual attendance modal
  const getFilteredUsersForManualAttendance = () => {
    if (!manualAttendanceSearch.trim()) {
      return registeredUsers;
    }
    
    const searchTerm = manualAttendanceSearch.toLowerCase();
    return registeredUsers.filter(user =>
      user.name?.toLowerCase().includes(searchTerm) ||
      user.mobile?.includes(searchTerm) ||
      user.designation?.toLowerCase().includes(searchTerm) ||
      user.zone?.toLowerCase().includes(searchTerm)
    );
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterUsers(registeredUsers, query, zoneFilter, attendanceFilter, scheduleFilter);
  };

  const handleFeedbackSearchChange = (e) => {
    const query = e.target.value;
    setFeedbackSearch(query);
    filterFeedbackData(feedbackData, query, feedbackFilter);
  };

  const handleFeedbackFilterChange = (e) => {
    const filter = e.target.value;
    setFeedbackFilter(filter);
    filterFeedbackData(feedbackData, feedbackSearch, filter);
  };

  const handleZoneFilter = (e) => {
    const zone = e.target.value;
    setZoneFilter(zone);
    filterUsers(registeredUsers, searchQuery, zone, attendanceFilter, scheduleFilter);
  };

  const handleAttendanceFilter = (e) => {
    const attendance = e.target.value;
    setAttendanceFilter(attendance);
    filterUsers(registeredUsers, searchQuery, zoneFilter, attendance, scheduleFilter);
  };

  const handleScheduleFilter = (day, scheduleType) => {
    const newScheduleFilter = { ...scheduleFilter };
    newScheduleFilter[day] = scheduleType === "all" ? "" : scheduleType;
    setScheduleFilter(newScheduleFilter);
    filterUsers(registeredUsers, searchQuery, zoneFilter, attendanceFilter, newScheduleFilter);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFeedbackPageChange = (pageNumber) => {
    setFeedbackPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out from the admin dashboard.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      background: '#fff',
      color: '#333'
    });

    if (result.isConfirmed) {
      try {
        const auth = getAuth();
        await signOut(auth);
        
        Swal.fire({
          title: 'Logged out!',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });

        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        console.error("Logout error:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error logging out. Please try again.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.id);
    setEditFormData({ 
      name: user.name || "",
      mobile: user.mobile || "",
      designation: user.designation || "",
      zone: user.zone || "",
      day1Attendance: user.day1Attendance || false,
      day1Schedule: user.day1Schedule || "",
      day2Attendance: user.day2Attendance || false,
      day2Schedule: user.day2Schedule || "",
      day1LateMinutes: user.day1LateMinutes || 0,
      day1Remarks: user.day1Remarks || "",
      day2LateMinutes: user.day2LateMinutes || 0,
      day2Remarks: user.day2Remarks || "",
      day1ManualEntry: user.day1ManualEntry || false,
      day2ManualEntry: user.day2ManualEntry || false
    });
  };

  const handleEditChange = (field, value) => {
    setEditFormData({
      ...editFormData,
      [field]: value
    });
  };

  const handleToggleAttendance = (day) => {
    setEditFormData({
      ...editFormData,
      [day]: !editFormData[day],
      // Reset schedule when attendance is toggled off
      [`${day}Schedule`]: !editFormData[day] ? "" : editFormData[`${day}Schedule`]
    });
  };

  const handleScheduleChange = (day, schedule) => {
    setEditFormData({
      ...editFormData,
      [`${day}Schedule`]: schedule
    });
  };

  // Function to handle manual attendance marking with user selection
  const handleManualAttendanceClick = (session, day) => {
    if (!isSessionEnded(session)) {
      Swal.fire({
        title: 'Cannot Mark Attendance',
        text: `This session has not ended yet. You can only mark attendance after ${session.end}.`,
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
      return;
    }

    setCurrentSession({ ...session, day });
    setShowUserSelection(true);
    setManualAttendanceSearch(""); // Reset search when opening modal
  };

  // Function to mark manual attendance for selected user
  const markManualAttendanceForUser = async (user) => {
    if (!currentSession) return;

    const manualEntryTime = getCurrentTime();
    const lateMinutes = calculateLateMinutesFromEnd(currentSession.end, manualEntryTime);

    // Show confirmation modal
    const { value: remarks } = await Swal.fire({
      title: `Mark Manual Attendance for ${user.name}`,
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>Session:</strong> ${currentSession.display}</p>
          <p class="mb-2"><strong>Session Time:</strong> ${currentSession.start} - ${currentSession.end}</p>
          <p class="mb-2"><strong>Manual Entry Time:</strong> ${manualEntryTime}</p>
          <p class="mb-4 text-orange-600 font-semibold"><strong>Late by:</strong> ${lateMinutes} minutes</p>
          
          <label class="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional):</label>
          <textarea 
            id="remarks" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            rows="3" 
            placeholder="Enter any remarks..."
          ></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Mark Attendance',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        return document.getElementById('remarks').value;
      }
    });

    if (remarks !== undefined) {
      try {
        const userRef = doc(db, "registration", user.id);
        const dayField = currentSession.day;
        const scheduleType = Object.keys(day1Schedule).find(key => 
          day1Schedule[key].display === currentSession.display
        ) || Object.keys(day2Schedule).find(key => 
          day2Schedule[key].display === currentSession.display
        );

        const updateData = {
          [`${dayField}Attendance`]: true,
          [`${dayField}Schedule`]: scheduleType,
          [`${dayField}LateMinutes`]: lateMinutes,
          [`${dayField}Remarks`]: remarks,
          [`${dayField}ManualEntryTime`]: manualEntryTime,
          [`${dayField}ManualEntry`]: true,
          lastUpdated: new Date()
        };

        await updateDoc(userRef, updateData);

        Swal.fire({
          title: 'Success!',
          text: `Attendance marked successfully for ${user.name} in ${currentSession.display}. Late by ${lateMinutes} minutes.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });

        setShowUserSelection(false);
        setCurrentSession(null);
        setManualAttendanceSearch(""); // Reset search after marking attendance
      } catch (error) {
        console.error("Error marking manual attendance:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error marking attendance. Please try again.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.mobile || !editFormData.designation || !editFormData.zone) {
      Swal.fire({
        title: 'Error!',
        text: 'Please fill all required fields.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
      return;
    }

    try {
      const userRef = doc(db, "registration", editingUser);
      await updateDoc(userRef, {
        name: editFormData.name,
        mobile: editFormData.mobile,
        designation: editFormData.designation,
        zone: editFormData.zone,
        day1Attendance: editFormData.day1Attendance,
        day1Schedule: editFormData.day1Schedule,
        day2Attendance: editFormData.day2Attendance,
        day2Schedule: editFormData.day2Schedule,
        day1LateMinutes: editFormData.day1LateMinutes || 0,
        day1Remarks: editFormData.day1Remarks || "",
        day2LateMinutes: editFormData.day2LateMinutes || 0,
        day2Remarks: editFormData.day2Remarks || "",
        day1ManualEntry: editFormData.day1ManualEntry || false,
        day2ManualEntry: editFormData.day2ManualEntry || false,
        lastUpdated: new Date()
      });
      setEditingUser(null);
      setEditFormData({});
      Swal.fire({
        title: 'Success!',
        text: 'User data updated successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error updating user:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating user data. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    }
  };

  const handleDeleteClick = async (userId, userName) => {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `Are you sure you want to delete ${userName}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete!',
      cancelButtonText: 'Cancel',
      background: '#fff',
      color: '#333'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "registration", userId));
        Swal.fire({
          title: 'Deleted!',
          text: 'User has been deleted successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error deleting user. Please try again.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }
  };

  // Function to update feedback status
  const handleUpdateFeedbackStatus = async (feedbackId, status) => {
    try {
      const feedbackRef = doc(db, "feedback", feedbackId);
      await updateDoc(feedbackRef, {
        status: status,
        reviewedAt: new Date()
      });

      Swal.fire({
        title: 'Success!',
        text: `Feedback marked as ${status}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error updating feedback:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating feedback status. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    }
  };

  // Add new user function
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.mobile || !newUser.designation || !newUser.zone) {
      Swal.fire({
        title: 'Error!',
        text: 'Please fill all required fields.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
      return;
    }

    try {
      await addDoc(collection(db, "registration"), {
        ...newUser,
        registeredAt: new Date(),
        day1Attendance: false,
        day2Attendance: false,
        day1Schedule: "",
        day2Schedule: "",
        day1LateMinutes: 0,
        day2LateMinutes: 0,
        day1Remarks: "",
        day2Remarks: "",
        day1ManualEntry: false,
        day2ManualEntry: false
      });

      setNewUser({
        name: "",
        mobile: "",
        designation: "",
        zone: ""
      });

      Swal.fire({
        title: 'Success!',
        text: 'User registered successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error adding user:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Error registering user. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    }
  };

  // Zone management functions
  const handleAddZone = () => {
    if (newZone.trim() && !zones.includes(newZone.trim())) {
      setZones([...zones, newZone.trim()]);
      setNewZone("");
      Swal.fire({
        title: 'Success!',
        text: 'Zone added successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    }
  };

  const handleRemoveZone = (zoneToRemove) => {
    Swal.fire({
      title: 'Remove Zone?',
      text: `Are you sure you want to remove ${zoneToRemove}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove!',
      cancelButtonText: 'Cancel',
      background: '#fff',
      color: '#333'
    }).then((result) => {
      if (result.isConfirmed) {
        setZones(zones.filter(zone => zone !== zoneToRemove));
        Swal.fire({
          title: 'Removed!',
          text: 'Zone has been removed successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      }
    });
  };

  // Enhanced statistics with manual attendance breakdown and feedback stats
  const stats = {
    totalRegistered: registeredUsers.length,
    day1Attendance: registeredUsers.filter((u) => u.day1Attendance).length,
    day2Attendance: registeredUsers.filter((u) => u.day2Attendance).length,
    bothDays: registeredUsers.filter((u) => u.day1Attendance && u.day2Attendance).length,
    day1Schedules: {
      morning: registeredUsers.filter(u => u.day1Schedule === 'morning').length,
      afternoon: registeredUsers.filter(u => u.day1Schedule === 'afternoon').length,
      evening: registeredUsers.filter(u => u.day1Schedule === 'evening').length
    },
    day2Schedules: {
      morning: registeredUsers.filter(u => u.day2Schedule === 'morning').length,
      afternoon: registeredUsers.filter(u => u.day2Schedule === 'afternoon').length,
      evening: registeredUsers.filter(u => u.day2Schedule === 'evening').length
    },
    manualEntries: {
      day1: registeredUsers.filter(u => u.day1ManualEntry).length,
      day2: registeredUsers.filter(u => u.day2ManualEntry).length,
      total: registeredUsers.filter(u => u.day1ManualEntry || u.day2ManualEntry).length
    },
    lateEntries: {
      day1: registeredUsers.filter(u => u.day1LateMinutes > 0).length,
      day2: registeredUsers.filter(u => u.day2LateMinutes > 0).length,
      total: registeredUsers.filter(u => u.day1LateMinutes > 0 || u.day2LateMinutes > 0).length
    },
    feedback: {
      total: feedbackData.length,
      pending: feedbackData.filter(f => f.status === 'pending').length,
      reviewed: feedbackData.filter(f => f.status === 'reviewed').length,
      averageRating: feedbackData.length > 0 
        ? (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(1)
        : 0,
      highRating: feedbackData.filter(f => f.rating >= 4).length,
      lowRating: feedbackData.filter(f => f.rating <= 2).length
    }
  };

  const zoneStats = ZONES.map((zone) => {
    const usersInZone = registeredUsers.filter((u) => u.zone === zone);
    return {
      zone,
      registered: usersInZone.length,
      day1: usersInZone.filter((u) => u.day1Attendance).length,
      day2: usersInZone.filter((u) => u.day2Attendance).length,
      manualEntries: usersInZone.filter(u => u.day1ManualEntry || u.day2ManualEntry).length
    };
  });

  // Enhanced chart data with manual attendance breakdown and feedback
  const chartData = [
    { name: "Day 1", count: stats.day1Attendance },
    { name: "Day 2", count: stats.day2Attendance },
    { name: "Both Days", count: stats.bothDays },
    { name: "Manual Entries", count: stats.manualEntries.total },
    { name: "Late Entries", count: stats.lateEntries.total }
  ];

  const scheduleChartData = [
    { name: "Day 1 Morning", count: stats.day1Schedules.morning },
    { name: "Day 1 Afternoon", count: stats.day1Schedules.afternoon },
    { name: "Day 1 Evening", count: stats.day1Schedules.evening },
    { name: "Day 2 Morning", count: stats.day2Schedules.morning },
    { name: "Day 2 Afternoon", count: stats.day2Schedules.afternoon },
    { name: "Day 2 Evening", count: stats.day2Schedules.evening }
  ];

  const manualAttendanceChartData = [
    { name: "Day 1 Manual", count: stats.manualEntries.day1 },
    { name: "Day 2 Manual", count: stats.manualEntries.day2 },
    { name: "Day 1 Late", count: stats.lateEntries.day1 },
    { name: "Day 2 Late", count: stats.lateEntries.day2 }
  ];

  const feedbackChartData = [
    { name: "Total Feedback", count: stats.feedback.total },
    { name: "Pending Review", count: stats.feedback.pending },
    { name: "Reviewed", count: stats.feedback.reviewed },
    { name: "High Rating (4-5)", count: stats.feedback.highRating },
    { name: "Low Rating (1-2)", count: stats.feedback.lowRating }
  ];

  const ratingDistributionData = [
    { name: "1 Star", count: feedbackData.filter(f => f.rating === 1).length },
    { name: "2 Stars", count: feedbackData.filter(f => f.rating === 2).length },
    { name: "3 Stars", count: feedbackData.filter(f => f.rating === 3).length },
    { name: "4 Stars", count: feedbackData.filter(f => f.rating === 4).length },
    { name: "5 Stars", count: feedbackData.filter(f => f.rating === 5).length }
  ];

  const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#8B5CF6"];

  const showLoadingAlert = (title) => {
    Swal.fire({
      title: title,
      text: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      background: '#fff',
      color: '#333'
    });
  };

  const getFilteredDataForReport = () => {
    let data = registeredUsers;

    if (reportFilter === "day1") {
      data = data.filter(u => u.day1Attendance);
    } else if (reportFilter === "day2") {
      data = data.filter(u => u.day2Attendance);
    } else if (reportFilter === "both") {
      data = data.filter(u => u.day1Attendance && u.day2Attendance);
    } else if (reportFilter === "none") {
      data = data.filter(u => !u.day1Attendance && !u.day2Attendance);
    } else if (reportFilter === "manual") {
      data = data.filter(u => u.day1ManualEntry || u.day2ManualEntry);
    }

    if (reportZoneFilter) {
      data = data.filter(u => u.zone === reportZoneFilter);
    }

    return data;
  };

  const generatePDFReport = () => {
    showLoadingAlert('Generating PDF Report');
    
    setTimeout(() => {
      try {
        const reportData = getFilteredDataForReport();
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text("Ahibba Summit 2025 - Registration Details", 14, yPosition);
        yPosition += 12;

        // Filter info
        doc.setFontSize(10);
        let filterInfo = "Filters: ";
        if (reportZoneFilter) filterInfo += `Zone: ${reportZoneFilter}, `;
        if (reportFilter !== "all") filterInfo += `Attendance: ${reportFilter}`;
        if (filterInfo === "Filters: ") filterInfo = "Filters: All Users";
        
        doc.text(filterInfo, 14, yPosition);
        yPosition += 6;
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
        yPosition += 8;

        // Summary Statistics
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Summary", 14, yPosition);
        yPosition += 8;

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        doc.text(`Total Records: ${reportData.length}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Day 1 Attendance: ${reportData.filter(u => u.day1Attendance).length}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Day 2 Attendance: ${reportData.filter(u => u.day2Attendance).length}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Manual Entries: ${reportData.filter(u => u.day1ManualEntry || u.day2ManualEntry).length}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Late Entries: ${reportData.filter(u => u.day1LateMinutes > 0 || u.day2LateMinutes > 0).length}`, 14, yPosition);
        yPosition += 12;

        // Registration Details Table
        doc.setFont(undefined, "bold");
        doc.setFontSize(8);
        
        // Headers
        doc.rect(14, yPosition - 5, 182, 7, "S");
        doc.text("Name", 16, yPosition);
        doc.text("Mobile", 50, yPosition);
        doc.text("Designation", 75, yPosition);
        doc.text("Zone", 115, yPosition);
        doc.text("Day 1", 140, yPosition);
        doc.text("Day 2", 170, yPosition);
        yPosition += 10;

        // Data rows
        doc.setFont(undefined, "normal");
        doc.setFontSize(7);

        reportData.forEach((user) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          doc.text(user.name?.substring(0, 20) || "N/A", 16, yPosition);
          doc.text(user.mobile || "N/A", 50, yPosition);
          doc.text(user.designation?.substring(0, 15) || "N/A", 75, yPosition);
          doc.text(user.zone?.substring(0, 12) || "N/A", 115, yPosition);
          
          // Day 1 attendance with schedule and late info
          let day1Text = "Absent";
          if (user.day1Attendance) {
            day1Text = getScheduleDisplay("1", user.day1Schedule).substring(0, 8);
            if (user.day1ManualEntry) day1Text += " (M)";
            if (user.day1LateMinutes > 0) day1Text += ` L:${user.day1LateMinutes}m`;
          }
          doc.text(day1Text, 140, yPosition);
          
          // Day 2 attendance with schedule and late info
          let day2Text = "Absent";
          if (user.day2Attendance) {
            day2Text = getScheduleDisplay("2", user.day2Schedule).substring(0, 8);
            if (user.day2ManualEntry) day2Text += " (M)";
            if (user.day2LateMinutes > 0) day2Text += ` L:${user.day2LateMinutes}m`;
          }
          doc.text(day2Text, 170, yPosition);
          
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yPosition + 1, 196, yPosition + 1);
          yPosition += 7;
        });

        doc.save("Ahibba_Registration_Details.pdf");
        
        Swal.fire({
          title: 'Success!',
          text: 'PDF report downloaded successfully!',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error generating PDF:", error);
        Swal.fire({
          title: 'Error!',
          text: `Error generating PDF: ${error.message}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }, 1000);
  };

  // Generate Schedule-wise Report
  const generateScheduleReport = () => {
    showLoadingAlert('Generating Schedule Report');
    
    setTimeout(() => {
      try {
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text("Ahibba Summit 2025 - Schedule Attendance Report", 14, yPosition);
        yPosition += 12;

        // Summary Statistics
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Schedule Summary", 14, yPosition);
        yPosition += 8;

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        
        // Day 1 Schedule Summary
        doc.text("Day 1 - October 25, 2025:", 14, yPosition);
        yPosition += 6;
        doc.text(`  Morning (10:00 AM): ${stats.day1Schedules.morning} attendees`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Afternoon (2:30 PM): ${stats.day1Schedules.afternoon} attendees`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Evening (6:20 PM): ${stats.day1Schedules.evening} attendees`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Manual Entries: ${stats.manualEntries.day1}`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Late Entries: ${stats.lateEntries.day1}`, 16, yPosition);
        yPosition += 8;

        // Day 2 Schedule Summary
        doc.text("Day 2 - October 26, 2025:", 14, yPosition);
        yPosition += 6;
        doc.text(`  Morning (8:30 AM): ${stats.day2Schedules.morning} attendees`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Afternoon (2:30 PM): ${stats.day2Schedules.afternoon} attendees`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Evening (7:00 PM): ${stats.day2Schedules.evening} attendees`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Manual Entries: ${stats.manualEntries.day2}`, 16, yPosition);
        yPosition += 5;
        doc.text(`  Late Entries: ${stats.lateEntries.day2}`, 16, yPosition);
        yPosition += 12;

        // Zone-wise Schedule Breakdown
        doc.setFont(undefined, "bold");
        doc.text("Zone-wise Schedule Attendance", 14, yPosition);
        yPosition += 8;

        ZONES.forEach(zone => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          const zoneUsers = registeredUsers.filter(u => u.zone === zone);
          if (zoneUsers.length > 0) {
            doc.setFont(undefined, "bold");
            doc.setFontSize(9);
            doc.text(`${zone}: ${zoneUsers.length} registered`, 14, yPosition);
            yPosition += 5;

            doc.setFont(undefined, "normal");
            doc.setFontSize(8);
            
            // Day 1 schedules for this zone
            const day1Morning = zoneUsers.filter(u => u.day1Schedule === 'morning').length;
            const day1Afternoon = zoneUsers.filter(u => u.day1Schedule === 'afternoon').length;
            const day1Evening = zoneUsers.filter(u => u.day1Schedule === 'evening').length;
            const day1Manual = zoneUsers.filter(u => u.day1ManualEntry).length;
            const day1Late = zoneUsers.filter(u => u.day1LateMinutes > 0).length;
            
            doc.text(`  Day 1 - M: ${day1Morning}, A: ${day1Afternoon}, E: ${day1Evening}`, 16, yPosition);
            yPosition += 4;
            doc.text(`  Manual: ${day1Manual}, Late: ${day1Late}`, 16, yPosition);
            yPosition += 4;

            // Day 2 schedules for this zone
            const day2Morning = zoneUsers.filter(u => u.day2Schedule === 'morning').length;
            const day2Afternoon = zoneUsers.filter(u => u.day2Schedule === 'afternoon').length;
            const day2Evening = zoneUsers.filter(u => u.day2Schedule === 'evening').length;
            const day2Manual = zoneUsers.filter(u => u.day2ManualEntry).length;
            const day2Late = zoneUsers.filter(u => u.day2LateMinutes > 0).length;
            
            doc.text(`  Day 2 - M: ${day2Morning}, A: ${day2Afternoon}, E: ${day2Evening}`, 16, yPosition);
            yPosition += 4;
            doc.text(`  Manual: ${day2Manual}, Late: ${day2Late}`, 16, yPosition);
            yPosition += 8;
          }
        });

        doc.save("Ahibba_Schedule_Report.pdf");
        
        Swal.fire({
          title: 'Success!',
          text: 'Schedule report downloaded successfully!',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error generating schedule report:", error);
        Swal.fire({
          title: 'Error!',
          text: `Error generating schedule report: ${error.message}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }, 1000);
  };

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const totalFeedbackPages = Math.ceil(filteredFeedback.length / feedbackPerPage);

  // Get filtered users for manual attendance modal
  const filteredUsersForManualAttendance = getFilteredUsersForManualAttendance();

  // Render Star Rating Component
  const renderStarRating = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`text-sm ${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      </div>
    );
  };

  // Render Dashboard Tab (ALL ORIGINAL FUNCTIONALITY PRESERVED)
  const renderDashboard = () => (
    <>
      {/* Stats Cards - Enhanced with Feedback Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Registered</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.totalRegistered}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <HiOutlineUserGroup className="text-2xl text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-400 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Day 1 Attendance</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.day1Attendance}</p>
              <div className="text-xs text-gray-600 mt-1">
                M: {stats.day1Schedules.morning} | A: {stats.day1Schedules.afternoon} | E: {stats.day1Schedules.evening}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Manual: {stats.manualEntries.day1} | Late: {stats.lateEntries.day1}
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <HiOutlineCalendar className="text-2xl text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Day 2 Attendance</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.day2Attendance}</p>
              <div className="text-xs text-gray-600 mt-1">
                M: {stats.day2Schedules.morning} | A: {stats.day2Schedules.afternoon} | E: {stats.day2Schedules.evening}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Manual: {stats.manualEntries.day2} | Late: {stats.lateEntries.day2}
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FiCalendar className="text-2xl text-green-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Feedback Received</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.feedback.total}</p>
              <div className="text-xs text-gray-600 mt-1">
                Avg: {stats.feedback.averageRating} ★ | Pending: {stats.feedback.pending}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                High: {stats.feedback.highRating} | Low: {stats.feedback.lowRating}
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FiMessageCircle className="text-2xl text-purple-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Filters Section - ORIGINAL PRESERVED */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FiFilter className="text-xl text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or mobile..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Zone Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <select
              value={zoneFilter}
              onChange={handleZoneFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          {/* Attendance Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attendance</label>
            <select
              value={attendanceFilter}
              onChange={handleAttendanceFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Users</option>
              <option value="day1">Day 1 Only</option>
              <option value="day2">Day 2 Only</option>
              <option value="both">Both Days</option>
              <option value="none">No Attendance</option>
              <option value="manual">Manual Entries Only</option>
              <option value="late">Late Entries Only</option>
            </select>
          </div>

          {/* Report Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reports</label>
            <div className="flex space-x-2">
              <button
                onClick={generatePDFReport}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 text-sm"
              >
                <FiDownload className="text-xs" />
                <span>PDF</span>
              </button>
              <button
                onClick={generateScheduleReport}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 text-sm"
              >
                <FiClock className="text-xs" />
                <span>Schedule</span>
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Filters - ORIGINAL PRESERVED */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {/* Day 1 Schedule Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Day 1 Schedule</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScheduleFilter("day1", "all")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scheduleFilter.day1 === ""
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              {Object.entries(day1Schedule).map(([key, schedule]) => (
                <button
                  key={key}
                  onClick={() => handleScheduleFilter("day1", key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scheduleFilter.day1 === key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {schedule.display.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Day 2 Schedule Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Day 2 Schedule</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleScheduleFilter("day2", "all")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scheduleFilter.day2 === ""
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              {Object.entries(day2Schedule).map(([key, schedule]) => (
                <button
                  key={key}
                  onClick={() => handleScheduleFilter("day2", key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scheduleFilter.day2 === key
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {schedule.display.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Manual Attendance Section - ORIGINAL PRESERVED */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FiUserCheck className="text-xl text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-800">Manual Attendance Marking</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Day 1 Manual Attendance */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="text-lg font-semibold text-orange-800 mb-3">Day 1 - October 25, 2025</h4>
            <div className="space-y-2">
              {Object.entries(day1Schedule).map(([key, session]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{session.display}</span>
                    <div className="text-xs text-gray-600">
                      {session.start} - {session.end}
                      {isSessionEnded(session) && (
                        <span className="ml-2 text-green-600 font-medium">✓ Session Ended</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleManualAttendanceClick(session, "day1")}
                    disabled={!isSessionEnded(session)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSessionEnded(session)
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Mark Attendance
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Day 2 Manual Attendance */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="text-lg font-semibold text-orange-800 mb-3">Day 2 - October 26, 2025</h4>
            <div className="space-y-2">
              {Object.entries(day2Schedule).map(([key, session]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{session.display}</span>
                    <div className="text-xs text-gray-600">
                      {session.start} - {session.end}
                      {isSessionEnded(session) && (
                        <span className="ml-2 text-green-600 font-medium">✓ Session Ended</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleManualAttendanceClick(session, "day2")}
                    disabled={!isSessionEnded(session)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSessionEnded(session)
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Mark Attendance
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts Section - ORIGINAL PRESERVED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiBarChart2 className="text-xl text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Attendance Overview</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <HiOutlineChartPie className="text-xl text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Manual & Late Entries</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={manualAttendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Schedule Statistics - ORIGINAL PRESERVED */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FiWatch className="text-xl text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-800">Schedule-wise Attendance</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Day 1 Schedule */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">Day 1 - October 25, 2025</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm font-medium text-gray-800">Morning (10:00 AM)</span>
                <div className="text-right">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day1Schedules.morning} attendees
                  </span>
                  <div className="text-xs text-orange-600 mt-1">
                    Manual: {registeredUsers.filter(u => u.day1Schedule === 'morning' && u.day1ManualEntry).length}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm font-medium text-gray-800">Afternoon (2:30 PM)</span>
                <div className="text-right">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day1Schedules.afternoon} attendees
                  </span>
                  <div className="text-xs text-orange-600 mt-1">
                    Manual: {registeredUsers.filter(u => u.day1Schedule === 'afternoon' && u.day1ManualEntry).length}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm font-medium text-gray-800">Evening (6:20 PM)</span>
                <div className="text-right">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day1Schedules.evening} attendees
                  </span>
                  <div className="text-xs text-orange-600 mt-1">
                    Manual: {registeredUsers.filter(u => u.day1Schedule === 'evening' && u.day1ManualEntry).length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Day 2 Schedule */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="text-lg font-semibold text-green-800 mb-3">Day 2 - October 26, 2025</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm font-medium text-gray-800">Morning (8:30 AM)</span>
                <div className="text-right">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day2Schedules.morning} attendees
                  </span>
                  <div className="text-xs text-orange-600 mt-1">
                    Manual: {registeredUsers.filter(u => u.day2Schedule === 'morning' && u.day2ManualEntry).length}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm font-medium text-gray-800">Afternoon (2:30 PM)</span>
                <div className="text-right">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day2Schedules.afternoon} attendees
                  </span>
                  <div className="text-xs text-orange-600 mt-1">
                    Manual: {registeredUsers.filter(u => u.day2Schedule === 'afternoon' && u.day2ManualEntry).length}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded">
                <span className="text-sm font-medium text-gray-800">Evening (7:00 PM)</span>
                <div className="text-right">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day2Schedules.evening} attendees
                  </span>
                  <div className="text-xs text-orange-600 mt-1">
                    Manual: {registeredUsers.filter(u => u.day2Schedule === 'evening' && u.day2ManualEntry).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Zone Statistics - ORIGINAL PRESERVED */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FiMapPin className="text-xl text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-800">Zone-wise Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <FiMapPin className="text-sm" />
                    <span>Zone</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manual Entries
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zoneStats.map((stat, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.zone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.registered}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                    {stat.day1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                    {stat.day2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-semibold">
                    {stat.manualEntries}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Users Table with Pagination - ORIGINAL PRESERVED */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <FiUsers className="text-xl text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Registered Users ({filteredUsers.length})
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Page {currentPage} of {totalPages} • Showing {currentPageUsers.length} of {filteredUsers.length} users
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPageUsers.length > 0 ? (
                currentPageUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.mobile}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.zone}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.day1Attendance ? (
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              <FiCheckSquare className="mr-1" />
                              Present
                            </span>
                            {user.day1ManualEntry && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                <FiUserCheck className="mr-1" />
                                Manual
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-600">
                            {getScheduleDisplay("1", user.day1Schedule)}
                            {user.day1LateMinutes > 0 && (
                              <span className="text-orange-600 ml-1">
                                (Late: {user.day1LateMinutes}m)
                              </span>
                            )}
                          </span>
                          {user.day1Remarks && (
                            <span className="text-xs text-gray-500 mt-1 flex items-start">
                              <FiMessageSquare className="mr-1 mt-0.5 flex-shrink-0" />
                              {user.day1Remarks}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          ✗ Absent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.day2Attendance ? (
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              <FiCheckSquare className="mr-1" />
                              Present
                            </span>
                            {user.day2ManualEntry && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                <FiUserCheck className="mr-1" />
                                Manual
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-600">
                            {getScheduleDisplay("2", user.day2Schedule)}
                            {user.day2LateMinutes > 0 && (
                              <span className="text-orange-600 ml-1">
                                (Late: {user.day2LateMinutes}m)
                              </span>
                            )}
                          </span>
                          {user.day2Remarks && (
                            <span className="text-xs text-gray-500 mt-1 flex items-start">
                              <FiMessageSquare className="mr-1 mt-0.5 flex-shrink-0" />
                              {user.day2Remarks}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          ✗ Absent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2 justify-center">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                        >
                          <FiEdit2 className="text-xs" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user.id, user.name)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                        >
                          <FiTrash2 className="text-xs" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FiUsers className="text-4xl mb-2 text-gray-300" />
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </motion.div>
    </>
  );

  // Render User Registration Tab - ORIGINAL PRESERVED
  const renderUserRegistration = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center space-x-2 mb-6">
        <FiUserPlus className="text-xl text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">User Registration</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mobile *</label>
          <input
            type="text"
            value={newUser.mobile}
            onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter mobile number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Designation *</label>
          <input
            type="text"
            value={newUser.designation}
            onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter designation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zone *</label>
          <select
            value={newUser.zone}
            onChange={(e) => setNewUser({ ...newUser, zone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">Select Zone</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleAddUser}
        disabled={!newUser.name || !newUser.mobile || !newUser.designation || !newUser.zone}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        <FiUserPlus />
        <span>Register User</span>
      </button>
    </motion.div>
  );

  // Render Zones Management Tab - ORIGINAL PRESERVED
  const renderZonesManagement = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center space-x-2 mb-6">
        <FiMapPin className="text-xl text-green-600" />
        <h3 className="text-lg font-semibold text-gray-800">Zones Management</h3>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Zone</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
            placeholder="Enter zone name"
          />
          <button
            onClick={handleAddZone}
            disabled={!newZone.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
          >
            <FiPlus />
            <span>Add Zone</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone, index) => (
          <div key={index} className="border rounded-lg p-4 hover:border-green-500 transition-colors">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">{zone}</span>
              <button
                onClick={() => handleRemoveZone(zone)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <FiMinus className="text-lg" />
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Users: {registeredUsers.filter(u => u.zone === zone).length}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  // Render Feedback Tab - NEW FEATURE ADDED
  const renderFeedback = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="space-y-6"
    >
      {/* Feedback Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Feedback</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.feedback.total}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <FiMessageCircle className="text-2xl text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Average Rating</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.feedback.averageRating}</p>
              <div className="text-xs text-gray-600 mt-1">
                {renderStarRating(Math.round(stats.feedback.averageRating))}
              </div>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <FiStar className="text-2xl text-yellow-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Pending Review</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.feedback.pending}</p>
              <div className="text-xs text-gray-600 mt-1">
                {Math.round((stats.feedback.pending / stats.feedback.total) * 100) || 0}% of total
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <FiAlertTriangle className="text-2xl text-orange-500" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">High Ratings</h3>
              <p className="text-3xl font-bold text-gray-800">{stats.feedback.highRating}</p>
              <div className="text-xs text-gray-600 mt-1">
                4+ Star Ratings
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FiThumbsUp className="text-2xl text-green-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feedback Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiBarChart2 className="text-xl text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Feedback Overview</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedbackChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiPieChart className="text-xl text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">Rating Distribution</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ratingDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Feedback Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FiFilter className="text-xl text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Feedback Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Feedback</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, feedback, designation, or zone..."
                value={feedbackSearch}
                onChange={handleFeedbackSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={feedbackFilter}
              onChange={handleFeedbackFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Feedback</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
              <option value="high">High Rating (4-5)</option>
              <option value="low">Low Rating (1-2)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Export feedback functionality can be added here
                  Swal.fire({
                    title: 'Export Feedback',
                    text: 'This feature will export all feedback data to a CSV file.',
                    icon: 'info',
                    confirmButtonColor: '#3085d6',
                    background: '#fff',
                    color: '#333'
                  });
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-1 text-sm"
              >
                <FiDownload className="text-xs" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feedback List */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <FiMessageCircle className="text-xl text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              User Feedback ({filteredFeedback.length})
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Page {feedbackPage} of {totalFeedbackPages} • Showing {currentPageFeedback.length} of {filteredFeedback.length} feedback
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {currentPageFeedback.length > 0 ? (
            currentPageFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                  feedback.status === 'pending' ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-800">{feedback.name}</h4>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        {feedback.designation}
                      </span>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {feedback.zone}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{feedback.mobile}</span>
                      <span>{formatFirebaseTimestamp(feedback.submittedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {renderStarRating(feedback.rating)}
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      feedback.status === 'pending' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {feedback.status === 'pending' ? 'Pending' : 'Reviewed'}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-gray-700">{feedback.feedback}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {feedback.feedbackType && (
                      <span>Type: {feedback.feedbackType}</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {feedback.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateFeedbackStatus(feedback.id, 'reviewed')}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                      >
                        <FiCheckSquare className="text-xs" />
                        <span>Mark Reviewed</span>
                      </button>
                    )}
                    {feedback.status === 'reviewed' && (
                      <button
                        onClick={() => handleUpdateFeedbackStatus(feedback.id, 'pending')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                      >
                        <FiClock className="text-xs" />
                        <span>Mark Pending</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <FiMessageCircle className="text-4xl mb-2 text-gray-300" />
                <p className="text-lg font-medium">No feedback found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Pagination */}
        {totalFeedbackPages > 1 && (
          <Pagination
            currentPage={feedbackPage}
            totalPages={totalFeedbackPages}
            onPageChange={handleFeedbackPageChange}
          />
        )}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg">
                <img 
                  src="/yeslogo.png" 
                  alt="Ahibba Summit Logo" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Ahibba Summit 2025</h1>
                <p className="text-sm text-blue-100 flex items-center">
                  <FiTrendingUp className="mr-1" />
                  Admin Dashboard
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center space-x-2 border border-white/30 hover:border-white/40 hover:scale-105"
            >
              <FiLogOut className="text-lg" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Navigation Tabs - Updated with Feedback Tab */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: "dashboard", label: "Dashboard", icon: FiHome },
              { id: "registration", label: "User Registration", icon: FiUserPlus },
              { id: "zones", label: "Zones Management", icon: FiMapPin },
              { id: "feedback", label: "User Feedback", icon: FiMessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="text-lg" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-700 font-medium">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* User Selection Modal for Manual Attendance with Search */}
        {showUserSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
                  <FiUserPlus />
                  <span>Select User for Manual Attendance - {currentSession?.display}</span>
                </h2>
                <button
                  onClick={() => {
                    setShowUserSelection(false);
                    setCurrentSession(null);
                    setManualAttendanceSearch("");
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              {/* Search Bar for Manual Attendance */}
              <div className="mb-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={manualAttendanceSearch}
                    onChange={(e) => setManualAttendanceSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Search by name, mobile, designation, or zone..."
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Found {filteredUsersForManualAttendance.length} users
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredUsersForManualAttendance.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsersForManualAttendance.map((user) => (
                      <div
                        key={user.id}
                        className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => markManualAttendanceForUser(user)}
                      >
                        <h3 className="font-semibold text-gray-800">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.mobile}</p>
                        <p className="text-sm text-gray-600">{user.designation}</p>
                        <p className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block mt-2">
                          {user.zone}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {user.day1Attendance && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded mr-1">
                              Day 1
                            </span>
                          )}
                          {user.day2Attendance && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                              Day 2
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiUsers className="text-4xl text-gray-300 mx-auto mb-2" />
                    <p className="text-lg font-medium text-gray-500">No users found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                  <FiEdit2 />
                  <span>Edit User</span>
                </h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData({});
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editFormData.name || ""}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter user name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                    <input
                      type="text"
                      value={editFormData.mobile || ""}
                      onChange={(e) => handleEditChange("mobile", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                    <input
                      type="text"
                      value={editFormData.designation || ""}
                      onChange={(e) => handleEditChange("designation", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter designation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zone *</label>
                    <select
                      value={editFormData.zone || ""}
                      onChange={(e) => handleEditChange("zone", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select Zone</option>
                      {zones.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Day 1 Attendance */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      checked={editFormData.day1Attendance || false}
                      onChange={() => handleToggleAttendance("day1Attendance")}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      id="day1Attendance"
                    />
                    <label htmlFor="day1Attendance" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Day 1 Attendance (Oct 25, 2025)
                    </label>
                  </div>
                  
                  {editFormData.day1Attendance && (
                    <div className="ml-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Schedule:</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(day1Schedule).map(([key, schedule]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleScheduleChange("day1", key)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                editFormData.day1Schedule === key
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {schedule.display}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Late Minutes and Remarks for Day 1 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Late Minutes</label>
                          <input
                            type="number"
                            value={editFormData.day1LateMinutes || 0}
                            onChange={(e) => handleEditChange("day1LateMinutes", parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Late minutes"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Manual Entry</label>
                          <input
                            type="checkbox"
                            checked={editFormData.day1ManualEntry || false}
                            onChange={(e) => handleEditChange("day1ManualEntry", e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                          value={editFormData.day1Remarks || ""}
                          onChange={(e) => handleEditChange("day1Remarks", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Enter remarks for Day 1 attendance"
                          rows="2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Day 2 Attendance */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      checked={editFormData.day2Attendance || false}
                      onChange={() => handleToggleAttendance("day2Attendance")}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      id="day2Attendance"
                    />
                    <label htmlFor="day2Attendance" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Day 2 Attendance (Oct 26, 2025)
                    </label>
                  </div>
                  
                  {editFormData.day2Attendance && (
                    <div className="ml-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Schedule:</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(day2Schedule).map(([key, schedule]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleScheduleChange("day2", key)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                editFormData.day2Schedule === key
                                  ? "bg-green-600 text-white"
                                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {schedule.display}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Late Minutes and Remarks for Day 2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Late Minutes</label>
                          <input
                            type="number"
                            value={editFormData.day2LateMinutes || 0}
                            onChange={(e) => handleEditChange("day2LateMinutes", parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                            placeholder="Late minutes"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Manual Entry</label>
                          <input
                            type="checkbox"
                            checked={editFormData.day2ManualEntry || false}
                            onChange={(e) => handleEditChange("day2ManualEntry", e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                          value={editFormData.day2Remarks || ""}
                          onChange={(e) => handleEditChange("day2Remarks", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                          placeholder="Enter remarks for Day 2 attendance"
                          rows="2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editFormData.name || !editFormData.mobile || !editFormData.designation || !editFormData.zone}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <FiSave />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setEditFormData({});
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Render Active Tab Content */}
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "registration" && renderUserRegistration()}
        {activeTab === "zones" && renderZonesManagement()}
        {activeTab === "feedback" && renderFeedback()}
      </main>
    </div>
  );
}