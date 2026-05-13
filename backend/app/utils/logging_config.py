"""Configuration du logging applicatif."""

from __future__ import annotations

import logging
import logging.config


def configure_logging() -> None:
    """Initialise un logging simple et lisible pour le projet."""
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": "INFO",
                }
            },
            "root": {"handlers": ["console"], "level": "INFO"},
        }
    )
