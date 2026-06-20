from datetime import datetime, timedelta

from app.core.settings import CN_TZ
from app.services.vm_asset_service import _calc_status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.perf_metric import PerfMetric
from app.models.vm_asset import VMAsset
from app.models.vm_rdp_login import VMRdpLogin


class HostDetailService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_host_detail(self, ip: str) -> dict:
        # 1. 基本信息
        asset = self.session.query(VMAsset).filter(VMAsset.ip == ip).first()
        asset_info = None
        if asset:
            idle_days = -1
            if asset.last_rdp_login_at:
                last_rdp = asset.last_rdp_login_at
                if last_rdp.tzinfo is None:
                    last_rdp = last_rdp.replace(tzinfo=CN_TZ)
                idle_days = (datetime.now(CN_TZ) - last_rdp).days
            asset_info = {
                "ip": asset.ip,
                "hostname": asset.hostname,
                "department": asset.department,
                "owner": asset.owner,
                "phone": asset.phone,
                "mobile": asset.mobile,
                "os_type": asset.os_type,
                "status": _calc_status(asset.last_seen_at),
                "last_rdp_login_at": asset.last_rdp_login_at.isoformat() if asset.last_rdp_login_at else None,
                "idle_days": idle_days,
            }

        # 2. 性能趋势（取最近 7 天）
        seven_days_ago = datetime.now(CN_TZ) - timedelta(days=7)
        perf_records = self.session.query(PerfMetric).filter(
            PerfMetric.ip == ip,
            PerfMetric.collected_at >= seven_days_ago,
        ).order_by(PerfMetric.collected_at.asc()).all()

        perf_trend = [
            {
                "clock": int(r.collected_at.timestamp()),
                "cpu_avg": r.cpu_avg,
                "mem_avg": r.mem_avg,
            }
            for r in perf_records
        ]

        # 3. 最新性能数据
        latest_perf = self.session.query(PerfMetric).filter(
            PerfMetric.ip == ip
        ).order_by(PerfMetric.collected_at.desc()).first()
        latest = {
            "cpu": latest_perf.cpu_avg if latest_perf else None,
            "mem": latest_perf.mem_avg if latest_perf else None,
            "collected_at": latest_perf.collected_at.isoformat() if latest_perf else None,
        }

        # 4. RDP 登录记录（最近 20 条）
        rdp_logins = self.session.query(VMRdpLogin).filter(
            VMRdpLogin.ip == ip
        ).order_by(VMRdpLogin.login_at.desc()).limit(20).all()

        rdp_list = [
            {
                "id": r.id,
                "login_at": r.login_at.isoformat(),
                "username": r.username,
            }
            for r in rdp_logins
        ]

        return {
            "asset": asset_info,
            "latest_perf": latest,
            "perf_trend": perf_trend,
            "rdp_logins": rdp_list,
        }
