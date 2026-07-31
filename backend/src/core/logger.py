import sys
import logging
from pythonjsonlogger.json import JsonFormatter


def setup_logging(service_name: str, level: int = logging.INFO):
    """Настраивает JSON-логирование в stdout (идемпотентно)."""
    root_logger = logging.getLogger()
    if root_logger.hasHandlers():
        return
    root_logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        JsonFormatter(
            fmt="%(asctime)s %(level) %(filename)s %(message)s",
            static_fields={"service_name": service_name},
            json_ensure_ascii=False,
        )
    )
    root_logger.addHandler(handler)
