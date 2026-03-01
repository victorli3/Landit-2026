"""
InterviewOS — Modal Backend
Three endpoints:
  POST /generate-questions  → JD text in, structured interview questions out (CPU, LLM)
  POST /transcribe          → Audio bytes in, transcript text out (GPU, Whisper)
  POST /evaluate-answer     → Question + answer in, scored evaluation out (CPU, LLM)

Run locally:   modal serve app.py
Deploy:        modal deploy app.py
"""

import json
from uuid import uuid4

import modal

# ---------------------------------------------------------------------------
# Modal App + Secrets
# ---------------------------------------------------------------------------
app = modal.App("interviewos-ai")

# Create these in the Modal dashboard (modal.com/secrets):
#   "llm-api-key"   → key: ANTHROPIC_API_KEY  (or OPENAI_API_KEY)
LLM_SECRET = modal.Secret.from_name("llm-api-key")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MODEL_PROVIDER = "anthropic"          # "openai" | "anthropic"
MODEL_NAME     = "claude-sonnet-4-5-20250929"  # or "gpt-4o-mini"

TEMPERATURE_GENERATE = 0.7
TEMPERATURE_EVALUATE = 0.3
MAX_TOKENS_GENERATE  = 2048
MAX_TOKENS_EVALUATE  = 1536

# ---------------------------------------------------------------------------
# Container Images (built once, cached by Modal)
# ---------------------------------------------------------------------------

# Lightweight image for LLM proxy endpoints (no GPU needed)
llm_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "anthropic>=0.18",
    "openai>=1.0",
    "pydantic>=2.0",
    "fastapi[standard]",
)

# Heavy image for Whisper transcription (GPU + audio deps)
whisper_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "faster-whisper==1.1.1",
        "pydantic>=2.0",
        "fastapi[standard]",
    )
)

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
from pydantic import BaseModel, Field
from typing import Literal, Optional


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
    jobDescription: str = ""  # optional but improves eval quality


class EvaluateAnswerResponse(BaseModel):
    evaluation: Evaluation


class TranscribeResponse(BaseModel):
    text: str


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

GEN_SYSTEM = """You are an expert interview coach and hiring manager. You generate
realistic, role-specific interview questions based on job descriptions.

RULES:
1. Generate exactly {question_count} questions total
2. Mix of categories: Behavioral, Situational, and Role-Specific
3. At least 3 must be Behavioral (STAR-method appropriate)
4. At least 2 must be Role-Specific (testing domain knowledge from the JD)
5. Vary difficulty: include Easy, Medium, and Hard questions
6. Each question must have targetScores (0-100) representing ideal answer benchmarks
7. Questions should be specific to the role, not generic

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
{{
  "questions": [
    {{
      "id": "<uuid>",
      "text": "<the interview question>",
      "category": "Behavioral" | "Situational" | "Role-Specific",
      "difficulty": "Easy" | "Medium" | "Hard",
      "targetScores": {{
        "relevance": <0-100>,
        "depth": <0-100>,
        "clarity": <0-100>,
        "impact": <0-100>,
        "consistency": <0-100>
      }}
    }}
  ]
}}

No markdown, no explanation, just the JSON object."""

GEN_USER = """Generate {question_count} interview questions for the following role:

--- JOB DESCRIPTION START ---
{job_description}
--- JOB DESCRIPTION END ---

Remember: Return ONLY the JSON object. No other text."""

EVAL_SYSTEM = """You are an expert interview evaluator. You score interview answers
on a 0-100 scale across five dimensions and provide actionable feedback.

SCORING RUBRIC:
- relevance (0-100): How directly the answer addresses the question asked
- depth (0-100): Level of specific detail, examples, and concrete evidence
- clarity (0-100): How well-structured and easy to follow the answer is (STAR method adherence)
- impact (0-100): Whether the answer demonstrates measurable results or outcomes
- consistency (0-100): Internal coherence and alignment with the role requirements

RULES:
1. Score each dimension independently based on the rubric
2. Compare against the targetScores to calibrate expectations
3. Provide exactly 2-4 specific, actionable suggestions
4. Write a complete improved version of the answer that would score 85+ on all dimensions
5. The improved answer should use the STAR method where applicable
6. Be encouraging but honest — don't inflate scores for weak answers

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema:
{{
  "evaluation": {{
    "questionId": "<same as input question id>",
    "scores": {{
      "relevance": <0-100>,
      "depth": <0-100>,
      "clarity": <0-100>,
      "impact": <0-100>,
      "consistency": <0-100>
    }},
    "suggestions": ["<suggestion 1>", "<suggestion 2>", ...],
    "improvedAnswer": "<full improved answer text>"
  }}
}}

No markdown, no explanation, just the JSON object."""

EVAL_USER = """Evaluate this interview answer:

QUESTION: {question_text}
CATEGORY: {question_category}
DIFFICULTY: {question_difficulty}
TARGET SCORES: {target_scores}
{jd_section}
CANDIDATE'S ANSWER:
{answer}

Remember: Return ONLY the JSON object. No other text."""

# ---------------------------------------------------------------------------
# LLM Helper
# ---------------------------------------------------------------------------

