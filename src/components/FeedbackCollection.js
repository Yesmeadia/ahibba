import { useState } from "react";
import { motion } from "framer-motion";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import Swal from 'sweetalert2';
import { 
  FiMessageSquare, 
  FiStar, 
  FiSend,
  FiThumbsUp,
  FiThumbsDown,
  FiUser,
  FiMail
} from "react-icons/fi";

const FeedbackCollection = () => {
  const [feedbackData, setFeedbackData] = useState({
    name: "",
    email: "",
    rating: 0,
    category: "general",
    message: "",
    sentiment: "positive"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const categories = [
    "general",
    "event_quality",
    "speakers",
    "venue",
    "food",
    "organization",
    "technical",
    "suggestions"
  ];

  const categoryLabels = {
    general: "General Feedback",
    event_quality: "Event Quality",
    speakers: "Speakers & Sessions",
    venue: "Venue & Facilities",
    food: "Food & Beverages",
    organization: "Organization",
    technical: "Technical Issues",
    suggestions: "Suggestions"
  };

  const handleInputChange = (field, value) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedbackData.message.trim()) {
      Swal.fire({
        title: 'Error!',
        text: 'Please enter your feedback message.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "feedback"), {
        ...feedbackData,
        createdAt: serverTimestamp(),
        status: "new",
        adminReply: "",
        repliedAt: null
      });

      // Reset form
      setFeedbackData({
        name: "",
        email: "",
        rating: 0,
        category: "general",
        message: "",
        sentiment: "positive"
      });

      Swal.fire({
        title: 'Thank You!',
        text: 'Your feedback has been submitted successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to submit feedback. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center space-x-2 mb-6">
        <FiMessageSquare className="text-xl text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">Share Your Feedback</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name and Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-1">
                <FiUser className="text-sm" />
                <span>Your Name (Optional)</span>
              </div>
            </label>
            <input
              type="text"
              value={feedbackData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-1">
                <FiMail className="text-sm" />
                <span>Email (Optional)</span>
              </div>
            </label>
            <input
              type="email"
              value={feedbackData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Category
          </label>
          <select
            value={feedbackData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <div className="flex items-center space-x-1">
              <FiStar className="text-sm" />
              <span>Rating</span>
            </div>
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleInputChange("rating", star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <FiStar
                  className={`text-2xl ${
                    star <= (hoveredRating || feedbackData.rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {feedbackData.rating === 0 ? "Select a rating" : `${feedbackData.rating} out of 5 stars`}
          </div>
        </div>

        {/* Sentiment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Overall Sentiment
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => handleInputChange("sentiment", "positive")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                feedbackData.sentiment === "positive"
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FiThumbsUp />
              <span>Positive</span>
            </button>
            <button
              type="button"
              onClick={() => handleInputChange("sentiment", "negative")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                feedbackData.sentiment === "negative"
                  ? "bg-red-100 border-red-500 text-red-700"
                  : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FiThumbsDown />
              <span>Negative</span>
            </button>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback Message *
          </label>
          <textarea
            value={feedbackData.message}
            onChange={(e) => handleInputChange("message", e.target.value)}
            rows="5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
            placeholder="Please share your detailed feedback, suggestions, or concerns about the event..."
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !feedbackData.message.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <FiSend />
              <span>Submit Feedback</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default FeedbackCollection;