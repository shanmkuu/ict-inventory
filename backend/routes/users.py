from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from .. import database, auth

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(database.get_db),
    current_admin=Depends(auth.get_current_admin_user)
):
    users = db.query(database.User).all()
    return users

@router.post("", response_model=UserOut)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(database.get_db),
    current_admin=Depends(auth.get_current_admin_user)
):
    existing = db.query(database.User).filter(database.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    if user_data.role not in ["Admin", "User"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = database.User(username=user_data.username, hashed_password=hashed_password, role=user_data.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_admin=Depends(auth.get_current_admin_user)
):
    user_to_delete = db.query(database.User).filter(database.User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_delete.username == current_admin.username:
        raise HTTPException(status_code=400, detail="Cannot delete your own active session account")
        
    db.delete(user_to_delete)
    db.commit()
    return None
