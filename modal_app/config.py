import modal

# Modal app
app = modal.App("interviewos-ai")

# Create this in Modal dashboard:
# Settings -> Secrets -> New Secret -> name: llm-api-key
# Key should be OPENAI_API_KEY or ANTHROPIC_API_KEY.
LLM_SECRET = modal.Secret.from_name("llm-api-key")

# Model provider config
MODEL_PROVIDER = "openai"  # "openai" | "anthropic"
MODEL_NAME = "gpt-4o-mini"

# Sampling and token limits
TEMPERATURE_GENERATE = 0.7
TEMPERATURE_EVALUATE = 0.3
MAX_TOKENS_GENERATE = 2000
MAX_TOKENS_EVALUATE = 1500
