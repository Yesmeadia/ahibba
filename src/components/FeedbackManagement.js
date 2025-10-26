import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "../config/firebase";
import Swal from 'sweetalert2';
import { 
  FiMessageSquare, 
  FiStar, 
  FiFilter,
  FiSearch,
  FiThumbsUp,
  FiThumbsDown,
  FiMail,
  FiUser,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiSend,
  FiX
} from "react-icons/fi";

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [editingFeedback, setEditingFeedback] = useState(null);

  const categories = {
    general: "General Feedback",
    event_quality: "Event Quality",
    speakers: "Speakers & Sessions",
    venue: "Venue & Facilities",
    food: "Food & Beverages",
    organization: "Organization",
    technical: "Technical Issues",
    suggestions: "Suggestions"
  };

  const statusOptions = {
    all: "All Status",
    new: "New",
    replied: "Replied",
    archived: "Archived"
  };

  const sentimentOptions = {
    all: "All Sentiment",
    positive: "Positive",
    negative: "Negative"
  };

  useEffect(() => {
    const q = query(
      collection(db, "feedback"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
      }));
      setFeedbacks(data);
      filterFeedbacks(data, searchQuery, statusFilter, sentimentFilter, categoryFilter);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filterFeedbacks = (data, search, status, sentiment, category) => {
    let filtered = data;

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name?.toLowerCase().includes(lowerSearch) ||
          f.email?.toLowerCase().includes(lowerSearch) ||
          f.message?.toLowerCase().includes(lowerSearch) ||
          f.category?.toLowerCase().includes(lowerSearch)
      );
    }

    if (status !== "all") {
      filtered = filtered.filter((f) => f.status === status);
    }

    if (sentiment !== "all") {
      filtered = filtered.filter((f) => f.sentiment === sentiment);
    }

    if (category !== "all") {
      filtered = filtered.filter((f) => f.category === category);
    }

    setFilteredFeedbacks(filtered);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterFeedbacks(feedbacks, query, statusFilter, sentimentFilter, categoryFilter);
  };

  const handleStatusFilter = (e) => {
    const status = e.target.value;
    setStatusFilter(status);
    filterFeedbacks(feedbacks, searchQuery, status, sentimentFilter, categoryFilter);
  };

  const handleSentimentFilter = (e) => {
    const sentiment = e.target.value;
    setSentimentFilter(sentiment);
    filterFeedbacks(feedbacks, searchQuery, statusFilter, sentiment, categoryFilter);
  };

  const handleCategoryFilter = (e) => {
    const category = e.target.value;
    setCategoryFilter(category);
    filterFeedbacks(feedbacks, searchQuery, statusFilter, sentimentFilter, category);
  };

  const handleReply = async (feedbackId) => {
    if (!replyMessage.trim()) {
      Swal.fire({
        title: 'Error!',
        text: 'Please enter a reply message.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
      return;
    }

    try {
      const feedbackRef = doc(db, "feedback", feedbackId);
      await updateDoc(feedbackRef, {
        adminReply: replyMessage,
        repliedAt: new Date(),
        status: "replied"
      });

      setReplyingTo(null);
      setReplyMessage("");

      Swal.fire({
        title: 'Success!',
        text: 'Reply sent successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error sending reply:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to send reply. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    }
  };

  const handleStatusUpdate = async (feedbackId, newStatus) => {
    try {
      const feedbackRef = doc(db, "feedback", feedbackId);
      await updateDoc(feedbackRef, {
        status: newStatus
      });

      Swal.fire({
        title: 'Success!',
        text: `Feedback marked as ${newStatus}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update status. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    }
  };

  const handleDeleteFeedback = async (feedbackId, userName) => {
    const result = await Swal.fire({
      title: 'Delete Feedback?',
      text: `Are you sure you want to delete feedback from ${userName || 'this user'}?`,
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
        await deleteDoc(doc(db, "feedback", feedbackId));
        Swal.fire({
          title: 'Deleted!',
          text: 'Feedback has been deleted successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error deleting feedback:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error deleting feedback. Please try again.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      new: { color: "bg-blue-100 text-blue-800", icon: FiClock },
      replied: { color: "bg-green-100 text-green-800", icon: FiCheckCircle },
      archived: { color: "bg-gray-100 text-gray-800", icon: FiX }
    };
    
    const config = statusConfig[status] || statusConfig.new;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSentimentBadge = (sentiment) => {
    const isPositive = sentiment === "positive";
    const IconComponent = isPositive ? FiThumbsUp : FiThumbsDown;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}>
        <IconComponent className="mr-1" />
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Statistics
  const stats = {
    total: feedbacks.length,
    new: feedbacks.filter(f => f.status === "new").length,
    replied: feedbacks.filter(f => f.status === "replied").length,
    positive: feedbacks.filter(f => f.sentiment === "positive").length,
    negative: feedbacks.filter(f => f.sentiment === "negative").length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Feedback</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <FiMessageSquare className="text-2xl text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">New</p>
              <p className="text-2xl font-bold text-gray-800">{stats.new}</p>
            </div>
            <FiClock className="text-2xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Replied</p>
              <p className="text-2xl font-bold text-gray-800">{stats.replied}</p>
            </div>
            <FiCheckCircle className="text-2xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Positive</p>
              <p className="text-2xl font-bold text-gray-800">{stats.positive}</p>
            </div>
            <FiThumbsUp className="text-2xl text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-400">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">Negative</p>
              <p className="text-2xl font-bold text-gray-800">{stats.negative}</p>
            </div>
            <FiThumbsDown className="text-2xl text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FiFilter className="text-xl text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            >
              {Object.entries(statusOptions).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
            <select
              value={sentimentFilter}
              onChange={handleSentimentFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            >
              {Object.entries(sentimentOptions).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={handleCategoryFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Categories</option>
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Feedback List */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white p-6 rounded-xl shadow-md"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <FiMessageSquare className="text-xl text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Feedback ({filteredFeedbacks.length})
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          {filteredFeedbacks.length > 0 ? (
            filteredFeedbacks.map((feedback) => (
              <div key={feedback.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <FiUser className="text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {feedback.name || "Anonymous"}
                      </span>
                    </div>
                    {feedback.email && (
                      <div className="flex items-center space-x-1 text-gray-500">
                        <FiMail className="text-sm" />
                        <span className="text-sm">{feedback.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(feedback.status)}
                    {getSentimentBadge(feedback.sentiment)}
                  </div>
                </div>

                {/* Category and Rating */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {categories[feedback.category]}
                  </span>
                  {feedback.rating > 0 && (
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FiStar
                            key={star}
                            className={`text-sm ${
                              star <= feedback.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message */}
                <div className="mb-3">
                  <p className="text-gray-700 whitespace-pre-wrap">{feedback.message}</p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
                  <FiCalendar className="text-sm" />
                  <span>{formatDate(feedback.createdAt)}</span>
                </div>

                {/* Admin Reply */}
                {feedback.adminReply && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-blue-800">Admin Reply:</span>
                      <span className="text-xs text-blue-600">
                        {formatDate(feedback.repliedAt)}
                      </span>
                    </div>
                    <p className="text-blue-700 whitespace-pre-wrap">{feedback.adminReply}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <div className="flex space-x-2">
                    {feedback.status !== "replied" && (
                      <button
                        onClick={() => setReplyingTo(feedback.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <FiSend className="text-xs" />
                        <span>Reply</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusUpdate(feedback.id, "archived")}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Archive
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteFeedback(feedback.id, feedback.name)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <FiTrash2 className="text-xs" />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Reply Form */}
                {replyingTo === feedback.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply here..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyMessage("");
                        }}
                        className="px-3 py-1 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReply(feedback.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <FiSend className="text-xs" />
                        <span>Send Reply</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <FiMessageSquare className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-lg font-medium text-gray-500">No feedback found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FeedbackManagement;