def call_llm(system_prompt: str, user_prompt: str, temperature: float, max_tokens: int) -> str:
    """Unified LLM call — provider switch via config."""
    import os

    if MODEL_PROVIDER == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or "{}"

    if MODEL_PROVIDER == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        resp = client.messages.create(
            model=MODEL_NAME,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=temperature,
        )
        return resp.content[0].text

    raise ValueError(f"Unsupported MODEL_PROVIDER: {MODEL_PROVIDER}")


def parse_json_safe(raw: str) -> dict:
    """Strip markdown fencing if present, then parse JSON."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    return json.loads(cleaned)


def call_llm_json(system: str, user: str, temp: float, max_tok: int, retries: int = 2) -> dict:
    """call_llm + parse with retry on bad JSON."""
    for attempt in range(retries):
        try:
            raw = call_llm(system, user, temp, max_tok)
            return parse_json_safe(raw)
        except (json.JSONDecodeError, KeyError) as e:
            if attempt == retries - 1:
                raise ValueError(f"LLM returned invalid JSON after {retries} attempts: {e}")
    return {}


# ---------------------------------------------------------------------------
# Endpoint 1: Generate Questions (CPU — LLM proxy)
# ---------------------------------------------------------------------------

@app.function(image=llm_image, secrets=[LLM_SECRET], timeout=120)
@modal.fastapi_endpoint(method="POST", label="generate-questions")
def generate_questions(request: GenerateQuestionsRequest) -> dict:
    system = GEN_SYSTEM.format(question_count=request.questionCount)
    user = GEN_USER.format(
        question_count=request.questionCount,
        job_description=request.jobDescription,
    )

    data = call_llm_json(system, user, TEMPERATURE_GENERATE, MAX_TOKENS_GENERATE)

    validated = []
    for q in data.get("questions", []):
        if not q.get("id"):
            q["id"] = str(uuid4())
        validated.append(Question(**q))

    return GenerateQuestionsResponse(questions=validated).model_dump()


# ---------------------------------------------------------------------------
# Endpoint 2: Evaluate Answer (CPU — LLM proxy)
# ---------------------------------------------------------------------------

@app.function(image=llm_image, secrets=[LLM_SECRET], timeout=60)
@modal.fastapi_endpoint(method="POST", label="evaluate-answer")
def evaluate_answer(request: EvaluateAnswerRequest) -> dict:
    target_scores_str = json.dumps(request.question.targetScores.model_dump())

    # Include JD context if provided
    jd_section = ""
    if request.jobDescription:
        jd_section = f"\nJOB DESCRIPTION CONTEXT:\n{request.jobDescription}\n"

    user = EVAL_USER.format(
        question_text=request.question.text,
        question_category=request.question.category,
        question_difficulty=request.question.difficulty,
        target_scores=target_scores_str,
        jd_section=jd_section,
        answer=request.answer,
    )

    data = call_llm_json(EVAL_SYSTEM, user, TEMPERATURE_EVALUATE, MAX_TOKENS_EVALUATE)

    eval_data = data.get("evaluation", data)
    eval_data["questionId"] = request.question.id

    evaluation = Evaluation(**eval_data)
    return EvaluateAnswerResponse(evaluation=evaluation).model_dump()


# ---------------------------------------------------------------------------
# Endpoint 3: Whisper Transcription (GPU — real ML inference)
# ---------------------------------------------------------------------------

@app.cls(image=whisper_image, gpu="A10G", timeout=120, container_idle_timeout=60)
class WhisperModel:
    """
    Runs faster-whisper on an A10G GPU.
    The model loads ONCE at container startup via @modal.enter(),
    then handles many requests without reloading.
    """

    @modal.enter()
    def load_model(self):
        from faster_whisper import WhisperModel as FW
        # "base" = fast + good enough for clean mic audio (interview answers)
        # "small" = better accuracy, still fast on A10G
        # Model downloads on first cold start, then cached in the container
        self.model = FW("base", device="cuda", compute_type="float16")
        print("✅ Whisper model loaded on GPU")

    @modal.fastapi_endpoint(method="POST", label="transcribe")
    async def transcribe(self, request: dict):
        """
        Accepts JSON with base64-encoded audio:
          { "audio": "<base64 string>", "format": "webm" }

        Returns:
          { "text": "transcribed text" }

        Frontend usage:
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result.split(",")[1];
                const resp = await fetch(TRANSCRIBE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ audio: base64, format: "webm" }),
                });
                const { text } = await resp.json();
            };
            reader.readAsDataURL(audioBlob);
        """
        import tempfile
        import os
        import base64

        audio_b64 = request.get("audio", "")
        audio_fmt = request.get("format", "webm")

        if not audio_b64:
            return {"error": "Missing 'audio' field (base64-encoded audio)"}, 400

        audio_bytes = base64.b64decode(audio_b64)

        # Write to temp file — faster-whisper needs a file path
        suffix = f".{audio_fmt}"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        try:
            segments, info = self.model.transcribe(tmp_path, beam_size=3)
            text = " ".join(seg.text.strip() for seg in segments)
            return {"text": text}
        except Exception as e:
            return {"error": f"Transcription failed: {str(e)}"}, 500
        finally:
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Endpoint 4: Health check (simple GET, useful for testing)
# ---------------------------------------------------------------------------

@app.function(image=llm_image, timeout=10)
@modal.fastapi_endpoint(method="GET", label="health")
def health() -> dict:
    return {"status": "ok", "service": "interviewos-ai"}