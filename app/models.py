"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum


class Priority(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskStatus(str, Enum):
    TODO = "todo"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
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
    id: Optional[str] = None
    title: str
    completed: bool = False
    order: int = 0


class Attachment(BaseModel):
    id: str
    name: str
    type: str
    url: str
    size: Optional[int] = None


class Recurrence(BaseModel):
    enabled: bool = False
    pattern: RecurrencePattern = RecurrencePattern.DAILY
    interval: int = 1
    daysOfWeek: List[int] = []
    endDate: Optional[datetime] = None
    endAfterOccurrences: Optional[int] = None


class ReminderConfig(BaseModel):
    """Configuration for task reminders"""
    enabled: bool = False
    minutesBefore: int = 30  # How many minutes before due time
    notifyDesktop: bool = True  # Show desktop notification
    notifyMobile: bool = True  # Sync reminder to Google Calendar


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    list: Optional[str] = None  # Optional for inbox tasks
    dueDate: Optional[Union[datetime, date, str]] = None  # Accept date string, date object, or datetime
    dueTime: Optional[str] = None
    priority: Priority = Priority.NONE
    tags: List[str] = []
    subtasks: List[Subtask] = []
    attachments: List[Attachment] = []
    recurrence: Optional[Recurrence] = None
    reminder: Optional[ReminderConfig] = None  # Task reminder settings
    syncToCalendar: bool = False  # Auto-sync this task to Google Calendar


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    list: Optional[str] = None
    dueDate: Optional[Union[datetime, date, str]] = None  # Accept date string, date object, or datetime
    dueTime: Optional[str] = None
    priority: Optional[Priority] = None
    tags: Optional[List[str]] = None
    subtasks: Optional[List[Subtask]] = None
    attachments: Optional[List[Attachment]] = None
    status: Optional[TaskStatus] = None
    recurrence: Optional[Recurrence] = None
    reminder: Optional[ReminderConfig] = None  # Task reminder settings
    syncToCalendar: Optional[bool] = None  # Auto-sync this task to Google Calendar


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
    timezone: Optional[str] = None  # IANA timezone (e.g., "America/Denver")
    notifications: Optional[Dict[str, Any]] = None
    pomodoroSettings: Optional[Dict[str, Any]] = None


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str = Field(..., min_length=6)


# Tag Models
class TagCreate(BaseModel):
    name: str
    parentId: Optional[str] = None
    color: str = "#8B5CF6"
    icon: str = "📁"


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None

