import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("refresh_token")
      if (refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken })
          localStorage.setItem("access_token", res.data.access_token)
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(error.config)
        } catch {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          window.location.href = "/login"
        }
      } else {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post("/auth/login", { email, password }),
  refresh: (refresh_token: string) => api.post("/auth/refresh", { refresh_token }),
  me: () => api.get("/auth/me"),
}

// Users
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get("/users", { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post("/users", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
}

// Roles
export const rolesApi = {
  list: () => api.get("/roles"),
  create: (data: Record<string, unknown>) => api.post("/roles", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
}

// Clients
export const clientsApi = {
  list: (params?: Record<string, unknown>) => api.get("/clients", { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: Record<string, unknown>) => api.post("/clients", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
  addContact: (id: string, data: Record<string, unknown>) => api.post(`/clients/${id}/contacts`, data),
  removeContact: (clientId: string, contactId: string) => api.delete(`/clients/${clientId}/contacts/${contactId}`),
}

// Suppliers
export const suppliersApi = {
  list: (params?: Record<string, unknown>) => api.get("/suppliers", { params }),
  get: (id: string) => api.get(`/suppliers/${id}`),
  create: (data: Record<string, unknown>) => api.post("/suppliers", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
}

// Projects
export const projectsApi = {
  list: (params?: Record<string, unknown>) => api.get("/projects", { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

// Leads
export const leadsApi = {
  list: (params?: Record<string, unknown>) => api.get("/leads", { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post("/leads", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  addInteraction: (id: string, data: Record<string, unknown>) => api.post(`/leads/${id}/interactions`, data),
  convert: (id: string) => api.post(`/leads/${id}/convert`),
}

// Proposals
export const proposalsApi = {
  list: (params?: Record<string, unknown>) => api.get("/proposals", { params }),
  get: (id: string) => api.get(`/proposals/${id}`),
  create: (data: Record<string, unknown>) => api.post("/proposals", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/proposals/${id}`, data),
  delete: (id: string) => api.delete(`/proposals/${id}`),
  addItem: (id: string, data: Record<string, unknown>) => api.post(`/proposals/${id}/items`, data),
  updateItem: (proposalId: string, itemId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/items/${itemId}`, data),
  deleteItem: (proposalId: string, itemId: string) => api.delete(`/proposals/${proposalId}/items/${itemId}`),
  createVersion: (id: string, data?: Record<string, unknown>) => api.post(`/proposals/${id}/versions`, data),
  approve: (id: string) => api.post(`/proposals/${id}/approve`),
  generateContract: (id: string, data: Record<string, unknown>) => api.post(`/proposals/${id}/generate-contract`, data),
}

// Contracts
export const contractsApi = {
  list: (params?: Record<string, unknown>) => api.get("/contracts", { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
  create: (data: Record<string, unknown>) => api.post("/contracts", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/contracts/${id}`, data),
  delete: (id: string) => api.delete(`/contracts/${id}`),
  addInstallment: (id: string, data: Record<string, unknown>) => api.post(`/contracts/${id}/installments`, data),
  updateInstallment: (contractId: string, installmentId: string, data: Record<string, unknown>) => api.put(`/contracts/${contractId}/installments/${installmentId}`, data),
  generateProject: (id: string, data: Record<string, unknown>) => api.post(`/contracts/${id}/generate-project`, data),
  generateInstallments: (id: string, numInstallments: number) => api.post(`/contracts/${id}/generate-installments?num_installments=${numInstallments}`),
}

// Planning
export const planningApi = {
  getPhases: (projectId: string) => api.get(`/planning/projects/${projectId}/phases`),
  createPhase: (data: Record<string, unknown>) => api.post("/planning/phases", data),
  updatePhase: (id: string, data: Record<string, unknown>) => api.put(`/planning/phases/${id}`, data),
  deletePhase: (id: string) => api.delete(`/planning/phases/${id}`),
  createTask: (phaseId: string, data: Record<string, unknown>) => api.post(`/planning/phases/${phaseId}/tasks`, data),
  updateTask: (id: string, data: Record<string, unknown>) => api.put(`/planning/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/planning/tasks/${id}`),
  getGantt: (projectId: string) => api.get(`/planning/projects/${projectId}/gantt`),
}

// Purchases
export const purchasesApi = {
  listRequests: (params?: Record<string, unknown>) => api.get("/purchases/requests", { params }),
  createRequest: (data: Record<string, unknown>) => api.post("/purchases/requests", data),
  updateRequest: (id: string, data: Record<string, unknown>) => api.put(`/purchases/requests/${id}`, data),
  deleteRequest: (id: string) => api.delete(`/purchases/requests/${id}`),
  createQuotation: (data: Record<string, unknown>) => api.post("/purchases/quotations", data),
  listQuotations: (requestId: string) => api.get(`/purchases/requests/${requestId}/quotations`),
  createOrder: (data: Record<string, unknown>) => api.post("/purchases/orders", data),
  listOrders: (params?: Record<string, unknown>) => api.get("/purchases/orders", { params }),
  updateOrder: (id: string, data: Record<string, unknown>) => api.put(`/purchases/orders/${id}`, data),
}

// Diary
export const diaryApi = {
  list: (params?: Record<string, unknown>) => api.get("/diary", { params }),
  get: (id: string) => api.get(`/diary/${id}`),
  create: (data: Record<string, unknown>) => api.post("/diary", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/diary/${id}`, data),
  delete: (id: string) => api.delete(`/diary/${id}`),
  uploadPhoto: (id: string, formData: FormData) => api.post(`/diary/${id}/photos`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
}

// Financial
export const financialApi = {
  listEntries: (params?: Record<string, unknown>) => api.get("/financial/entries", { params }),
  createEntry: (data: Record<string, unknown>) => api.post("/financial/entries", data),
  updateEntry: (id: string, data: Record<string, unknown>) => api.put(`/financial/entries/${id}`, data),
  deleteEntry: (id: string) => api.delete(`/financial/entries/${id}`),
  getSummary: (params?: Record<string, unknown>) => api.get("/financial/summary", { params }),
  createBilling: (data: Record<string, unknown>) => api.post("/financial/billing", data),
  listBilling: (installmentId: string) => api.get(`/financial/billing/${installmentId}`),
  listOverdue: (params?: Record<string, unknown>) => api.get("/financial/overdue-installments", { params }),
}

// Documents
export const documentsApi = {
  list: (params?: Record<string, unknown>) => api.get("/documents", { params }),
  get: (id: string) => api.get(`/documents/${id}`),
  upload: (formData: FormData) => api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  delete: (id: string) => api.delete(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: "blob" }),
}

// Budget / Orcamento
export const budgetApi = {
  // Proposal Header
  getHeader: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/header`),
  updateHeader: (proposalId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/budget/header`, data),

  // Materials
  listMaterials: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/materials`),
  addMaterial: (proposalId: string, data: Record<string, unknown>) => api.post(`/proposals/${proposalId}/budget/materials`, data),
  updateMaterial: (proposalId: string, itemId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/budget/materials/${itemId}`, data),
  deleteMaterial: (proposalId: string, itemId: string) => api.delete(`/proposals/${proposalId}/budget/materials/${itemId}`),

  // Services
  listServices: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/services`),
  addService: (proposalId: string, data: Record<string, unknown>) => api.post(`/proposals/${proposalId}/budget/services`, data),
  updateService: (proposalId: string, itemId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/budget/services/${itemId}`, data),
  deleteService: (proposalId: string, itemId: string) => api.delete(`/proposals/${proposalId}/budget/services/${itemId}`),

  // Additives
  listAdditives: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/additives`),
  addAdditive: (proposalId: string, data: Record<string, unknown>) => api.post(`/proposals/${proposalId}/budget/additives`, data),
  updateAdditive: (proposalId: string, itemId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/budget/additives/${itemId}`, data),
  deleteAdditive: (proposalId: string, itemId: string) => api.delete(`/proposals/${proposalId}/budget/additives/${itemId}`),

  // Rooms
  listRooms: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/rooms`),
  addRoom: (proposalId: string, data: Record<string, unknown>) => api.post(`/proposals/${proposalId}/budget/rooms`, data),
  updateRoom: (proposalId: string, roomId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/budget/rooms/${roomId}`, data),
  deleteRoom: (proposalId: string, roomId: string) => api.delete(`/proposals/${proposalId}/budget/rooms/${roomId}`),

  // Commercial Terms
  getCommercialTerms: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/commercial-terms`),
  updateCommercialTerms: (proposalId: string, data: Record<string, unknown>) => api.put(`/proposals/${proposalId}/budget/commercial-terms`, data),

  // Summary
  getSummary: (proposalId: string) => api.get(`/proposals/${proposalId}/budget/summary`),
}

// Catalogs
export const catalogApi = {
  // Service Catalog
  listServices: (params?: Record<string, unknown>) => api.get("/catalog/services", { params }),
  getService: (id: string) => api.get(`/catalog/services/${id}`),
  createService: (data: Record<string, unknown>) => api.post("/catalog/services", data),
  updateService: (id: string, data: Record<string, unknown>) => api.put(`/catalog/services/${id}`, data),
  deleteService: (id: string) => api.delete(`/catalog/services/${id}`),

  // Material Catalog
  listMaterials: (params?: Record<string, unknown>) => api.get("/catalog/materials", { params }),
  getMaterial: (id: string) => api.get(`/catalog/materials/${id}`),
  createMaterial: (data: Record<string, unknown>) => api.post("/catalog/materials", data),
  updateMaterial: (id: string, data: Record<string, unknown>) => api.put(`/catalog/materials/${id}`, data),
  deleteMaterial: (id: string) => api.delete(`/catalog/materials/${id}`),

  // Composition Catalog
  listCompositions: (params?: Record<string, unknown>) => api.get("/catalog/compositions", { params }),
  createComposition: (data: Record<string, unknown>) => api.post("/catalog/compositions", data),
  deleteComposition: (id: string) => api.delete(`/catalog/compositions/${id}`),
}

// Dashboard
export const dashboardApi = {
  executive: () => api.get("/dashboard/executive"),
  operational: () => api.get("/dashboard/operational"),
  byProject: (projectId: string) => api.get(`/dashboard/by-project/${projectId}`),
  byClient: (clientId: string) => api.get(`/dashboard/by-client/${clientId}`),
  pieCharts: () => api.get("/dashboard/charts/pie"),
}

// Closing
export const closingApi = {
  getChecklist: (projectId: string) => api.get(`/closing/projects/${projectId}`),
  updateChecklist: (projectId: string, data: Record<string, unknown>) => api.put(`/closing/projects/${projectId}`, data),
  closeProject: (projectId: string) => api.post(`/closing/projects/${projectId}/close`),
}

// Contract Templates
export const contractTemplatesApi = {
  list: (params?: Record<string, unknown>) => api.get("/contract-templates", { params }),
  get: (id: string) => api.get(`/contract-templates/${id}`),
  create: (data: Record<string, unknown>) => api.post("/contract-templates", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/contract-templates/${id}`, data),
  delete: (id: string) => api.delete(`/contract-templates/${id}`),
  generate: (data: Record<string, unknown>) => api.post("/contract-templates/generate", data),
}

// Measurements
export const measurementsApi = {
  list: (projectId: string) => api.get(`/measurements/projects/${projectId}`),
  create: (data: Record<string, unknown>) => api.post("/measurements", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/measurements/${id}`, data),
  delete: (id: string) => api.delete(`/measurements/${id}`),
}

// SINAPI
export const sinapiApi = {
  listSources: () => api.get("/sinapi/sources"),
  createSource: (data: Record<string, unknown>) => api.post("/sinapi/sources", data),
  deleteSource: (id: string) => api.delete(`/sinapi/sources/${id}`),
  importCsv: (sourceId: string, formData: FormData) => api.post(`/sinapi/sources/${sourceId}/import`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  searchItems: (params?: Record<string, unknown>) => api.get("/sinapi/items", { params }),
}

// Purchase Receipts
export const purchaseReceiptsApi = {
  list: (orderId: string) => api.get(`/purchase-receipts/orders/${orderId}`),
  create: (data: Record<string, unknown>) => api.post("/purchase-receipts", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/purchase-receipts/${id}`, data),
  delete: (id: string) => api.delete(`/purchase-receipts/${id}`),
}

// Client Bank Data
export const clientBankDataApi = {
  list: (clientId: string) => api.get(`/clients/${clientId}/bank-data`),
  create: (clientId: string, data: Record<string, unknown>) => api.post(`/clients/${clientId}/bank-data`, data),
  delete: (clientId: string, bankId: string) => api.delete(`/clients/${clientId}/bank-data/${bankId}`),
}
