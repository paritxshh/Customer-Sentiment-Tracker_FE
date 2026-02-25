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
        </Route>
      </Routes>
    </AuthProvider>
  );
}
