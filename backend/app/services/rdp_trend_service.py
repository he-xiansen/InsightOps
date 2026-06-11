from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vm_rdp_login import VMRdpLogin
from app.schemas.rdp_trend import RDPTrendPoint, RDPTrendResponse, RDPTrendResponseData, TrendGranularity


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


class RDPTrendService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_trends(self, granularity: TrendGranularity) -> RDPTrendResponse:
        bucket_counts: dict[tuple[int, ...], int] = {}

        login_times = self.session.scalars(
            select(VMRdpLogin.login_at).order_by(VMRdpLogin.login_at)
        ).all()
        for login_at in login_times:
            bucket_key = self._build_bucket_key(ensure_utc(login_at), granularity)
            bucket_counts[bucket_key] = bucket_counts.get(bucket_key, 0) + 1

        series = [
            RDPTrendPoint(
                bucket=self._format_bucket(bucket_key, granularity),
                login_count=bucket_counts[bucket_key],
            )
            for bucket_key in sorted(bucket_counts)
        ]

        return RDPTrendResponse(
            code=0,
            message="success",
            data=RDPTrendResponseData(granularity=granularity, series=series),
        )

    def _build_bucket_key(
        self,
        login_at: datetime,
        granularity: TrendGranularity,
    ) -> tuple[int, ...]:
        if granularity == "day":
            return (login_at.year, login_at.month, login_at.day)

        if granularity == "week":
            iso_year, iso_week, _ = login_at.isocalendar()
            return (iso_year, iso_week)

        return (login_at.year, login_at.month)

    def _format_bucket(self, bucket_key: tuple[int, ...], granularity: TrendGranularity) -> str:
        if granularity == "day":
            year, month, day = bucket_key
            return date(year, month, day).isoformat()

        if granularity == "week":
            year, week = bucket_key
            return f"{year}-W{week:02d}"

        year, month = bucket_key
        return f"{year}-{month:02d}"
