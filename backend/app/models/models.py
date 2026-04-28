from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, ForeignKey, Numeric, Date, Table
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin, generate_uuid
import enum


# ==================== ENUMS ====================

class PersonType(str, enum.Enum):
    FISICA = "fisica"
    JURIDICA = "juridica"


class ProjectType(str, enum.Enum):
    REFORMA_RESIDENCIAL = "reforma_residencial"
    REFORMA_COMERCIAL = "reforma_comercial"
    CONSTRUCAO = "construcao"
    GESTAO = "gestao"
    PLANEJAMENTO = "planejamento"
    COMPATIBILIZACAO = "compatibilizacao"


class ProjectStatus(str, enum.Enum):
    RASCUNHO = "rascunho"
    PLANEJAMENTO = "planejamento"
    EM_ANDAMENTO = "em_andamento"
    PAUSADA = "pausada"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"
    ENCERRADA = "encerrada"


class LeadStatus(str, enum.Enum):
    NOVO = "novo"
    EM_CONTATO = "em_contato"
    REUNIAO_AGENDADA = "reuniao_agendada"
    VISITA_TECNICA = "visita_tecnica"
    PROPOSTA_ELABORACAO = "proposta_elaboracao"
    PROPOSTA_ENVIADA = "proposta_enviada"
    EM_NEGOCIACAO = "em_negociacao"
    FECHADO_GANHO = "fechado_ganho"
    FECHADO_PERDIDO = "fechado_perdido"


class ProposalStatus(str, enum.Enum):
    RASCUNHO = "rascunho"
    EM_REVISAO = "em_revisao"
    APROVADA_INTERNA = "aprovada_interna"
    ENVIADA = "enviada"
    EM_NEGOCIACAO = "em_negociacao"
    APROVADA = "aprovada"
    REJEITADA = "rejeitada"


class ContractStatus(str, enum.Enum):
    RASCUNHO = "rascunho"
    AGUARDANDO_ASSINATURA = "aguardando_assinatura"
    ATIVO = "ativo"
    SUSPENSO = "suspenso"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class InstallmentStatus(str, enum.Enum):
    PENDENTE = "pendente"
    FATURADA = "faturada"
    PAGA = "paga"
    ATRASADA = "atrasada"
    CANCELADA = "cancelada"


class TaskStatus(str, enum.Enum):
    NAO_INICIADA = "nao_iniciada"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    ATRASADA = "atrasada"
    PAUSADA = "pausada"
    CANCELADA = "cancelada"


class PurchaseRequestStatus(str, enum.Enum):
    RASCUNHO = "rascunho"
    AGUARDANDO_APROVACAO = "aguardando_aprovacao"
    APROVADA = "aprovada"
    REJEITADA = "rejeitada"
    EM_COTACAO = "em_cotacao"
    PEDIDO_EMITIDO = "pedido_emitido"
    RECEBIDA = "recebida"
    CANCELADA = "cancelada"


class PurchaseOrderStatus(str, enum.Enum):
    EMITIDO = "emitido"
    ENVIADO = "enviado"
    CONFIRMADO = "confirmado"
    EM_TRANSITO = "em_transito"
    ENTREGUE_PARCIAL = "entregue_parcial"
    ENTREGUE = "entregue"
    CANCELADO = "cancelado"


class FinancialEntryType(str, enum.Enum):
    RECEITA = "receita"
    DESPESA = "despesa"


class FinancialStatus(str, enum.Enum):
    PENDENTE = "pendente"
    PAGO = "pago"
    ATRASADO = "atrasado"
    CANCELADO = "cancelado"
    PARCIAL = "parcial"


class DocumentCategory(str, enum.Enum):
    CONTRATO = "contrato"
    PROJETO = "projeto"
    MEMORIAL = "memorial"
    NOTA_FISCAL = "nota_fiscal"
    LAUDO = "laudo"
    RELATORIO = "relatorio"
    ART_RRT = "art_rrt"
    FOTO = "foto"
    TERMO_FINAL = "termo_final"
    OUTRO = "outro"


class CollectionStatus(str, enum.Enum):
    PENDENTE = "pendente"
    EM_COBRANCA = "em_cobranca"
    PAGO = "pago"
    NEGOCIADO = "negociado"
    INADIMPLENTE = "inadimplente"


