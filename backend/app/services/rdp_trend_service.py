from app.core.settings import CN_TZ
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vm_rdp_login import VMRdpLogin
from app.schemas.rdp_trend import RDPTrendPoint, RDPTrendResponse, RDPTrendResponseData, TrendGranularity


def ensure_cn(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=CN_TZ)
    return value.astimezone(CN_TZ)


class RDPTrendService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_trends(self, granularity: TrendGranularity) -> RDPTrendResponse:
        bucket_counts: dict[tuple[int, ...], int] = {}

        login_times = self.session.scalars(
            select(VMRdpLogin.login_at).order_by(VMRdpLogin.login_at)
        ).all()
        for login_at in login_times:
            bucket_key = self._build_bucket_key(ensure_cn(login_at), granularity)
            bucket_counts[bucket_key] = bucket_counts.get(bucket_key, 0) + 1

        series = [
            RDPTrendPoint(
                bucket=self._format_bucket(bucket_key, granularity),
                login_count=bucket_counts[bucket_key],
            )
            for bucket_key in sorted(bucket_counts)
        ]

        # 如果最新桶不是今天，补上今天（数值为 0）
        if series and granularity == "day":
            today_str = datetime.now(CN_TZ).date().isoformat()
            if series[-1].bucket != today_str:
                series.append(RDPTrendPoint(bucket=today_str, login_count=0))

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
            from datetime import timedelta
            year, week = bucket_key
            # ISO 周第一天是周一
            d = date.fromisocalendar(year, week, 1)
            end = d + timedelta(days=6)
            return f"{d.month}/{d.day}-{end.month}/{end.day}"

        year, month = bucket_key
        return f"{year}-{month:02d}"
