import { useState } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export default function FeedbackPage() {
  const [mobile, setMobile] = useState("");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState("general");

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!mobile.trim() || mobile.trim().length !== 10 || !/^\d+$/.test(mobile.trim())) {
      setMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setMessage("");
    setUserData(null);
    setFeedback("");
    setRating(5);
    setFeedbackType("general");

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

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      setMessage("Please enter your feedback");
      return;
    }

    if (feedback.trim().length < 10) {
      setMessage("Feedback must be at least 10 characters long");
      return;
    }

    if (!userData || !userData.id) {
      setMessage("User data not found. Please search again.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await addDoc(collection(db, "feedback"), {
        userId: userData.id,
        name: userData.name,
        mobile: userData.mobile,
        designation: userData.designation,
        zone: userData.zone,
        feedbackType: feedbackType,
        feedback: feedback.trim(),
        rating: rating,
        submittedAt: serverTimestamp(),
        status: "pending"
      });

      setMessage("Thank you! Your feedback has been submitted successfully.");
      
      setTimeout(() => {
        setMobile("");
        setUserData(null);
        setFeedback("");
        setRating(5);
        setFeedbackType("general");
        setSearchPerformed(false);
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      let errorMessage = "Failed to submit feedback. ";
      
      if (error.code === 'permission-denied') {
        errorMessage += "Permission denied. Please check database rules.";
      } else if (error.code === 'unavailable') {
        errorMessage += "Network error. Please check your connection.";
      } else {
        errorMessage += "Please try again or contact support.";
      }
      
      setMessage(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-125"
            type="button"
          >
            <svg
              className={`w-8 h-8 ${
                star <= value ? "text-yellow-400 fill-current" : "text-gray-300"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
          </button>
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
      <div className="absolute inset-0 bg-black opacity-50"></div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-transparent p-8 rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-yellow-500">Share Your Feedback</h3>
            <p className="text-white-600 mt-2 text-sm">Help us improve by sharing your valuable feedback</p>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                message.includes("successfully")
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-red-100 text-red-700 border border-red-300"
              }`}
            >
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
                  placeholder="Enter 10-digit mobile number"
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
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'general', label: 'General' },
                      { value: 'suggestion', label: 'Suggestion' },
                      { value: 'complaint', label: 'Complaint' },
                      { value: 'appreciation', label: 'Appreciation' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFeedbackType(type.value)}
                        className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                          feedbackType === type.value
                            ? "bg-blue-600 text-white shadow-lg scale-105"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Rating <span className="text-red-500">*</span>
                  </label>
                  <StarRating value={rating} onChange={setRating} />
                  <p className="text-xs text-gray-500 mt-1">
                    {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Please share your detailed feedback here... (minimum 10 characters)"
                    rows="5"
                    maxLength="1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    disabled={submitting}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {feedback.length < 10 ? (
                        <span className="text-red-500">Minimum 10 characters required</span>
                      ) : (
                        <span className="text-green-600">✓ Ready to submit</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{feedback.length}/1000</p>
                  </div>
                </div>

                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting || feedback.trim().length < 10}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Submit Feedback
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setMobile("");
                    setUserData(null);
                    setFeedback("");
                    setRating(5);
                    setFeedbackType("general");
                    setMessage("");
                    setSearchPerformed(false);
                  }}
                  className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
                >
                  Search Another User
                </button>
              </div>
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