# ==================== ASSOCIATION TABLES ====================

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=False), ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", UUID(as_uuid=False), ForeignKey("permissions.id"), primary_key=True),
)


# ==================== MODELS ====================

class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    role_id = Column(UUID(as_uuid=False), ForeignKey("roles.id"), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    role = relationship("Role", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=False)

    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    module = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class Client(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    person_type = Column(String(20), nullable=False, default="fisica")
    name = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    cpf_cnpj = Column(String(20), unique=True, nullable=True, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    phone2 = Column(String(20), nullable=True)
    address_street = Column(String(255), nullable=True)
    address_number = Column(String(20), nullable=True)
    address_complement = Column(String(100), nullable=True)
    address_neighborhood = Column(String(100), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(2), nullable=True)
    address_zip = Column(String(10), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="client")
    leads = relationship("Lead", back_populates="client")
    contracts = relationship("Contract", back_populates="client")


class ClientContact(Base, TimestampMixin):
    __tablename__ = "client_contacts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    is_primary = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    client = relationship("Client", back_populates="contacts")


class Lead(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    company = Column(String(255), nullable=True)
    source = Column(String(100), nullable=True)  # indicacao, site, instagram, etc
    status = Column(String(50), nullable=False, default="novo")
    responsible_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=True)
    notes = Column(Text, nullable=True)
    lost_reason = Column(Text, nullable=True)
    next_followup = Column(DateTime(timezone=True), nullable=True)
    converted_at = Column(DateTime(timezone=True), nullable=True)
    # Address fields
    address_street = Column(String(255), nullable=True)
    address_number = Column(String(20), nullable=True)
    address_complement = Column(String(100), nullable=True)
    address_neighborhood = Column(String(100), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(2), nullable=True)
    address_zip = Column(String(10), nullable=True)

    responsible = relationship("User", foreign_keys=[responsible_id])
    client = relationship("Client", back_populates="leads")
    interactions = relationship("LeadInteraction", back_populates="lead", cascade="all, delete-orphan")


class LeadInteraction(Base, TimestampMixin):
    __tablename__ = "lead_interactions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    lead_id = Column(UUID(as_uuid=False), ForeignKey("leads.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    type = Column(String(50), nullable=False)  # ligacao, email, reuniao, visita, whatsapp
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)

    lead = relationship("Lead", back_populates="interactions")
    user = relationship("User", foreign_keys=[user_id])


class Supplier(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    cpf_cnpj = Column(String(20), nullable=True, index=True)
    inscricao_estadual = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    phone2 = Column(String(20), nullable=True)
    contact_name = Column(String(255), nullable=True)
    specialty = Column(String(255), nullable=True)
    billing_type = Column(String(100), nullable=True)  # pf, pj, mei
    average_deadline_days = Column(Integer, nullable=True)
    address_street = Column(String(255), nullable=True)
    address_number = Column(String(20), nullable=True)
    address_complement = Column(String(100), nullable=True)
    address_neighborhood = Column(String(100), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(2), nullable=True)
    address_zip = Column(String(10), nullable=True)
    region = Column(String(100), nullable=True)
    # Bank data
    bank_name = Column(String(100), nullable=True)
    bank_agency = Column(String(20), nullable=True)
    bank_account = Column(String(30), nullable=True)
    bank_account_type = Column(String(20), nullable=True)  # corrente, poupanca
    pix_key = Column(String(255), nullable=True)
    pix_key_type = Column(String(20), nullable=True)  # cpf, cnpj, email, telefone, aleatoria
    bank_holder_name = Column(String(255), nullable=True)
    bank_holder_cpf_cnpj = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)


class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=True)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    type = Column(String(50), nullable=False, default="reforma_residencial")
    status = Column(String(50), nullable=False, default="rascunho")
    description = Column(Text, nullable=True)
    address_street = Column(String(255), nullable=True)
    address_number = Column(String(20), nullable=True)
    address_complement = Column(String(100), nullable=True)
    address_neighborhood = Column(String(100), nullable=True)
    address_city = Column(String(100), nullable=True)
    address_state = Column(String(2), nullable=True)
    address_zip = Column(String(10), nullable=True)
    area_m2 = Column(Numeric(10, 2), nullable=True)
    planned_start = Column(Date, nullable=True)
    planned_end = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_end = Column(Date, nullable=True)
    responsible_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    contract_id = Column(UUID(as_uuid=False), ForeignKey("contracts.id", use_alter=True, name="fk_projects_contract_id"), nullable=True)
    estimated_value = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)

    client = relationship("Client", back_populates="projects")
    responsible = relationship("User", foreign_keys=[responsible_id])
    contract = relationship("Contract", foreign_keys=[contract_id], back_populates="project")
    phases = relationship("WorkPhase", back_populates="project", cascade="all, delete-orphan")
    work_diaries = relationship("WorkDiary", back_populates="project", cascade="all, delete-orphan")
    purchase_requests = relationship("PurchaseRequest", back_populates="project")
    financial_entries = relationship("FinancialEntry", back_populates="project")
    documents = relationship("Document", back_populates="project")
    closing_checklist = relationship("ClosingChecklist", back_populates="project", uselist=False)


