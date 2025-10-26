import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";

export default function AttendancePage() {
  const [mobile, setMobile] = useState("");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [day, setDay] = useState("");
  const [schedule, setSchedule] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(0);
  const canvasRef = useRef(null);

  // Enhanced time update with more frequent checks during active periods
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Force re-render every 30 seconds to update availability
      setAutoRefresh(prev => prev + 1);
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(timer);
  }, []);

  // Event Dates
  const eventDates = {
    day1: new Date('2025-10-25T00:00:00+05:30'),
    day2: new Date('2025-10-26T00:00:00+05:30')
  };

  // Enhanced schedule configuration with buffer times
  const schedules = {
    day1: {
      morning: { 
        start: "09:45", 
        end: "11:10", 
        display: "Morning 10:00 AM",
        date: "2025-10-25",
        buffer: 15 // minutes buffer before/after
      },
      afternoon: { 
        start: "14:30", 
        end: "15:17", 
        display: "Afternoon 2:30 PM",
        date: "2025-10-25",
        buffer: 15
      },
      evening: { 
        start: "18:15", 
        end: "18:50", 
        display: "Evening 6:20 PM",
        date: "2025-10-25",
        buffer: 15
      }
    },
    day2: {
      morning: { 
        start: "08:15", 
        end: "08:45", 
        display: "Morning 8:30 AM",
        date: "2025-10-26",
        buffer: 15
      },
      afternoon: { 
        start: "14:15", 
        end: "16:45", 
        display: "Afternoon 2:30 PM",
        date: "2025-10-26",
        buffer: 15
      },
      evening: { 
        start: "18:30", 
        end: "21:00", 
        display: "Evening 7:00 PM",
        date: "2025-10-26",
        buffer: 15
      }
    }
  };

  // Enhanced time checking with buffer support
  const getScheduleWithBuffer = (dayNum, scheduleType) => {
    const schedule = schedules[`day${dayNum}`]?.[scheduleType];
    if (!schedule) return null;

    const now = currentTime;
    const eventDate = eventDates[`day${dayNum}`];
    
    // Check if it's the correct event date
    if (now.toDateString() !== eventDate.toDateString()) {
      return null;
    }

    // Create datetime objects with buffer
    const startTime = new Date(`${schedule.date}T${schedule.start}:00+05:30`);
    const endTime = new Date(`${schedule.date}T${schedule.end}:00+05:30`);
    
    const bufferMs = schedule.buffer * 60 * 1000;
    const startTimeWithBuffer = new Date(startTime.getTime() - bufferMs);
    const endTimeWithBuffer = new Date(endTime.getTime() + bufferMs);

    return {
      ...schedule,
      startTime,
      endTime,
      startTimeWithBuffer,
      endTimeWithBuffer,
      isActive: now >= startTime && now <= endTime,
      isInBuffer: (now >= startTimeWithBuffer && now < startTime) || 
                  (now > endTime && now <= endTimeWithBuffer)
    };
  };

  // Enhanced schedule availability check
  const isScheduleActive = (dayNum, scheduleType) => {
    const schedule = getScheduleWithBuffer(dayNum, scheduleType);
    return schedule ? schedule.isActive : false;
  };

  // Get current active schedules automatically
  const getCurrentActiveSchedules = () => {
    const activeSchedules = [];
    
    // Check both days
    ['1', '2'].forEach(dayNum => {
      if (!isDayActive(dayNum)) return;
      
      const daySchedules = schedules[`day${dayNum}`];
      Object.keys(daySchedules).forEach(scheduleType => {
        const schedule = getScheduleWithBuffer(dayNum, scheduleType);
        if (schedule && schedule.isActive) {
          activeSchedules.push({
            day: dayNum,
            schedule: scheduleType,
            display: schedule.display,
            endsAt: schedule.endTime
          });
        }
      });
    });
    
    return activeSchedules;
  };

  // Auto-select available day and schedule when user is found
  useEffect(() => {
    if (userData && !day && !schedule) {
      const activeSchedules = getCurrentActiveSchedules();
      
      // Filter out schedules user has already marked
      const availableSchedules = activeSchedules.filter(({ day, schedule }) => {
        const attendanceField = `day${day}Attendance`;
        const scheduleField = `day${day}Schedule`;
        return !userData[attendanceField] || userData[scheduleField] !== schedule;
      });

      if (availableSchedules.length > 0) {
        const firstAvailable = availableSchedules[0];
        setDay(firstAvailable.day);
        setSchedule(firstAvailable.schedule);
        
        // Show auto-selection message
        setMessage(`Auto-selected: Day ${firstAvailable.day} - ${firstAvailable.display}`);
        
        // Auto-mark attendance after 2 seconds if only one option
        if (availableSchedules.length === 1) {
          const autoMarkTimer = setTimeout(() => {
            if (!loading) {
              handleMarkAttendance();
            }
          }, 2000);
          
          return () => clearTimeout(autoMarkTimer);
        }
      }
    }
  }, [userData, day, schedule, currentTime, autoRefresh]);

  // Check if a specific day is active
  const isDayActive = (dayNum) => {
    const now = currentTime;
    const eventDate = eventDates[`day${dayNum}`];
    return now.toDateString() === eventDate.toDateString();
  };

  // Check if schedule is locked
  const isScheduleLocked = (dayNum, scheduleType) => {
    if (!userData) return true;
    
    const attendanceField = `day${dayNum}Attendance`;
    const scheduleField = `day${dayNum}Schedule`;
    
    return userData[attendanceField] && userData[scheduleField] === scheduleType;
  };

  // Check if day is completely locked
  const isDayLocked = (dayNum) => {
    if (!userData) return true;
    
    const attendanceField = `day${dayNum}Attendance`;
    
    // If day is already marked, it's locked
    if (userData[attendanceField]) return true;
    
    // If it's not the event day, it's locked
    return !isDayActive(dayNum);
  };

  // Enhanced getAvailableSchedules with real-time status
  const getAvailableSchedules = (dayNum) => {
    const daySchedules = schedules[`day${dayNum}`];
    const available = [];

    Object.keys(daySchedules).forEach(scheduleType => {
      const schedule = getScheduleWithBuffer(dayNum, scheduleType);
      if (!schedule) return;

      const isLocked = isScheduleLocked(dayNum, scheduleType);
      
      available.push({
        type: scheduleType,
        display: schedule.display,
        isActive: schedule.isActive,
        isInBuffer: schedule.isInBuffer,
        isLocked,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: getScheduleStatus(dayNum, scheduleType)
      });
    });

    return available;
  };

  // Enhanced schedule status
  const getScheduleStatus = (dayNum, scheduleType) => {
    const schedule = getScheduleWithBuffer(dayNum, scheduleType);
    if (!schedule) return "Not today";

    const now = currentTime;

    if (schedule.isActive) {
      return "Active Now";
    } else if (schedule.isInBuffer) {
      return now < schedule.startTime ? "Starting Soon" : "Just Ended";
    } else if (now < schedule.startTimeWithBuffer) {
      return `Starts at ${schedule.start}`;
    } else {
      return "Ended";
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Voice function
  const playWelcomeVoice = (name) => {
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Welcome ${name}! Your attendance has been marked successfully.`);
        utterance.lang = 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.log("Voice synthesis not supported:", error);
    }
  };

  // Confetti animation function
  const createConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti = [];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 5 + 2,
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 5,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)],
        rotation: Math.random() * Math.PI * 2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      confetti.forEach((piece, index) => {
        piece.y += piece.speedY;
        piece.x += piece.speedX;
        piece.rotation += 0.1;

        if (piece.y > canvas.height) {
          confetti.splice(index, 1);
        }

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
        ctx.restore();
      });

      if (confetti.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!mobile.trim() || mobile.trim().length !== 10 || !/^\d+$/.test(mobile.trim())) {
      setMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setMessage("");
    setUserData(null);
    setDay("");
    setSchedule("");

    try {
      const q = query(collection(db, "registration"), where("mobile", "==", mobile.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("User not found. Please check the mobile number.");
        setSearchPerformed(true);
      } else {
        const user = snapshot.docs[0].data();
        user.id = snapshot.docs[0].id;
        setUserData(user);
        setSearchPerformed(true);
        setMessage("");
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setMessage("Error searching. Please try again.");
      setSearchPerformed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!day || !schedule) {
      setMessage("Please select both Day and Schedule");
      return;
    }

    // Double-check schedule availability before marking
    if (!isScheduleActive(day, schedule)) {
      setMessage("This schedule is no longer active. Please refresh and try again.");
      return;
    }

    if (!userData || !userData.id) {
      setMessage("User data not found. Please search again.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const attendanceField = `day${day}Attendance`;
      const scheduleField = `day${day}Schedule`;
      const timeField = `day${day}AttendanceTime`;
      
      const userRef = doc(db, "registration", userData.id);

      const updateData = {
        [attendanceField]: true,
        [scheduleField]: schedule,
        [timeField]: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);

      // Update local state
      setUserData(prev => ({
        ...prev,
        [attendanceField]: true,
        [scheduleField]: schedule,
        [timeField]: new Date().toISOString()
      }));

      // Trigger voice and confetti for Day 1
      if (day === "1") {
        try {
          playWelcomeVoice(userData.name);
          createConfetti();
        } catch (error) {
          console.log("Animation error (non-critical):", error);
        }
      }

      setMessage(`Day ${day} - ${getScheduleDisplay(day, schedule)} attendance marked successfully!`);
      setDay("");
      setSchedule("");
      
      // Reset after success
      setTimeout(() => {
        setMobile("");
        setUserData(null);
        setSearchPerformed(false);
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error marking attendance:", error);
      
      let errorMessage = "Failed to mark attendance. ";
      
      if (error.code === 'permission-denied') {
        errorMessage += "Permission denied. Please check database rules.";
      } else if (error.code === 'not-found') {
        errorMessage += "User document not found.";
      } else if (error.code === 'unavailable') {
        errorMessage += "Network error. Please check your connection.";
      } else {
        errorMessage += "Please try again or contact support.";
      }
      
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleDisplay = (dayNum, scheduleType) => {
    const scheduleData = schedules[`day${dayNum}`];
    return scheduleData[scheduleType]?.display || scheduleType;
  };

  const isDay1Marked = userData?.day1Attendance;
  const isDay2Marked = userData?.day2Attendance;
  
  // Day 2 can only be selected if Day 1 is marked AND it's Day 2 event date
  const canSelectDay2 = isDay1Marked && isDayActive("2");

  // Enhanced schedule display in the UI
  const renderScheduleOptions = (dayNum) => {
    const availableSchedules = getAvailableSchedules(dayNum);
    
    if (availableSchedules.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600 text-sm">
            No active schedules available at this time
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Check the schedule timings and try again during active slots
          </p>
        </div>
      );
    }

    return availableSchedules.map((slot) => (
      <button
        key={slot.type}
        onClick={() => setSchedule(slot.type)}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-left ${
          schedule === slot.type
            ? "bg-blue-600 text-white shadow-lg scale-105"
            : slot.isActive && !slot.isLocked
            ? "bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-400"
            : slot.isLocked
            ? "bg-blue-100 text-blue-600 border border-blue-300 cursor-not-allowed"
            : "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed"
        }`}
        disabled={!slot.isActive || slot.isLocked}
      >
        <div className="flex items-center justify-between">
          <span>{slot.display}</span>
          <span className={`text-xs px-2 py-1 rounded ${
            slot.isActive && !slot.isLocked
              ? "bg-green-500 text-white animate-pulse"
              : slot.isLocked
              ? "bg-blue-500 text-white"
              : slot.isInBuffer
              ? "bg-yellow-500 text-white"
              : "bg-gray-400 text-white"
          }`}>
            {slot.status}
          </span>
        </div>
        {slot.isActive && !slot.isLocked && (
          <div className="text-xs mt-1 text-green-600 font-medium">
            ✓ Available - Auto-unlocked
          </div>
        )}
        {slot.isLocked && (
          <div className="text-xs mt-1 text-blue-600">
            ✓ Attendance already marked
          </div>
        )}
      </button>
    ));
  };

  // Add this to show current active sessions
  const CurrentActiveSessions = () => {
    const activeSessions = getCurrentActiveSchedules();
    
    if (activeSessions.length === 0) return null;

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Currently Active Sessions
        </h4>
        {activeSessions.map((session, index) => (
          <div key={index} className="text-sm text-green-700">
            • Day {session.day} - {session.display} 
            <span className="text-xs ml-2 bg-green-200 px-2 py-1 rounded">
              Ends: {session.endsAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative"
      style={{
        backgroundImage: 'url("/bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Confetti Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-50"
      />

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-transparent p-8 rounded-2xl shadow-2xl w-full max-w-md"
        >
          {/* Add Current Active Sessions */}
          <CurrentActiveSessions />

          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-yellow-500">Mark Attendance</h3>
            <p className="text-white-600 mt-2 text-sm">Enter your mobile number to check in</p>
            <p className="text-white-400 text-xs mt-1">
              Current Time: {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST | 
              Date: {currentTime.toLocaleDateString('en-IN')}
            </p>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
              (message.includes("successfully") || message.includes("marked") || message.includes("Auto-selected")) 
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}>
              {message}
            </div>
          )}

          {!userData ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter 10-digit number"
                  maxLength="10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search User
                  </>
                )}
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{userData.name}</p>
                    <p className="text-sm text-gray-600">{userData.mobile}</p>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium text-gray-700">Designation:</span>{' '}
                    <span className="text-blue-600">{userData.designation}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Zone:</span>{' '}
                    <span className="text-blue-600">{userData.zone}</span>
                  </p>
                  {userData.day1Attendance && (
                    <p className="text-green-600 font-medium">
                      ✓ Day 1: {getScheduleDisplay("1", userData.day1Schedule)} on {formatDate(eventDates.day1)}
                    </p>
                  )}
                  {userData.day2Attendance && (
                    <p className="text-green-600 font-medium">
                      ✓ Day 2: {getScheduleDisplay("2", userData.day2Schedule)} on {formatDate(eventDates.day2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-white-700">
                  Select Day <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDay("1");
                      setSchedule("");
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      day === "1"
                        ? "bg-green-600 text-white shadow-lg scale-105"
                        : isDayLocked("1") 
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={isDayLocked("1")}
                    title={isDayLocked("1") ? 
                      (isDay1Marked ? "Day 1 attendance already marked" : `Available only on ${formatDate(eventDates.day1)}`) 
                      : `Mark attendance for ${formatDate(eventDates.day1)}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isDay1Marked && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      Day 1 {isDay1Marked ? "✓" : ""}
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      {formatDate(eventDates.day1)}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (canSelectDay2) {
                        setDay("2");
                        setSchedule("");
                      }
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all relative ${
                      day === "2"
                        ? "bg-green-600 text-white shadow-lg scale-105"
                        : !canSelectDay2 || isDayLocked("2")
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={!canSelectDay2 || isDayLocked("2")}
                    title={!isDay1Marked ? "Complete Day 1 attendance first" : 
                           isDayLocked("2") ? `Available only on ${formatDate(eventDates.day2)}` : 
                           `Mark attendance for ${formatDate(eventDates.day2)}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {!canSelectDay2 && !isDay2Marked && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {isDay2Marked && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      Day 2 {isDay2Marked ? "✓" : ""}
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      {formatDate(eventDates.day2)}
                    </div>
                  </button>
                </div>
                {!isDay1Marked && !isDayActive("1") && (
                  <p className="text-xs text-amber-600 mt-1">
                     Day 1 available only on {formatDate(eventDates.day1)}
                  </p>
                )}
                {isDay1Marked && !isDayActive("2") && (
                  <p className="text-xs text-amber-600 mt-1">
                     Day 2 available only on {formatDate(eventDates.day2)}
                  </p>
                )}
              </div>

              {day && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white-700">
                    Select Schedule <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {renderScheduleOptions(day)}
                  </div>
                  
                  {/* Schedule Display */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {day === "1" ? `Day 1 Schedule - ${formatDate(eventDates.day1)}` : `Day 2 Schedule - ${formatDate(eventDates.day2)}`}
                    </h4>
                    <div className="space-y-2 text-xs text-gray-600">
                      {Object.entries(schedules[`day${day}`]).map(([scheduleType, slot]) => (
                        <div key={scheduleType} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>{slot.display}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            isScheduleActive(day, scheduleType) && !isScheduleLocked(day, scheduleType)
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : isScheduleLocked(day, scheduleType)
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-500 border border-gray-300"
                          }`}>
                            {isScheduleLocked(day, scheduleType) 
                              ? "✓ Marked" 
                              : getScheduleStatus(day, scheduleType)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleMarkAttendance}
                disabled={loading || !day || !schedule}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Mark Attendance
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setMobile("");
                  setUserData(null);
                  setDay("");
                  setSchedule("");
                  setMessage("");
                  setSearchPerformed(false);
                }}
                className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
              >
                Search Another User
              </button>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-white/80">
            © 2025 YES INDIA FOUNDATION | Powered by Cyberduce Technologies
          </p>
        </motion.div>
      </div>
    </div>
  );
}