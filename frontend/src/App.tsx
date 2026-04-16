import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/AuthContext"
import { AppLayout } from "@/components/layout/AppLayout"
import LoginPage from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"
import ClientsPage from "@/pages/ClientsPage"
import LeadsPage from "@/pages/LeadsPage"
import SuppliersPage from "@/pages/SuppliersPage"
import ProjectsPage from "@/pages/ProjectsPage"
import ProposalsPage from "@/pages/ProposalsPage"
import ContractsPage from "@/pages/ContractsPage"
import PlanningPage from "@/pages/PlanningPage"
import PurchasesPage from "@/pages/PurchasesPage"
import DiaryPage from "@/pages/DiaryPage"
import FinancialPage from "@/pages/FinancialPage"
import DocumentsPage from "@/pages/DocumentsPage"
import UsersPage from "@/pages/UsersPage"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/diary" element={<DiaryPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
