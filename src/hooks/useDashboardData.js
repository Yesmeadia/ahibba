// hooks/useDashboardData.js
import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const useDashboardData = () => {
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalAttendance: 0,
    day1Attendance: 0,
    day2Attendance: 0,
    totalFeedback: 0,
    averageRating: 0,
    feedbackByType: {
      general: 0,
      suggestion: 0,
      complaint: 0,
      appreciation: 0
    }
  });

  const [recentFeedback, setRecentFeedback] = useState([]);
  const [attendanceByZone, setAttendanceByZone] = useState([]);
  const [attendanceByDesignation, setAttendanceByDesignation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch registration data
      const regSnapshot = await getDocs(collection(db, 'registration'));
      const registrations = regSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate attendance stats
      let day1Count = 0;
      let day2Count = 0;
      const zoneAttendance = {};
      const designationAttendance = {};

      registrations.forEach(user => {
        if (user.day1Attendance) day1Count++;
        if (user.day2Attendance) day2Count++;

        if (user.zone) {
          zoneAttendance[user.zone] = (zoneAttendance[user.zone] || 0) + 1;
        }
        if (user.designation) {
          designationAttendance[user.designation] = (designationAttendance[user.designation] || 0) + 1;
        }
      });

      // Fetch feedback data
      const feedbackSnapshot = await getDocs(collection(db, 'feedback'));
      const feedbackList = feedbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate feedback stats
      let totalRating = 0;
      const feedbackByType = {
        general: 0,
        suggestion: 0,
        complaint: 0,
        appreciation: 0
      };

      feedbackList.forEach(fb => {
        if (fb.feedbackType && feedbackByType.hasOwnProperty(fb.feedbackType)) {
          feedbackByType[fb.feedbackType]++;
        }
        totalRating += fb.rating || 0;
      });

      const averageRating = feedbackList.length > 0 ? (totalRating / feedbackList.length).toFixed(2) : 0;

      // Sort feedback by date and get recent ones
      const sortedFeedback = feedbackList
        .sort((a, b) => {
          const dateA = a.submittedAt?.toDate?.() || new Date(0);
          const dateB = b.submittedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        })
        .slice(0, 5);

      // Convert zone and designation data to arrays for charts
      const zoneArray = Object.entries(zoneAttendance).map(([zone, count]) => ({
        name: zone || 'Unknown',
        value: count
      }));

      const designationArray = Object.entries(designationAttendance).map(([designation, count]) => ({
        name: designation || 'Unknown',
        value: count
      }));

      setStats({
        totalRegistered: registrations.length,
        totalAttendance: day1Count + day2Count,
        day1Attendance: day1Count,
        day2Attendance: day2Count,
        totalFeedback: feedbackList.length,
        averageRating: parseFloat(averageRating),
        feedbackByType
      });

      setRecentFeedback(sortedFeedback);
      setAttendanceByZone(zoneArray);
      setAttendanceByDesignation(designationArray);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getDayWiseStats = async () => {
    try {
      const regSnapshot = await getDocs(collection(db, 'registration'));
      const registrations = regSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let scheduleStats = {
        day1: { morning: 0, afternoon: 0, evening: 0 },
        day2: { morning: 0, afternoon: 0, evening: 0 }
      };

      registrations.forEach(user => {
        if (user.day1Attendance && user.day1Schedule) {
          scheduleStats.day1[user.day1Schedule]++;
        }
        if (user.day2Attendance && user.day2Schedule) {
          scheduleStats.day2[user.day2Schedule]++;
        }
      });

      return scheduleStats;
    } catch (err) {
      console.error('Error fetching day-wise stats:', err);
      return null;
    }
  };

  const getZoneReport = async () => {
    try {
      const regSnapshot = await getDocs(collection(db, 'registration'));
      const registrations = regSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const zoneReport = {};

      registrations.forEach(user => {
        if (!zoneReport[user.zone]) {
          zoneReport[user.zone] = {
            zone: user.zone,
            total: 0,
            day1Attended: 0,
            day2Attended: 0
          };
        }
        zoneReport[user.zone].total++;
        if (user.day1Attendance) zoneReport[user.zone].day1Attended++;
        if (user.day2Attendance) zoneReport[user.zone].day2Attended++;
      });

      return Object.values(zoneReport);
    } catch (err) {
      console.error('Error fetching zone report:', err);
      return null;
    }
  };

  const getFeedbackAnalytics = async () => {
    try {
      const feedbackSnapshot = await getDocs(collection(db, 'feedback'));
      const feedbackList = feedbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const zoneWiseFeedback = {};

      feedbackList.forEach(fb => {
        ratingDistribution[fb.rating]++;
        if (fb.zone) {
          zoneWiseFeedback[fb.zone] = (zoneWiseFeedback[fb.zone] || 0) + 1;
        }
      });

      return {
        ratingDistribution,
        zoneWiseFeedback,
        totalFeedback: feedbackList.length,
        feedbackList
      };
    } catch (err) {
      console.error('Error fetching feedback analytics:', err);
      return null;
    }
  };

  return {
    stats,
    recentFeedback,
    attendanceByZone,
    attendanceByDesignation,
    loading,
    error,
    refetch: fetchDashboardData,
    getDayWiseStats,
    getZoneReport,
    getFeedbackAnalytics
  };
};

// Export data formatting utilities
export const formatDashboardData = {
  formatNumber: (num) => {
    return num.toLocaleString('en-IN');
  },

  formatPercentage: (current, total) => {
    if (total === 0) return '0%';
    return ((current / total) * 100).toFixed(2) + '%';
  },

  formatDate: (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate?.();
    return d?.toLocaleDateString('en-IN') || 'N/A';
  },

  formatDateTime: (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate?.();
    return d?.toLocaleString('en-IN') || 'N/A';
  },

  getAttendancePercentage: (attendance, total) => {
    return total === 0 ? 0 : ((attendance / total) * 100).toFixed(2);
  }
};