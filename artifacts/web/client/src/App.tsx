import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ExplorePage from "./pages/ExplorePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import ChatPage from "./pages/ChatPage";
import AccountPage from "./pages/AccountPage";
import InboxPage from "./pages/InboxPage";
import ArticlesPage from "./pages/ArticlesPage";
import ArticlePage from "./pages/ArticlePage";
import ActivityPage from "./pages/ActivityPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminArticlesPage from "./pages/admin/AdminArticlesPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import MyListingsPage from "./pages/agent/MyListingsPage";
import CreateListingPage from "./pages/agent/CreateListingPage";
import AgentAccountPage from "./pages/agent/AgentAccountPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (no sidebar) */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />

        {/* Protected routes (with sidebar) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:inquiryId" element={<ChatPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/notifications" element={<InboxPage />} />
          <Route path="/news" element={<ArticlesPage />} />
          <Route path="/news/:slug" element={<ArticlePage />} />

          {/* Agent routes */}
          <Route path="/my-listings" element={<MyListingsPage />} />
          <Route path="/my-listings/new" element={<CreateListingPage />} />
          <Route path="/my-listings/:id/edit" element={<CreateListingPage />} />
          <Route path="/my-plan" element={<AgentAccountPage />} />

          {/* Admin routes */}
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/articles" element={<AdminArticlesPage />} />
          <Route path="/admin/plans/:userId" element={<AdminPlansPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