class Proposal(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "proposals"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=True)
    lead_id = Column(UUID(as_uuid=False), ForeignKey("leads.id"), nullable=True)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=True)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id", use_alter=True, name="fk_proposals_project_id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="rascunho")
    total_cost = Column(Numeric(14, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    markup_percent = Column(Numeric(5, 2), nullable=True)
    discount = Column(Numeric(14, 2), default=0)
    valid_until = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    lead = relationship("Lead", foreign_keys=[lead_id])
    client = relationship("Client", foreign_keys=[client_id])
    versions = relationship("ProposalVersion", back_populates="proposal", cascade="all, delete-orphan")
    items = relationship("ProposalItem", back_populates="proposal", cascade="all, delete-orphan")


class ProposalVersion(Base, TimestampMixin):
    __tablename__ = "proposal_versions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    data_snapshot = Column(Text, nullable=True)  # JSON snapshot of the proposal at this version
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    proposal = relationship("Proposal", back_populates="versions")


class ProposalItem(Base, TimestampMixin):
    __tablename__ = "proposal_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False)
    category = Column(String(100), nullable=True)  # ambiente/comodo ou etapa
    subcategory = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    item_type = Column(String(20), nullable=False, default="servico")  # servico, material
    unit = Column(String(20), nullable=True)  # m2, m, un, vb, etc
    quantity = Column(Numeric(12, 4), nullable=False, default=1)
    unit_cost = Column(Numeric(12, 2), nullable=False, default=0)
    markup_percent = Column(Numeric(5, 2), nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    total_cost = Column(Numeric(14, 2), nullable=False, default=0)
    total_price = Column(Numeric(14, 2), nullable=False, default=0)
    is_optional = Column(Boolean, default=False)
    is_excluded = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    proposal = relationship("Proposal", back_populates="items")


class Contract(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=True)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=True)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scope_summary = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="rascunho")
    total_value = Column(Numeric(14, 2), nullable=False, default=0)
    payment_conditions = Column(Text, nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    proposal = relationship("Proposal", foreign_keys=[proposal_id])
    client = relationship("Client", back_populates="contracts")
    project = relationship("Project", back_populates="contract", uselist=False)
    installments = relationship("ContractInstallment", back_populates="contract", cascade="all, delete-orphan")


class ContractInstallment(Base, TimestampMixin):
    __tablename__ = "contract_installments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    contract_id = Column(UUID(as_uuid=False), ForeignKey("contracts.id"), nullable=False)
    installment_number = Column(Integer, nullable=False)
    description = Column(String(255), nullable=True)
    due_date = Column(Date, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    status = Column(String(50), nullable=False, default="pendente")
    paid_at = Column(DateTime(timezone=True), nullable=True)
    paid_amount = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)

    contract = relationship("Contract", back_populates="installments")
    billing_records = relationship("BillingRecord", back_populates="installment")


class WorkPhase(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "work_phases"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    planned_start = Column(Date, nullable=True)
    planned_end = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_end = Column(Date, nullable=True)
    progress_percent = Column(Integer, default=0)
    status = Column(String(50), nullable=False, default="nao_iniciada")

    project = relationship("Project", back_populates="phases")
    tasks = relationship("WorkTask", back_populates="phase", cascade="all, delete-orphan")


class WorkTask(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "work_tasks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    phase_id = Column(UUID(as_uuid=False), ForeignKey("work_phases.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    responsible_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    planned_start = Column(Date, nullable=True)
    planned_end = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_end = Column(Date, nullable=True)
    progress_percent = Column(Integer, default=0)
    status = Column(String(50), nullable=False, default="nao_iniciada")
    sort_order = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    phase = relationship("WorkPhase", back_populates="tasks")
    responsible = relationship("User", foreign_keys=[responsible_id])
    dependencies = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        cascade="all, delete-orphan"
    )


class TaskDependency(Base, TimestampMixin):
    __tablename__ = "task_dependencies"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("work_tasks.id"), nullable=False)
    depends_on_id = Column(UUID(as_uuid=False), ForeignKey("work_tasks.id"), nullable=False)
    dependency_type = Column(String(20), default="finish_to_start")

    task = relationship("WorkTask", foreign_keys=[task_id], back_populates="dependencies")
    depends_on = relationship("WorkTask", foreign_keys=[depends_on_id])


class WorkDiary(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "work_diaries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    date = Column(Date, nullable=False)
    weather = Column(String(50), nullable=True)
    team_present = Column(Text, nullable=True)
    activities = Column(Text, nullable=True)
    materials_received = Column(Text, nullable=True)
    issues = Column(Text, nullable=True)
    occurrences = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="work_diaries")
    photos = relationship("DiaryPhoto", back_populates="diary", cascade="all, delete-orphan")
    created_by_user = relationship("User", foreign_keys=[created_by])


class DiaryPhoto(Base, TimestampMixin):
    __tablename__ = "diary_photos"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    diary_id = Column(UUID(as_uuid=False), ForeignKey("work_diaries.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    diary = relationship("WorkDiary", back_populates="photos")


class PurchaseRequest(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "purchase_requests"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=True)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    phase_id = Column(UUID(as_uuid=False), ForeignKey("work_phases.id"), nullable=True)
    status = Column(String(50), nullable=False, default="rascunho")
    description = Column(Text, nullable=True)
    needed_by = Column(Date, nullable=True)
    approved_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    project = relationship("Project", back_populates="purchase_requests")
    items = relationship("PurchaseRequestItem", back_populates="request", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="purchase_request")
    orders = relationship("PurchaseOrder", back_populates="purchase_request")


class PurchaseRequestItem(Base, TimestampMixin):
    __tablename__ = "purchase_request_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    request_id = Column(UUID(as_uuid=False), ForeignKey("purchase_requests.id"), nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(12, 4), nullable=False, default=1)
    unit = Column(String(20), nullable=True)
    estimated_cost = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)

    request = relationship("PurchaseRequest", back_populates="items")


class Quotation(Base, TimestampMixin):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    purchase_request_id = Column(UUID(as_uuid=False), ForeignKey("purchase_requests.id"), nullable=False)
    supplier_id = Column(UUID(as_uuid=False), ForeignKey("suppliers.id"), nullable=False)
    total_value = Column(Numeric(14, 2), nullable=True)
    delivery_days = Column(Integer, nullable=True)
    payment_conditions = Column(Text, nullable=True)
    is_selected = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    quoted_at = Column(DateTime(timezone=True), nullable=True)

    purchase_request = relationship("PurchaseRequest", back_populates="quotations")
    supplier = relationship("Supplier", foreign_keys=[supplier_id])


class PurchaseOrder(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=True)
    purchase_request_id = Column(UUID(as_uuid=False), ForeignKey("purchase_requests.id"), nullable=True)
    supplier_id = Column(UUID(as_uuid=False), ForeignKey("suppliers.id"), nullable=False)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=True)
    status = Column(String(50), nullable=False, default="emitido")
    total_value = Column(Numeric(14, 2), nullable=False, default=0)
    delivery_date = Column(Date, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    purchase_request = relationship("PurchaseRequest", back_populates="orders")
    supplier = relationship("Supplier", foreign_keys=[supplier_id])
    items = relationship("PurchaseOrderItem", back_populates="order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base, TimestampMixin):
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    order_id = Column(UUID(as_uuid=False), ForeignKey("purchase_orders.id"), nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(12, 4), nullable=False, default=1)
    unit = Column(String(20), nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    total_price = Column(Numeric(14, 2), nullable=False, default=0)

    order = relationship("PurchaseOrder", back_populates="items")


class Measurement(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "measurements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    phase_id = Column(UUID(as_uuid=False), ForeignKey("work_phases.id"), nullable=True)
    task_id = Column(UUID(as_uuid=False), ForeignKey("work_tasks.id"), nullable=True)
    measurement_number = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    percent_complete = Column(Numeric(5, 2), nullable=True)
    measured_value = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)


class ChangeOrder(Base, TimestampMixin):
    __tablename__ = "change_orders"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=False), ForeignKey("contracts.id"), nullable=True)
    description = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    value_impact = Column(Numeric(14, 2), nullable=True)
    schedule_impact_days = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="pendente")
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)


class FinancialEntry(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "financial_entries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=True)
    type = Column(String(20), nullable=False)  # receita/despesa
    category = Column(String(100), nullable=True)
    cost_center = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    planned_amount = Column(Numeric(14, 2), nullable=True)
    actual_amount = Column(Numeric(14, 2), nullable=True)
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="pendente")
    supplier_id = Column(UUID(as_uuid=False), ForeignKey("suppliers.id"), nullable=True)
    contract_installment_id = Column(UUID(as_uuid=False), ForeignKey("contract_installments.id"), nullable=True)
    purchase_order_id = Column(UUID(as_uuid=False), ForeignKey("purchase_orders.id"), nullable=True)
    proof_document = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="financial_entries")
    supplier = relationship("Supplier", foreign_keys=[supplier_id])


