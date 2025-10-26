import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CertificatePage() {
  const [mobile, setMobile] = useState("");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef(null);

  // Always return true to allow certificates for all registered users
  const hasCompletedAllRequirements = (user) => {
    return true; // Remove all attendance restrictions
  };

  // Get schedule display text
  const getScheduleDisplay = (dayNum, scheduleType) => {
    const day1Schedules = {
      morning: "Morning 10:00 AM",
      afternoon: "Afternoon 2:30 PM", 
      evening: "Evening 6:20 PM"
    };
    
    const day2Schedules = {
      morning: "Morning 8:30 AM",
      afternoon: "Afternoon 2:30 PM",
      evening: "Evening 7:00 PM"
    };
    
    const schedule = dayNum === "1" ? day1Schedules : day2Schedules;
    return schedule[scheduleType] || scheduleType || "Not Marked";
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

    try {
      const q = query(collection(db, "registration"), where("mobile", "==", mobile.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("User not found. Please check the mobile number.");
        setSearchPerformed(true);
      } else {
        const user = snapshot.docs[0].data();
        user.id = snapshot.docs[0].id;
        
        // Certificate is always available for all registered users
        setUserData(user);
        setMessage("✅ Certificate is available for download!");
        setSearchPerformed(true);
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setMessage("Error searching. Please try again.");
      setSearchPerformed(true);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current || !userData) return;

    setDownloading(true);

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
        imageTimeout: 0,
        type: 'image/png',
        pixelRatio: window.devicePixelRatio * 2,
        onclone: (clonedDocument) => {
          const clonedElement = clonedDocument.querySelector('[style*="backgroundImage"]');
          if (clonedElement) {
            clonedElement.style.backgroundColor = 'transparent';
          }
        }
      });

      // A4 Landscape dimensions: 297mm x 210mm (1188px × 840px @ 96dpi)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: false
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Use highest quality PNG with maximum bit depth
      const imgData = canvas.toDataURL("image/png", 1.0);
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "NONE");
      pdf.save(`Certificate_${userData.name.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage("Error downloading certificate. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Certificate is always available for all registered users
  const isCertificateAvailable = userData;

  // Get attendance status details (for information only, not for restriction)
  const getAttendanceStatus = (user) => {
    const status = [];
    
    if (user.day1Attendance && user.day1Schedule) {
      status.push(`✓ Day 1: ${getScheduleDisplay("1", user.day1Schedule)}`);
    } else if (user.day1Attendance) {
      status.push("⚠️ Day 1: Attendance marked but schedule incomplete");
    } else {
      status.push("❌ Day 1: Not attended");
    }
    
    if (user.day2Attendance && user.day2Schedule) {
      status.push(`✓ Day 2: ${getScheduleDisplay("2", user.day2Schedule)}`);
    } else if (user.day2Attendance) {
      status.push("⚠️ Day 2: Attendance marked but schedule incomplete");
    } else {
      status.push("❌ Day 2: Not attended");
    }
    
    return status;
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative"
      style={{
        backgroundImage: 'url("/bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
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
          className="bg-transparent p-8 rounded-2xl bg-opacity-95 shadow-2xl w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-yellow-500">Get Your Certificate</h3>
            <p className="text-white-600 mt-2 text-sm">
              Enter your mobile number to retrieve your participation certificate
            </p>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
              message.includes("❌") || message.includes("not available") || message.includes("Error") || message.includes("not found")
                ? "bg-red-100 text-red-700 border border-red-300"
                : message.includes("⚠️")
                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                : "bg-green-100 text-green-700 border border-green-300"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full px-6 py-3 bg-yellow-500 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center mt-6"
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
                    Get Certificate
                  </>
                )}
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-4"
            >
              <div className={`p-4 rounded-lg border ${
                isCertificateAvailable 
                  ? "bg-green-50 border-green-200" 
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <p className="text-sm font-medium text-gray-700 mb-2">Participant Details:</p>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold text-gray-800">{userData.name}</span></p>
                  <p className="text-gray-600">Mobile: {userData.mobile}</p>
                  <p className="text-gray-600">Zone: {userData.zone}</p>
                  
                  {/* Show attendance status for information only */}
                  {(userData.day1Attendance || userData.day2Attendance) && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="font-medium text-gray-700 mb-1">Attendance Status:</p>
                      {getAttendanceStatus(userData).map((status, index) => (
                        <p 
                          key={index} 
                          className={`text-sm ${
                            status.includes('✓') ? 'text-green-700' : 
                            status.includes('⚠️') ? 'text-yellow-700' : 
                            'text-red-700'
                          }`}
                        >
                          {status}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                    <p className="text-green-800 font-semibold text-sm">
                      ✅ Certificate Available for Download!
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={downloadCertificate}
                disabled={downloading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Certificate (PDF)
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setMobile("");
                  setUserData(null);
                  setMessage("");
                  setSearchPerformed(false);
                }}
                className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
              >
                Back to Search
              </button>
            </motion.div>
          )}
        </motion.div>

        {isCertificateAvailable && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full mt-8"
            style={{ maxWidth: '1188px' }}
          >
            {/* Certificate Container - Background image with overlaid text */}
            <div 
              ref={certificateRef} 
              className="relative overflow-hidden mx-auto"
              style={{
                width: '1188px',
                height: '840px',
                aspectRatio: '297/210',
                backgroundImage: 'url("/ahibbac.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Data Overlay - Only Name and Zone */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                
                {/* Name Field - Dynamic sizing based on length */}
                <div className="absolute" style={{ top: '420px', left: '50%', transform: 'translateX(-50%)', width: '700px', textAlign: 'center' }}>
                  <h2 
                    className={`font-bold text-green-600 ${
                      userData.name.length > 25 ? 'text-3xl' : 
                      userData.name.length > 15 ? 'text-4xl' : 
                      'text-5xl'
                    }`}
                    style={{
                      fontFamily: 'metropolis-regular, serif',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}
                  >
                    {userData.name}
                  </h2>
                </div>

                {/* Zone only - Positioned below the name */}
                <div className="absolute" style={{ top: '520px', left: '45%', transform: 'translateX(-50%)', width: '900px', textAlign: 'center' }}>
                  <p className="text-xl text-black text-sm" style={{fontFamily: 'metropolis-regular, serif', letterSpacing: '0.2px'}}><span className="font-bold text-black text-sm">Yesian From </span>
                    <span className="font-bold text-black text-sm">{userData.zone}</span>
                  </p>
                </div>

                {/* Certificate Number - Bottom left aligned */}
                <div className="absolute" style={{ bottom: '100px', left: '150px', textAlign: 'left' }}>
                  <p className="text-xs text-white font-semibold" style={{fontFamily: 'metropolis-regular, sans-serif'}}>
                    Certificate No: {userData.id.substring(0, 12).toUpperCase()}
                  </p>
                  <p className="text-xs text-white mt-1" style={{fontFamily: 'metropolis-regular, sans-serif'}}>
                    {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-white">
            © 2025 YES INDIA FOUNDATION | Powered by Cyberduce Technologies
          </p>
        </motion.div>
      </div>
    </div>
  );
}