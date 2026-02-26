import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PriorityQueue from './pages/PriorityQueue';
import Feedback from './pages/Feedback';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import VoiceBot from './pages/VoiceBot';
import CallLog from './pages/CallLog';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/priority" element={<PriorityQueue />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/voice-bot" element={<VoiceBot />} />
          <Route path="/voice-bot/:id" element={<VoiceBot />} />
          <Route path="/call-log" element={<CallLog />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
