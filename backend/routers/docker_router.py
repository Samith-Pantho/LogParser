from fastapi import APIRouter, HTTPException
from typing import List
from services.docker_reader import list_containers
from pydantic import BaseModel

router = APIRouter(prefix="/api/docker", tags=["docker"])

class ContainerInfo(BaseModel):
    id: str
    name: str
    status: str

@router.get("/containers", response_model=List[ContainerInfo])
async def get_containers():
    """
    Returns a list of all containers with their states.
    """
    try:
        containers = await list_containers()
        return containers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
