from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.services.idle_analysis_service import IdleAnalysisService


DEFAULT_IDLE_DAYS = 30


def build_idle_analysis_job_name() -> str:
    return "idle_analysis"


def run_idle_analysis(
    session: Session,
    *,
    as_of: datetime | None = None,
    idle_days_threshold: int = DEFAULT_IDLE_DAYS,
) -> int:
    effective_as_of = as_of or datetime.now(UTC)
    service = IdleAnalysisService(session)
    return service.analyze_idle_assets(
        as_of=effective_as_of,
        idle_days_threshold=idle_days_threshold,
    )
