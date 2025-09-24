import os, json, re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI

# ========= Setup =========
load_dotenv()  # expects OPENAI_API_KEY in backend/.env
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in .env")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="Excuse Engine API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev-friendly; tighten for prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========= Models =========
class GenerateReq(BaseModel):
    name: str
    age: int
    scenario: str
    # client can omit these; we infer below
    tone: Optional[str] = None               # "sincere" | "light-humour" | "formal"
    gender: Optional[str] = None             # "Male" | "Female" | ...
    audience: Optional[str] = None           # e.g., "Boss / Manager", "Partner"
    # Persona (optional)
    location: Optional[str] = None           # e.g., "Manchester"
    role: Optional[str] = None               # e.g., "software engineer"
    commute: Optional[str] = None            # "train" | "bus" | "car" | "walk"
    platform: Optional[str] = None           # "Slack" | "Teams" | "WhatsApp" | "Email"
    slang: bool = False                      # allow light slang if true
    constraints: Dict[str, Any] = Field(default_factory=dict)
    variants: int = Field(1, ge=1, le=5)

class GenerateResp(BaseModel):
    options: List[Dict[str, str]]  # [{ "text": "..." }]

# ========= Prompt + Safety =========
BANNED = {
    "doctor note","prescription","fake note","police","court","lawsuit",
    "insurance fraud","bank fraud","illegal","cheat exam","fake sick",
    "medical certificate","tax fraud",
}

SYSTEM_PROMPT = (
    "You write short, natural excuses in UK English, tailored to the user's persona.\n"
    "Rules:\n"
    "• 1–2 sentences, ≤ 45 words total.\n"
    "• No medical/legal claims, impersonation, harassment, or blaming specific people.\n"
    "• Avoid clichés like ‘personal reasons’/‘urgent matter’.\n"
    "• Prefer mundane, verifiable causes (prior commitment, transit/app/device hiccup).\n"
    "• Match formality to inferred audience (boss/client/teacher → formal; friends/partner → context-appropriate); use contractions.\n"
    "• Be age-appropriate (avoid teen slang for 30+; keep it simple for under 18) and gender-appropriate; no emojis; no follow-up/reschedule lines."
)

# ========= Utils =========
def safe_json_parse(content: str) -> Dict[str, Any]:
    """Parse JSON even if wrapped in code fences or extra text."""
    try:
        return json.loads(content)
    except Exception:
        pass
    stripped = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE | re.MULTILINE)
    try:
        return json.loads(stripped)
    except Exception:
        pass
    m = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if m:
        return json.loads(m.group(0))
    raise ValueError("Model returned invalid JSON")

def filter_and_normalize(options: List[Dict[str, Any]], limit: int) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for opt in options[:limit]:
        text = (opt.get("text") or "").strip()
        if not text:
            continue
        low = text.lower()
        if any(bad in low for bad in BANNED):
            continue
        if len(text.split()) > 50:  # hard cap
            continue
        out.append({"text": text})
    if not out:
        out = [{"text": "Running a few minutes behind after a connection hiccup—back online shortly."}]
    return out

# --- simple audience + tone inference from scenario text
WORK_WORDS = {"work","office","shift","deadline","manager","boss","colleague","meeting","standup","presentation","interview","client","project","deck","call","zoom","teams","slack"}
SCHOOL_WORDS = {"school","class","lecture","seminar","professor","teacher","tutor","assignment","exam","mock","campus"}
PARTNER_WORDS = {"partner","girlfriend","boyfriend","fiancé","fiance","husband","wife","date","anniversary","relationship"}
FRIEND_WORDS = {"friend","mate","hangout","drink","party","birthday","pub"}
FAMILY_WORDS = {"mum","dad","mother","father","parents","sister","brother","family","cousin","aunt","uncle"}
SERIOUS_WORDS = {"upset","hurt","argument","sorry","apologise","apologize","forgot","missed","trust","let down"}
MINOR_DELAY_WORDS = {"late","delay","running","traffic","train","bus","tube","metrolink","tram","signal","wifi","internet","connection","battery"}