class BillingRecord(Base, TimestampMixin):
    __tablename__ = "billing_records"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    installment_id = Column(UUID(as_uuid=False), ForeignKey("contract_installments.id"), nullable=False)
    action_date = Column(DateTime(timezone=True), nullable=False)
    action_type = Column(String(50), nullable=False)  # envio, lembrete, cobranca, negociacao
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="pendente")
    next_action_date = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    installment = relationship("ContractInstallment", back_populates="billing_records")


class Document(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=True)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=True)
    contract_id = Column(UUID(as_uuid=False), ForeignKey("contracts.id"), nullable=True)
    category = Column(String(50), nullable=False, default="outro")
    title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    version = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    uploaded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="documents")


class ClosingChecklist(Base, TimestampMixin):
    __tablename__ = "closing_checklists"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False, unique=True)
    items = Column(Text, nullable=True)  # JSON list of checklist items with status
    delivery_term_signed = Column(Boolean, default=False)
    final_docs_delivered = Column(Boolean, default=False)
    final_report_generated = Column(Boolean, default=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)

    project = relationship("Project", back_populates="closing_checklist")


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(50), nullable=True)
    old_values = Column(Text, nullable=True)  # JSON
    new_values = Column(Text, nullable=True)  # JSON
    ip_address = Column(String(45), nullable=True)

    user = relationship("User", back_populates="audit_logs")


