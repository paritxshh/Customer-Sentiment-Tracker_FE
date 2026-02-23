import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PriorityQueue from './pages/PriorityQueue';
import Feedback from './pages/Feedback';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/priority" element={<PriorityQueue />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
      </Route>
    </Routes>
  );
}