def infer_audience_tone(s: str) -> Tuple[str, str]:
    """
    Return (audience_label, tone) from scenario text.
    audience_label ∈ {Boss/Manager, Client, Colleague, Teacher/Tutor, Partner, Friend, Parent/Family, General}
    tone ∈ {formal, sincere, light-humour}
    """
    t = s.lower()

    # audience
    if any(w in t for w in {"boss","manager"} | WORK_WORDS):
        # distinguish client vs internal
        if "client" in t:
            audience = "Client"
        elif any(w in t for w in {"colleague","coworker","teammate"}):
            audience = "Colleague"
        else:
            audience = "Boss / Manager"
        tone = "formal"
    elif any(w in t for w in SCHOOL_WORDS | {"teacher","tutor","professor"}):
        audience = "Teacher / Tutor"
        tone = "formal"
    elif any(w in t for w in PARTNER_WORDS):
        audience = "Partner"
        # serious vs minor
        if any(w in t for w in SERIOUS_WORDS):
            tone = "sincere"
        elif any(w in t for w in MINOR_DELAY_WORDS):
            tone = "light-humour"
        else:
            tone = "sincere"
    elif any(w in t for w in FRIEND_WORDS):
        audience = "Friend"
        tone = "light-humour"
    elif any(w in t for w in FAMILY_WORDS):
        audience = "Parent / Family"
        tone = "sincere"
    else:
        audience = "General"
        # choose by keywords
        if any(w in t for w in MINOR_DELAY_WORDS):
            tone = "sincere"
        else:
            tone = "sincere"

    return audience, tone

def age_style_hint(age: int) -> str:
    if age < 18:
        return "Keep phrasing simple and clear (under 18)."
    if age < 30:
        return "Modern, natural phrasing; avoid heavy slang."
    if age < 45:
        return "Neutral professional phrasing."
    return "Slightly more formal, straightforward phrasing (age 45+)."

# ========= Routes =========
@app.get("/", tags=["health"])
def health() -> Dict[str, bool]:
    return {"ok": True}

@app.post("/generate", response_model=GenerateResp, tags=["generate"])
def generate(req: GenerateReq) -> GenerateResp:
    # infer audience + tone if not provided, or override generic inputs
    inferred_audience, inferred_tone = infer_audience_tone(req.scenario)
    audience_final = req.audience or inferred_audience
    tone_final = (req.tone or inferred_tone).lower()
    if tone_final not in {"sincere","formal","light-humour"}:
        tone_final = inferred_tone

    # persona string
    persona_bits = []
    if req.location: persona_bits.append(f"Location: {req.location}")
    if req.role: persona_bits.append(f"Role: {req.role}")
    if req.gender: persona_bits.append(f"Gender: {req.gender}")
    if req.age is not None: persona_bits.append(f"Age: {req.age}")
    if req.commute: persona_bits.append(f"Commute: {req.commute}")
    if req.platform: persona_bits.append(f"Platform: {req.platform}")
    if audience_final: persona_bits.append(f"Audience: {audience_final}")
    persona_bits.append(f"Tone: {tone_final}")
    if req.slang: persona_bits.append("Style: light slang allowed")
    persona_bits.append(age_style_hint(req.age))
    persona_str = " | ".join(persona_bits)

    user_msg = (
        'Return STRICT JSON:\n{ "options": [ { "text": string } ] }\n'
        "Make it read like the user would speak; subtly weave in relevant persona details "
        "(place, app, commute) only if they help. Do not add a follow-up line.\n"
        f'Persona: "{persona_str}"\n'
        f"Scenario: {req.scenario}"
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
        )
        content = completion.choices[0].message.content or "{}"
        data = safe_json_parse(content)
        if "options" not in data or not isinstance(data["options"], list):
            raise ValueError("JSON missing 'options' list")
        options = filter_and_normalize(data["options"], req.variants)
        return GenerateResp(options=options)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
