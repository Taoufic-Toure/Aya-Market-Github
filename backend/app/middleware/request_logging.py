"""Middleware de journalisation des requêtes HTTP."""

from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import Request, Response

logger = logging.getLogger("request")


async def log_request_middleware(
    request: Request, call_next: Callable[[Request], Response]
) -> Response:
    """Mesure et log le temps de traitement de chaque requête."""
    started_at = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "%s %s -> %s (%.2f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response
