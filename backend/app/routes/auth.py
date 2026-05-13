"""Routes d'authentification pour AyaMarket."""

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
)
from app.models.user import User
from app.config import get_settings

# Configuration
settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentification"])

# Hashage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Schéma OAuth2 pour le token Bearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Configuration JWT
SECRET_KEY = settings.SECRET_KEY if hasattr(settings, 'SECRET_KEY') else "aya_secret_key_2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie si le mot de passe correspond au hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Génère le hash d'un mot de passe."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Crée un token JWT."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session)
) -> User:
    """Récupère l'utilisateur courant à partir du token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Récupérer l'utilisateur depuis la base de données
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: RegisterRequest,
    db: AsyncSession = Depends(get_db_session)
) -> User:
    """
    Enregistre un nouvel utilisateur.
    
    - Crée l'utilisateur dans Supabase Auth
    - Ajoute les informations dans la table users
    - Retourne les informations de l'utilisateur
    """
    # Vérifier si l'email existe déjà
    stmt = select(User).where(User.email == user_data.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )
    
    # Hasher le mot de passe
    hashed_password = get_password_hash(user_data.password)
    
    # Créer le nouvel utilisateur
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        nom=user_data.nom,
        ville=user_data.ville,
        role=user_data.role,
        actif=True,
        created_at=datetime.utcnow()
    )
    
    # Sauvegarder dans la base de données
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db_session)
) -> dict[str, Any]:
    """
    Authentifie un utilisateur et retourne un token JWT.
    
    - Vérifie l'email et le mot de passe
    - Génère un token JWT
    - Retourne le token et les infos utilisateur
    """
    # Vérifier si l'utilisateur existe
    stmt = select(User).where(User.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte est désactivé"
        )
    
    # Créer le token JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "nom": user.nom,
            "ville": user.ville,
            "role": user.role,
            "actif": user.actif,
            "created_at": user.created_at
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Récupère les informations de l'utilisateur courant.
    
    Nécessite un token JWT valide dans l'en-tête Authorization.
    """
    return current_user
