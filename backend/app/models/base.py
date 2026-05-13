"""Base de données partagée pour tous les modèles SQLAlchemy."""

from sqlalchemy.ext.declarative import declarative_base

# Base unique pour tous les modèles
Base = declarative_base()