# ==================== BUDGET / ORCAMENTO MODULE ====================

class ServiceCatalog(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "service_catalog"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), nullable=True, index=True)
    stage = Column(String(100), nullable=True)  # etapa
    sub_stage = Column(String(100), nullable=True)  # subetapa
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)  # m2, m, un, vb
    default_cost = Column(Numeric(12, 2), nullable=True)
    default_price = Column(Numeric(12, 2), nullable=True)
    price_origin = Column(String(100), nullable=True)  # manual, sinapi, cotacao
    sinapi_ref = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class MaterialCatalog(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "material_catalog"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    code = Column(String(50), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    unit = Column(String(20), nullable=True)
    default_cost = Column(Numeric(12, 2), nullable=True)
    default_price = Column(Numeric(12, 2), nullable=True)
    preferred_supplier_id = Column(UUID(as_uuid=False), ForeignKey("suppliers.id"), nullable=True)
    cost_center = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    preferred_supplier = relationship("Supplier", foreign_keys=[preferred_supplier_id])


class CompositionCatalog(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "composition_catalog"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    unit = Column(String(20), nullable=True)
    total_cost = Column(Numeric(14, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    items = relationship("CompositionItem", back_populates="composition", cascade="all, delete-orphan")


class CompositionItem(Base, TimestampMixin):
    __tablename__ = "composition_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    composition_id = Column(UUID(as_uuid=False), ForeignKey("composition_catalog.id"), nullable=False)
    item_type = Column(String(20), nullable=False)  # material, servico
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)
    coefficient = Column(Numeric(12, 4), default=1)
    unit_cost = Column(Numeric(12, 2), default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total_cost = Column(Numeric(14, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    service_catalog_id = Column(UUID(as_uuid=False), ForeignKey("service_catalog.id"), nullable=True)
    material_catalog_id = Column(UUID(as_uuid=False), ForeignKey("material_catalog.id"), nullable=True)

    composition = relationship("CompositionCatalog", back_populates="items")


class ProposalHeader(Base, TimestampMixin):
    __tablename__ = "proposal_headers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False, unique=True)
    address = Column(Text, nullable=True)
    responsible = Column(String(255), nullable=True)
    architect = Column(String(255), nullable=True)
    payment_method = Column(String(255), nullable=True)
    deadline = Column(String(255), nullable=True)
    observations = Column(Text, nullable=True)

    proposal = relationship("Proposal", backref="header")


class ProposalMaterialItem(Base, TimestampMixin):
    __tablename__ = "proposal_material_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False)
    material_catalog_id = Column(UUID(as_uuid=False), ForeignKey("material_catalog.id"), nullable=True)
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 4), default=1)
    unit_cost = Column(Numeric(12, 2), default=0)
    total_cost = Column(Numeric(14, 2), default=0)
    suggested_price = Column(Numeric(12, 2), default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    category = Column(String(100), nullable=True)
    supplier_name = Column(String(255), nullable=True)
    cost_center = Column(String(100), nullable=True)
    room = Column(String(100), nullable=True)  # ambiente
    stage = Column(String(100), nullable=True)  # etapa
    sort_order = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    proposal = relationship("Proposal", backref="material_items")


class ProposalServiceItem(Base, TimestampMixin):
    __tablename__ = "proposal_service_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False)
    service_catalog_id = Column(UUID(as_uuid=False), ForeignKey("service_catalog.id"), nullable=True)
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 4), default=1)
    unit_cost = Column(Numeric(12, 2), default=0)
    total_cost = Column(Numeric(14, 2), default=0)
    suggested_price = Column(Numeric(12, 2), default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    stage = Column(String(100), nullable=True)
    sub_stage = Column(String(100), nullable=True)
    provider_name = Column(String(255), nullable=True)
    service_type = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    proposal = relationship("Proposal", backref="service_items")


class ProposalAdditiveItem(Base, TimestampMixin):
    __tablename__ = "proposal_additive_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False)
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 4), default=1)
    unit_cost = Column(Numeric(12, 2), default=0)
    total_cost = Column(Numeric(14, 2), default=0)
    suggested_price = Column(Numeric(12, 2), default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total_price = Column(Numeric(14, 2), default=0)
    status = Column(String(50), default="pendente")  # pendente, aprovado, rejeitado
    responsible = Column(String(255), nullable=True)
    date = Column(Date, nullable=True)
    sort_order = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    proposal = relationship("Proposal", backref="additive_items")


class ProposalRoom(Base, TimestampMixin):
    __tablename__ = "proposal_rooms"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False)
    name = Column(String(255), nullable=False)
    width = Column(Numeric(10, 2), nullable=True)
    length = Column(Numeric(10, 2), nullable=True)
    height = Column(Numeric(10, 2), nullable=True)
    perimeter = Column(Numeric(10, 2), nullable=True)  # calculated
    area = Column(Numeric(10, 2), nullable=True)  # calculated
    wall_area = Column(Numeric(10, 2), nullable=True)  # calculated
    notes = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)

    proposal = relationship("Proposal", backref="rooms")


class ProposalCommercialTerms(Base, TimestampMixin):
    __tablename__ = "proposal_commercial_terms"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    proposal_id = Column(UUID(as_uuid=False), ForeignKey("proposals.id"), nullable=False, unique=True)
    payment_method = Column(String(255), nullable=True)
    deadline = Column(String(255), nullable=True)
    down_payment_percent = Column(Numeric(5, 2), nullable=True)
    down_payment_value = Column(Numeric(14, 2), nullable=True)
    num_installments = Column(Integer, nullable=True)
    validity_days = Column(Integer, nullable=True)
    scope_included = Column(Text, nullable=True)
    scope_excluded = Column(Text, nullable=True)
    commercial_notes = Column(Text, nullable=True)
    tax_percent = Column(Numeric(5, 2), nullable=True)
    discount_percent = Column(Numeric(5, 2), nullable=True)
    discount_value = Column(Numeric(14, 2), nullable=True)
    min_margin_percent = Column(Numeric(5, 2), nullable=True)

    proposal = relationship("Proposal", backref="commercial_terms_rel")


# ==================== CLIENT BANK DATA ====================

class ClientBankData(Base, TimestampMixin):
    __tablename__ = "client_bank_data"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    client_id = Column(UUID(as_uuid=False), ForeignKey("clients.id"), nullable=False)
    bank_name = Column(String(100), nullable=True)
    bank_agency = Column(String(20), nullable=True)
    bank_account = Column(String(30), nullable=True)
    bank_account_type = Column(String(20), nullable=True)  # corrente, poupanca
    pix_key = Column(String(255), nullable=True)
    pix_key_type = Column(String(20), nullable=True)
    holder_name = Column(String(255), nullable=True)
    holder_cpf_cnpj = Column(String(20), nullable=True)
    is_primary = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    client = relationship("Client", backref="bank_data")


# ==================== CONTRACT TEMPLATES ====================

class ContractTemplate(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "contract_templates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)  # Template with {{placeholders}}
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)


# ==================== SINAPI ====================

class SinapiSource(Base, TimestampMixin):
    __tablename__ = "sinapi_sources"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    reference_month = Column(String(20), nullable=True)  # e.g. "01-2025"
    state = Column(String(2), nullable=True)
    source_type = Column(String(50), nullable=False, default="upload")  # upload, url
    url = Column(String(500), nullable=True)
    file_path = Column(String(500), nullable=True)
    total_items = Column(Integer, default=0)
    imported_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="pendente")  # pendente, importando, concluido, erro
    notes = Column(Text, nullable=True)


class SinapiItem(Base, TimestampMixin):
    __tablename__ = "sinapi_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    source_id = Column(UUID(as_uuid=False), ForeignKey("sinapi_sources.id"), nullable=False)
    code = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)
    unit_cost = Column(Numeric(14, 4), nullable=True)
    category = Column(String(100), nullable=True)
    origin = Column(String(100), nullable=True)  # composicao, insumo

    source = relationship("SinapiSource", backref="items")


