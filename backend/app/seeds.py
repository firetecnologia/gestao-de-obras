"""
Seeds para popular o banco com dados iniciais de demonstração.
Execute: python -m app.seeds
"""
import asyncio
import uuid
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal

from app.core.database import engine, async_session, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, Role, Permission, Client, ClientContact, Lead, LeadInteraction,
    Supplier, Project, Proposal, ProposalItem, Contract, ContractInstallment,
    WorkPhase, WorkTask, WorkDiary, PurchaseRequest, PurchaseRequestItem,
    FinancialEntry,
)

MODULES = [
    "users", "clients", "suppliers", "projects", "leads", "proposals",
    "contracts", "planning", "purchases", "diary", "financial",
    "documents", "dashboard", "closing",
]
ACTIONS = ["visualizar", "criar", "editar", "excluir", "aprovar", "exportar", "anexar"]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # PERMISSIONS
        permissions = []
        for module in MODULES:
            for action in ACTIONS:
                p = Permission(id=str(uuid.uuid4()), module=module, action=action, description=f"{action} em {module}")
                permissions.append(p)
                session.add(p)
        await session.flush()

        # ROLES
        admin_role = Role(id=str(uuid.uuid4()), name="Administrador", description="Acesso total ao sistema", is_system=True)
        admin_role.permissions = permissions
        session.add(admin_role)

        direcao_role = Role(id=str(uuid.uuid4()), name="Direção / CEO", description="Visão executiva", is_system=True)
        direcao_role.permissions = [p for p in permissions if p.action in ("visualizar", "aprovar", "exportar")]
        session.add(direcao_role)

        comercial_role = Role(id=str(uuid.uuid4()), name="Comercial", description="Gestão comercial e CRM", is_system=True)
        comercial_role.permissions = [p for p in permissions if p.module in ("leads", "clients", "proposals", "contracts") or p.action == "visualizar"]
        session.add(comercial_role)

        engenheiro_role = Role(id=str(uuid.uuid4()), name="Engenheiro", description="Planejamento e cronograma", is_system=True)
        session.add(engenheiro_role)

        financeiro_role = Role(id=str(uuid.uuid4()), name="Financeiro", description="Gestão financeira", is_system=True)
        session.add(financeiro_role)

        cliente_role = Role(id=str(uuid.uuid4()), name="Cliente", description="Portal do cliente", is_system=True)
        cliente_role.permissions = [p for p in permissions if p.action == "visualizar" and p.module in ("projects", "documents", "contracts")]
        session.add(cliente_role)

        await session.flush()

        # USERS
        admin = User(id=str(uuid.uuid4()), email="admin@gestaoobras.com", password_hash=get_password_hash("admin123"), name="Administrador do Sistema", phone="(11) 99999-0001", role_id=admin_role.id, is_active=True)
        ceo = User(id=str(uuid.uuid4()), email="ceo@gestaoobras.com", password_hash=get_password_hash("ceo123"), name="Carlos Eduardo (CEO)", phone="(11) 99999-0002", role_id=direcao_role.id, is_active=True)
        comercial_user = User(id=str(uuid.uuid4()), email="comercial@gestaoobras.com", password_hash=get_password_hash("comercial123"), name="Ana Paula (Comercial)", phone="(11) 99999-0003", role_id=comercial_role.id, is_active=True)
        engenheiro_user = User(id=str(uuid.uuid4()), email="engenheiro@gestaoobras.com", password_hash=get_password_hash("eng123"), name="Roberto Silva (Engenheiro)", phone="(11) 99999-0004", role_id=engenheiro_role.id, is_active=True)
        financeiro_user = User(id=str(uuid.uuid4()), email="financeiro@gestaoobras.com", password_hash=get_password_hash("fin123"), name="Maria Santos (Financeiro)", phone="(11) 99999-0005", role_id=financeiro_role.id, is_active=True)
        session.add_all([admin, ceo, comercial_user, engenheiro_user, financeiro_user])
        await session.flush()

        # CLIENTS
        client1 = Client(id=str(uuid.uuid4()), person_type="fisica", name="João da Silva", cpf_cnpj="123.456.789-00", email="joao@email.com", phone="(11) 98765-4321", address_street="Rua das Flores", address_number="100", address_neighborhood="Jardim Primavera", address_city="São Paulo", address_state="SP", address_zip="01234-000", notes="Cliente indicado pelo Dr. Paulo", created_by=admin.id)
        client2 = Client(id=str(uuid.uuid4()), person_type="juridica", name="Empresa ABC Ltda", company_name="ABC Comércio e Serviços Ltda", cpf_cnpj="12.345.678/0001-90", email="contato@abc.com.br", phone="(11) 3456-7890", address_street="Av. Paulista", address_number="1000", address_city="São Paulo", address_state="SP", address_zip="01310-100", created_by=admin.id)
        client3 = Client(id=str(uuid.uuid4()), person_type="fisica", name="Maria Oliveira", cpf_cnpj="987.654.321-00", email="maria@email.com", phone="(11) 91234-5678", address_city="São Paulo", address_state="SP", created_by=comercial_user.id)
        session.add_all([client1, client2, client3])
        await session.flush()

        session.add(ClientContact(client_id=client1.id, name="João da Silva", email="joao@email.com", phone="(11) 98765-4321", is_primary=True))
        session.add(ClientContact(client_id=client2.id, name="Ricardo (Gerente)", email="ricardo@abc.com.br", phone="(11) 3456-7891", role="Gerente", is_primary=True))

        # SUPPLIERS
        sup1 = Supplier(id=str(uuid.uuid4()), name="Materiais São Paulo", cpf_cnpj="11.222.333/0001-44", specialty="Materiais de construção", address_city="São Paulo", address_state="SP", rating=5, created_by=admin.id)
        sup2 = Supplier(id=str(uuid.uuid4()), name="Elétrica Express", specialty="Instalações elétricas", address_city="São Paulo", address_state="SP", rating=4, created_by=admin.id)
        sup3 = Supplier(id=str(uuid.uuid4()), name="HidroTech", specialty="Instalações hidráulicas", address_city="Guarulhos", address_state="SP", rating=4, created_by=admin.id)
        session.add_all([sup1, sup2, sup3])
        await session.flush()

        # LEADS
        lead1 = Lead(id=str(uuid.uuid4()), name="Pedro Fernandes", email="pedro@email.com", phone="(11) 99876-5432", source="indicacao", status="proposta_enviada", responsible_id=comercial_user.id, notes="Quer reformar apartamento de 120m²")
        lead2 = Lead(id=str(uuid.uuid4()), name="Construtora Delta", email="delta@construtora.com", phone="(11) 3333-4444", company="Construtora Delta", source="site", status="em_contato", responsible_id=comercial_user.id)
        lead3 = Lead(id=str(uuid.uuid4()), name="Lucia Campos", email="lucia@email.com", phone="(11) 92222-3333", source="instagram", status="novo", responsible_id=comercial_user.id)
        session.add_all([lead1, lead2, lead3])
        await session.flush()

        session.add(LeadInteraction(lead_id=lead1.id, user_id=comercial_user.id, type="ligacao", description="Primeiro contato por telefone", date=datetime.now(timezone.utc) - timedelta(days=10)))
        session.add(LeadInteraction(lead_id=lead1.id, user_id=comercial_user.id, type="reuniao", description="Reunião no escritório", date=datetime.now(timezone.utc) - timedelta(days=5)))

        # PROPOSAL
        proposal1 = Proposal(id=str(uuid.uuid4()), code="PROP-0001", client_id=client1.id, title="Reforma Apartamento João Silva", description="Reforma completa do apartamento de 120m²", status="aprovada", markup_percent=Decimal("30"), discount=Decimal("0"), created_by=comercial_user.id, approved_at=datetime.now(timezone.utc) - timedelta(days=1), approved_by=admin.id)
        session.add(proposal1)
        await session.flush()

        items_data = [
            ("Demolição", "Sala", "Demolição de parede divisória", "servico", "vb", 1, 2500, 3250),
            ("Alvenaria", "Sala", "Construção de parede drywall", "servico", "m2", 15, 120, 156),
            ("Elétrica", "Geral", "Instalação elétrica completa", "servico", "vb", 1, 8000, 10400),
            ("Hidráulica", "Banheiro", "Instalação hidráulica", "servico", "vb", 1, 5000, 6500),
            ("Piso", "Sala", "Porcelanato 60x60", "material", "m2", 40, 85, 110),
            ("Piso", "Sala", "Mão de obra assentamento piso", "servico", "m2", 40, 45, 58),
            ("Pintura", "Geral", "Pintura latex PVA completa", "servico", "m2", 200, 18, 23),
            ("Esquadrias", "Geral", "Portas internas completas", "material", "un", 5, 450, 585),
        ]
        total_cost = Decimal("0")
        total_price = Decimal("0")
        for i, (cat, sub, desc, itype, unit, qty, cost, price) in enumerate(items_data):
            tc = Decimal(str(qty)) * Decimal(str(cost))
            tp = Decimal(str(qty)) * Decimal(str(price))
            total_cost += tc
            total_price += tp
            session.add(ProposalItem(proposal_id=proposal1.id, category=cat, subcategory=sub, description=desc, item_type=itype, unit=unit, quantity=Decimal(str(qty)), unit_cost=Decimal(str(cost)), unit_price=Decimal(str(price)), total_cost=tc, total_price=tp, sort_order=i))
        proposal1.total_cost = total_cost
        proposal1.total_price = total_price
        await session.flush()

        # CONTRACT
        contract1 = Contract(id=str(uuid.uuid4()), code="CTR-0001", proposal_id=proposal1.id, client_id=client1.id, title="Contrato - Reforma Apt João Silva", scope_summary="Reforma completa incluindo demolição, alvenaria, elétrica, hidráulica, pisos e pintura", status="ativo", total_value=total_price, payment_conditions="4 parcelas mensais iguais", signed_at=datetime.now(timezone.utc) - timedelta(days=1), start_date=date.today(), end_date=date.today() + timedelta(days=90), created_by=admin.id)
        session.add(contract1)
        await session.flush()

        parcela_valor = total_price / 4
        for i in range(4):
            inst = ContractInstallment(contract_id=contract1.id, installment_number=i + 1, description=f"Parcela {i+1}/4", due_date=date.today() + timedelta(days=30 * i), amount=parcela_valor, status="paga" if i == 0 else "pendente")
            if i == 0:
                inst.paid_at = datetime.now(timezone.utc) - timedelta(days=1)
                inst.paid_amount = parcela_valor
            session.add(inst)
            session.add(FinancialEntry(type="receita", category="parcela_contrato", description=f"Parcela {i+1}/4 - {contract1.title}", planned_amount=parcela_valor, actual_amount=parcela_valor if i == 0 else None, due_date=date.today() + timedelta(days=30 * i), status="pago" if i == 0 else "pendente", created_by=admin.id))
        await session.flush()

        # PROJECT
        project1 = Project(id=str(uuid.uuid4()), name="Reforma Apt. João Silva", code="OBR-0001", client_id=client1.id, type="reforma_residencial", status="em_andamento", description="Reforma completa do apartamento", address_street="Rua das Flores", address_number="100", address_city="São Paulo", address_state="SP", area_m2=Decimal("120"), planned_start=date.today() - timedelta(days=15), planned_end=date.today() + timedelta(days=75), actual_start=date.today() - timedelta(days=15), responsible_id=engenheiro_user.id, contract_id=contract1.id, estimated_value=total_price)
        project2 = Project(id=str(uuid.uuid4()), name="Reforma Escritório ABC", code="OBR-0002", client_id=client2.id, type="reforma_comercial", status="planejamento", description="Reforma do escritório corporativo", address_street="Av. Paulista", address_number="1000", address_city="São Paulo", address_state="SP", area_m2=Decimal("250"), planned_start=date.today() + timedelta(days=30), planned_end=date.today() + timedelta(days=150), responsible_id=engenheiro_user.id, estimated_value=Decimal("350000"))
        session.add_all([project1, project2])
        await session.flush()

        # PHASES
        phases_data = [
            ("Demolição e Preparo", 0, -15, -10, "concluida", 100),
            ("Alvenaria e Estrutura", 1, -10, -1, "concluida", 100),
            ("Instalações Elétricas", 2, -1, 15, "em_andamento", 40),
            ("Instalações Hidráulicas", 3, 5, 25, "nao_iniciada", 0),
            ("Revestimentos e Pisos", 4, 20, 45, "nao_iniciada", 0),
            ("Pintura e Acabamento", 5, 40, 60, "nao_iniciada", 0),
            ("Limpeza e Entrega", 6, 55, 65, "nao_iniciada", 0),
        ]
        phase_objs = []
        for name, order, s_off, e_off, st, prog in phases_data:
            ph = WorkPhase(project_id=project1.id, name=name, sort_order=order, planned_start=date.today() + timedelta(days=s_off), planned_end=date.today() + timedelta(days=e_off), status=st, progress_percent=prog)
            if st == "concluida":
                ph.actual_start = ph.planned_start
                ph.actual_end = ph.planned_end
            elif st == "em_andamento":
                ph.actual_start = ph.planned_start
            session.add(ph)
            phase_objs.append(ph)
        await session.flush()

        elec_phase = phase_objs[2]
        for name, order, s_off, e_off, st, prog in [("Passar tubulação", 0, -1, 5, "em_andamento", 60), ("Passar fiação", 1, 3, 10, "nao_iniciada", 0), ("Instalar quadro elétrico", 2, 8, 12, "nao_iniciada", 0), ("Instalar tomadas", 3, 10, 15, "nao_iniciada", 0)]:
            session.add(WorkTask(phase_id=elec_phase.id, name=name, sort_order=order, responsible_id=engenheiro_user.id, planned_start=date.today() + timedelta(days=s_off), planned_end=date.today() + timedelta(days=e_off), status=st, progress_percent=prog))

        # WORK DIARY
        for i in range(5):
            session.add(WorkDiary(project_id=project1.id, date=date.today() - timedelta(days=i + 1), weather="Ensolarado" if i % 2 == 0 else "Nublado", team_present="Pedreiro João, Eletricista Paulo, Ajudante Marcos", activities=f"Dia {i+1}: Continuação das instalações elétricas", issues="Problema no reboco da parede" if i == 2 else None, notes="Produtividade normal", created_by=engenheiro_user.id))

        # PURCHASE REQUEST
        pr1 = PurchaseRequest(id=str(uuid.uuid4()), code="SC-0001", project_id=project1.id, status="aprovada", description="Material elétrico para o apartamento", needed_by=date.today() + timedelta(days=5), created_by=engenheiro_user.id)
        session.add(pr1)
        await session.flush()
        session.add(PurchaseRequestItem(request_id=pr1.id, description="Fio 2.5mm", quantity=Decimal("500"), unit="m", estimated_cost=Decimal("750")))
        session.add(PurchaseRequestItem(request_id=pr1.id, description="Disjuntores 20A", quantity=Decimal("10"), unit="un", estimated_cost=Decimal("250")))

        # EXPENSES
        for desc, cat, amt, st in [("Mão de obra - pedreiro", "mao_de_obra", 3500, "pago"), ("Material demolição", "material", 800, "pago"), ("Material alvenaria", "material", 2200, "pago"), ("Material elétrico", "material", 1500, "pendente")]:
            session.add(FinancialEntry(project_id=project1.id, type="despesa", category=cat, description=desc, planned_amount=Decimal(str(amt)), actual_amount=Decimal(str(amt)) if st == "pago" else None, due_date=date.today() - timedelta(days=5) if st == "pago" else date.today() + timedelta(days=10), paid_date=date.today() - timedelta(days=3) if st == "pago" else None, status=st, created_by=financeiro_user.id))

        await session.commit()
        print("=" * 50)
        print("Seeds executados com sucesso!")
        print("=" * 50)
        print("Usuários:")
        print("  admin@gestaoobras.com / admin123")
        print("  ceo@gestaoobras.com / ceo123")
        print("  comercial@gestaoobras.com / comercial123")
        print("  engenheiro@gestaoobras.com / eng123")
        print("  financeiro@gestaoobras.com / fin123")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
