import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/components/ui/toast"
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
import CadastrosPage from "@/pages/CadastrosPage"
import SlabCalculationPage from "@/pages/SlabCalculationPage"
import LeadDetailPage from "@/pages/details/LeadDetailPage"
import ClientDetailPage from "@/pages/details/ClientDetailPage"
import ProposalDetailPage from "@/pages/details/ProposalDetailPage"
import ContractDetailPage from "@/pages/details/ContractDetailPage"
import ProjectDetailPage from "@/pages/details/ProjectDetailPage"
import SupplierDetailPage from "@/pages/details/SupplierDetailPage"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/proposals/:id" element={<ProposalDetailPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/contracts/:id" element={<ContractDetailPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/diary" element={<DiaryPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/cadastros" element={<CadastrosPage />} />
              <Route path="/calculo-lajes" element={<SlabCalculationPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
