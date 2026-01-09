"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Priority(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DELETED = "deleted"


class RecurrencePattern(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


# Authentication Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    _id: str
    email: str
    name: str
    avatar: Optional[str] = None
    preferences: Dict[str, Any] = {}
    stats: Dict[str, Any] = {}


# Task Models
class Subtask(BaseModel):
    title: str
    completed: bool = False
    order: int = 0


class Recurrence(BaseModel):
    enabled: bool = False
    pattern: RecurrencePattern = RecurrencePattern.DAILY
    interval: int = 1
    daysOfWeek: List[int] = []
    endDate: Optional[datetime] = None
    endAfterOccurrences: Optional[int] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    list: str
    dueDate: Optional[datetime] = None
    dueTime: Optional[str] = None
    priority: Priority = Priority.NONE
    tags: List[str] = []
    subtasks: List[Subtask] = []
    recurrence: Optional[Recurrence] = None
    reminders: List[datetime] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    list: Optional[str] = None
    dueDate: Optional[datetime] = None
    dueTime: Optional[str] = None
    priority: Optional[Priority] = None
    tags: Optional[List[str]] = None
    subtasks: Optional[List[Subtask]] = None
    status: Optional[TaskStatus] = None
    recurrence: Optional[Recurrence] = None


class TaskResponse(BaseModel):
    _id: str
    title: str
    description: str
    user: str
    list: Dict[str, Any]
    dueDate: Optional[datetime] = None
    dueTime: Optional[str] = None
    priority: Priority
    status: TaskStatus
    tags: List[str]
    subtasks: List[Dict[str, Any]]
    attachments: List[Dict[str, Any]] = []
    order: int
    createdByAI: bool = False
    createdAt: datetime
    updatedAt: datetime


# List Models
class ListCreate(BaseModel):
    name: str
    color: str = "#1890ff"
    icon: str = "list"
    parent: Optional[str] = None


class ListUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None


# Habit Models
class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    frequency: str = "daily"
    targetDays: List[int] = []
    targetCount: int = 1
    color: str = "#52c41a"
    icon: str = "check-circle"
    reminder: Optional[Dict[str, Any]] = None


class HabitComplete(BaseModel):
    date: Optional[datetime] = None
    count: int = 1
    note: Optional[str] = None


# LLM Models
class LLMConfig(BaseModel):
    provider: str
    apiKey: str


class LLMParseRequest(BaseModel):
    input: str
    context: Optional[Dict[str, Any]] = None


class LLMChatRequest(BaseModel):
    message: str
    conversationHistory: List[Dict[str, str]]


# Calendar Models
class CalendarImportResponse(BaseModel):
    message: str
    count: int
    tasks: List[Dict[str, Any]]


# User Models
class PreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    notifications: Optional[Dict[str, Any]] = None
    pomodoroSettings: Optional[Dict[str, Any]] = None


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str = Field(..., min_length=6)

