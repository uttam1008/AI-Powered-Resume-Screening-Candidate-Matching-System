"""
llm/prompts.py — Prompt templates for Gemini LLM calls.
All prompts are structured for consistent JSON-parseable output.
"""

SCREENING_PROMPT = """
You are an AI hiring assistant.

Input:
Job Description:
{job_description}

Candidate Resume Data:
{resume_chunks}

Tasks:
- Give match score (0–100)
- List matched skills
- List missing skills
- Give explanation

Output JSON format exactly like this:
{{
  "match_score": 85,
  "matched_skills": ["Python", "FastAPI"],
  "missing_skills": ["Docker"],
  "explanation": "Strong candidate but lacks container experience."
}}
"""

RESUME_PARSE_PROMPT = """
Extract structured information from the following resume text.
Respond ONLY with valid JSON, no markdown.

## Resume Text
{resume_text}

## Response Format
{{
  "name": "<full name>",
  "email": "<email address>",
  "phone": "<phone number or null>",
  "skills": ["<skill1>", "<skill2>"],
  "experience_years": <integer>,
  "education": "<highest degree + institution>"
}}
"""
