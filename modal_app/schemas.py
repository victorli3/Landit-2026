from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


class RadarScores(BaseModel):
    relevance: int = Field(ge=0, le=100)
    depth: int = Field(ge=0, le=100)
    clarity: int = Field(ge=0, le=100)
    impact: int = Field(ge=0, le=100)
    consistency: int = Field(ge=0, le=100)


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    text: str
    category: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    targetScores: RadarScores


class Evaluation(BaseModel):
    questionId: str
    scores: RadarScores
    suggestions: list[str]
    improvedAnswer: str


class GenerateQuestionsRequest(BaseModel):
    jobDescription: str
    questionCount: int = 8
    categories: list[str] = ["Behavioral", "Situational", "Role-Specific"]


class GenerateQuestionsResponse(BaseModel):
    questions: list[Question]


class EvaluateAnswerRequest(BaseModel):
    question: Question
    answer: str


class EvaluateAnswerResponse(BaseModel):
    evaluation: Evaluation
