import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ActivityDetail from './pages/ActivityDetail';
import Announcements from './pages/Announcements';
import Calendar from './pages/Calendar';
import ComingSoon from './pages/ComingSoon';
import Confirmed from './pages/Confirmed';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import Login from './pages/Login';
import Manage from './pages/Manage';
import MyActivities from './pages/MyActivities';
import Portfolio from './pages/Portfolio';
import Principal from './pages/Principal';
import Scanner from './pages/Scanner';
import Studio from './pages/Studio';
import Users from './pages/Users';

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="discover" element={<Discover />} />
        <Route path="activity/:slug" element={<ActivityDetail />} />
        <Route path="activity/:slug/confirmed" element={<Confirmed />} />
        <Route path="my-activities" element={<MyActivities />} />
        <Route path="manage" element={<Manage />} />
        <Route path="studio" element={<Studio />} />
        <Route path="principal" element={<Principal />} />
        <Route path="users" element={<Users />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Route>
    </Routes>
  );
}
