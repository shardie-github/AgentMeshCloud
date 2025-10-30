"""
Data models for AI-Agent Mesh SDK
"""

from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class Agent(BaseModel):
    """AI Agent model"""
    id: str
    name: str
    type: str
    config: Dict[str, Any]
    status: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    
    class Config:
        populate_by_name = True


class Workflow(BaseModel):
    """Workflow model"""
    id: str
    agent_id: str = Field(alias="agentId")
    definition: Dict[str, Any]
    execution_count: int = Field(alias="executionCount")
    last_executed: Optional[datetime] = Field(None, alias="lastExecuted")
    
    class Config:
        populate_by_name = True


class Policy(BaseModel):
    """Governance policy model"""
    id: str
    name: str
    framework: str
    rules: Dict[str, Any]
    enforcement_mode: str = Field(alias="enforcementMode")
    
    class Config:
        populate_by_name = True


class TelemetryEvent(BaseModel):
    """Telemetry event model"""
    id: str
    agent_id: str = Field(alias="agentId")
    event_type: str = Field(alias="eventType")
    payload: Dict[str, Any]
    timestamp: datetime
    
    class Config:
        populate_by_name = True
