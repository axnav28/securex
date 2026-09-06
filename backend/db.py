from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+asyncpg://securex:securex@127.0.0.1:5432/securex')
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class OrganizationRow(Base):
    __tablename__ = 'organizations'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    tier: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UserRow(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), default='demo')
    role: Mapped[str] = mapped_column(String(50), default='ciso')


class IntegrationRow(Base):
    __tablename__ = 'integrations'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    provider_name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30))
    __table_args__ = (UniqueConstraint('org_id', 'provider_name'),)


class ScenarioRow(Base):
    __tablename__ = 'saved_scenarios'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    user_id: Mapped[str] = mapped_column(String(255), default='demo')
    name: Mapped[str] = mapped_column(String(160))
    toggled_control_ids: Mapped[list[str]] = mapped_column(JSON)
    resulting_eal: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditRow(Base):
    __tablename__ = 'audit_log'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actor: Mapped[str] = mapped_column(String(255))
    change_description: Mapped[str] = mapped_column(Text)
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64), unique=True)


class AssetRow(Base):
    __tablename__ = 'assets'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(100))
    criticality: Mapped[str] = mapped_column(String(30), default='high')
    metadata_json: Mapped[dict] = mapped_column('metadata', JSON, default=dict)


class VulnerabilityRow(Base):
    __tablename__ = 'vulnerabilities'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    cve_id: Mapped[str] = mapped_column(String(80), unique=True)
    cvss_score: Mapped[float] = mapped_column(Float)
    epss_score: Mapped[float] = mapped_column(Float)
    is_kev: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str] = mapped_column(Text, default='')


class ControlRow(Base):
    __tablename__ = 'controls'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(30))
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AttackEdgeRow(Base):
    __tablename__ = 'attack_edges'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    source_asset_id: Mapped[str] = mapped_column(String(80))
    target_asset_id: Mapped[str] = mapped_column(String(80))
    weight: Mapped[float] = mapped_column(Float)


class RiskSnapshotRow(Base):
    __tablename__ = 'risk_snapshots'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(ForeignKey('organizations.id'), index=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    eal_value: Mapped[float] = mapped_column(Float)
    var_99_value: Mapped[float] = mapped_column(Float)
    confidence_breakdown: Mapped[dict] = mapped_column(JSON)
    loss_exceedance_curve: Mapped[list] = mapped_column(JSON)


class ComplianceMappingRow(Base):
    __tablename__ = 'compliance_mappings'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    control_id: Mapped[str] = mapped_column(String(80))
    framework: Mapped[str] = mapped_column(String(80))
    clause_ref: Mapped[str] = mapped_column(String(120))
    equivalence_group_id: Mapped[str | None] = mapped_column(String(80), nullable=True)


async def init_db(orgs: dict[str, object], nodes: list[tuple], controls: list[tuple], edges: list[tuple]) -> None:
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with SessionLocal() as session:
            for org_id, org in orgs.items():
                existing = await session.get(OrganizationRow, org_id)
                if existing is None:
                    session.add(OrganizationRow(id=org_id, name=org.name, tier=org.tier))
                for provider in ['Qualys', 'Tenable', 'Splunk', 'CrowdStrike']:
                    integration_id = f'{org_id}-{provider.lower()}'
                    if await session.get(IntegrationRow, integration_id) is None:
                        session.add(IntegrationRow(id=integration_id, org_id=org_id, provider_name=provider, status='connected' if provider in ['Qualys', 'Tenable'] else 'not_connected'))
                for node in nodes:
                    asset_id=f'{org_id}-{node[0]}'
                    if await session.get(AssetRow, asset_id) is None:
                        session.add(AssetRow(id=asset_id,org_id=org_id,name=node[1],type=node[2],criticality='critical' if node[0] in ['pay','core'] else 'high',metadata_json={'confidence':node[3],'risk':node[4]}))
                for control in controls:
                    control_id=f'{org_id}-{control[0]}'
                    if await session.get(ControlRow, control_id) is None:
                        session.add(ControlRow(id=control_id,org_id=org_id,name=control[1],category=control[2],status='verified' if control[5] else 'not_implemented'))
                existing_edges=await session.scalar(select(AttackEdgeRow.id).where(AttackEdgeRow.org_id==org_id).limit(1))
                if existing_edges is None:
                    for source,target,weight in edges:
                        session.add(AttackEdgeRow(org_id=org_id,source_asset_id=f'{org_id}-{source}',target_asset_id=f'{org_id}-{target}',weight=weight))
            await session.commit()
    except Exception:
        # Local frontend demos still work when Postgres is not started.
        return


async def db_integrations(org_id: str) -> list[dict[str, str]] | None:
    try:
        async with SessionLocal() as session:
            rows = (await session.scalars(select(IntegrationRow).where(IntegrationRow.org_id == org_id))).all()
            return [{'id': row.id, 'provider_name': row.provider_name, 'status': row.status} for row in rows]
    except Exception:
        return None


async def db_set_integration(org_id: str, integration_id: str, status: str) -> bool:
    try:
        async with SessionLocal() as session:
            row = await session.get(IntegrationRow, integration_id)
            if row is None or row.org_id != org_id:
                return False
            row.status = status
            await session.commit()
            return True
    except Exception:
        return False


async def db_save_scenario(scenario: ScenarioRow) -> None:
    async with SessionLocal() as session:
        session.add(scenario)
        await session.commit()


async def db_scenarios(org_id: str) -> list[ScenarioRow]:
    async with SessionLocal() as session:
        return list((await session.scalars(select(ScenarioRow).where(ScenarioRow.org_id == org_id).order_by(ScenarioRow.created_at.desc()))).all())

async def db_audit_entries(org_id: str) -> list[AuditRow]:
    async with SessionLocal() as session:
        return list((await session.scalars(select(AuditRow).where(AuditRow.org_id == org_id).order_by(AuditRow.id))).all())

async def db_append_audit(org_id: str, actor: str, change: str) -> None:
    async with SessionLocal() as session:
        last = await session.scalar(select(AuditRow).where(AuditRow.org_id == org_id).order_by(AuditRow.id.desc()).limit(1))
        previous = last.hash if last else '0' * 64
        digest = __import__('hashlib').sha256(f'{previous}{change}'.encode()).hexdigest()
        session.add(AuditRow(org_id=org_id, actor=actor, change_description=change, prev_hash=previous, hash=digest))
        await session.commit()

async def db_save_snapshot(org_id: str, eal: float, var99: float, confidence: dict, curve: list) -> None:
    async with SessionLocal() as session:
        session.add(RiskSnapshotRow(org_id=org_id,eal_value=eal,var_99_value=var99,confidence_breakdown=confidence,loss_exceedance_curve=curve))
        await session.commit()