# ==================== MEASUREMENT ATTACHMENTS ====================

class MeasurementAttachment(Base, TimestampMixin):
    __tablename__ = "measurement_attachments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    measurement_id = Column(UUID(as_uuid=False), ForeignKey("measurements.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)


# ==================== PURCHASE RECEIPTS ====================

class PurchaseReceipt(Base, TimestampMixin):
    __tablename__ = "purchase_receipts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    order_id = Column(UUID(as_uuid=False), ForeignKey("purchase_orders.id"), nullable=False)
    received_date = Column(Date, nullable=False)
    received_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    status = Column(String(50), nullable=False, default="completo")  # completo, parcial, divergente
    notes = Column(Text, nullable=True)

    order = relationship("PurchaseOrder", backref="receipts")
    items = relationship("PurchaseReceiptItem", back_populates="receipt", cascade="all, delete-orphan")


class PurchaseReceiptItem(Base, TimestampMixin):
    __tablename__ = "purchase_receipt_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    receipt_id = Column(UUID(as_uuid=False), ForeignKey("purchase_receipts.id"), nullable=False)
    order_item_id = Column(UUID(as_uuid=False), ForeignKey("purchase_order_items.id"), nullable=True)
    description = Column(Text, nullable=False)
    quantity_expected = Column(Numeric(12, 4), nullable=False, default=0)
    quantity_received = Column(Numeric(12, 4), nullable=False, default=0)
    status = Column(String(50), nullable=False, default="ok")  # ok, parcial, divergente, nao_recebido
    notes = Column(Text, nullable=True)

    receipt = relationship("PurchaseReceipt", back_populates="items")


# ==================== DIARY ATTACHMENTS (ENHANCED) ====================

class DiaryAttachment(Base, TimestampMixin):
    __tablename__ = "diary_attachments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    diary_id = Column(UUID(as_uuid=False), ForeignKey("work_diaries.id"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=True)  # foto, documento
    description = Column(Text, nullable=True)
    uploaded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    diary = relationship("WorkDiary", backref="attachments")
