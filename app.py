import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RecruitCheck API", description="Recruiter message verification and simulation engine")

# Global variables for model
MODEL_DIR = "./recruitcheck_model"
model = None
tokenizer = None
model_loaded = False

# Try to load fine-tuned model
try:
    if os.path.exists(MODEL_DIR) and os.path.exists(os.path.join(MODEL_DIR, "model.safetensors")):
        logger.info("Loading fine-tuned DistilBERT model...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.eval()  # Put in evaluation mode
        model_loaded = True
        logger.info("DistilBERT model loaded successfully!")
    else:
        logger.warning(f"Fine-tuned model not found at {MODEL_DIR}. Running with Groq LLM classification fallback.")
except Exception as e:
    logger.error(f"Error loading DistilBERT model: {e}. Falling back to Groq LLM classification.")
    model_loaded = False

# Setup Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info("Groq client initialized successfully!")
    except Exception as e:
        logger.error(f"Error initializing Groq client: {e}")
else:
    logger.warning("GROQ_API_KEY environment variable is missing! Please configure it in .env")

# Request / Response Schemas
class MessageInput(BaseModel):
    message: str

class ClassifyResponse(BaseModel):
    is_scam: bool
    confidence: float
    verdict_tier: str
    source: str  # "model" or "llm_fallback"

class ExplainInput(BaseModel):
    message: str
    is_scam: bool
    confidence: float

class ExplainResponse(BaseModel):
    red_flags: list[str]
    verdict_reasoning: str

class SimulateInput(BaseModel):
    message: str
    stage: int  # 1, 2, or 3

class SimulateResponse(BaseModel):
    stage: int
    sender: str
    content: str
    playbook_focus: str

# 1. /classify endpoint
@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_message(data: MessageInput):
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
    
    # Check if model is loaded and we can run local inference
    if model_loaded:
        try:
            logger.info("Classifying using fine-tuned DistilBERT model...")
            inputs = tokenizer(data.message, return_tensors="pt", truncation=True, max_length=256)
            # DistilBERT does not accept token_type_ids, filter them out
            inputs = {k: v for k, v in inputs.items() if k in ['input_ids', 'attention_mask']}
            with torch.no_grad():
                outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            pred_class = torch.argmax(probs, dim=-1).item()
            confidence = probs[0][pred_class].item()
            
            is_scam = (pred_class == 1)
            
            # Map tier based on score
            if is_scam:
                if confidence > 0.85:
                    verdict_tier = "CRITICAL_RISK"
                elif confidence > 0.60:
                    verdict_tier = "HIGH_RISK"
                else:
                    verdict_tier = "SUSPICIOUS"
            else:
                if confidence > 0.85:
                    verdict_tier = "SAFE"
                elif confidence > 0.60:
                    verdict_tier = "LOW_RISK"
                else:
                    verdict_tier = "UNVERIFIED"
            
            return ClassifyResponse(
                is_scam=is_scam,
                confidence=confidence,
                verdict_tier=verdict_tier,
                source="model"
            )
        except Exception as e:
            logger.error(f"Error during DistilBERT inference: {e}. Trying Groq fallback.")
            # Fallthrough to Groq
    
    # FALLBACK: Use Groq API to classify
    if not groq_client:
        raise HTTPException(status_code=503, detail="Classification model failed and Groq API key is not configured.")
        
    try:
        logger.info("Classifying using Groq LLM Fallback...")
        prompt = f"""
Analyze the following recruiter outreach message and classify it as a SCAM (fake recruiter outreach seeking to defraud, steal data, or offer fake task/equipment check scams) or LEGIT (real corporate recruiter or staffing agency outreach).

Message:
\"\"\"{data.message}\"\"\"

Output format must be exactly like this JSON block and nothing else:
{{
  "is_scam": true/false,
  "confidence": 0.0 to 1.0,
  "verdict_tier": "CRITICAL_RISK" / "HIGH_RISK" / "SUSPICIOUS" / "SAFE" / "LOW_RISK" / "UNVERIFIED"
}}

Rules:
- If is_scam is true:
  - confidence > 0.85 -> "CRITICAL_RISK"
  - confidence > 0.60 -> "HIGH_RISK"
  - confidence <= 0.60 -> "SUSPICIOUS"
- If is_scam is false:
  - confidence > 0.85 -> "SAFE"
  - confidence > 0.60 -> "LOW_RISK"
  - confidence <= 0.60 -> "UNVERIFIED"
"""
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a professional security parser. Only output valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.1
        )
        response_text = chat_completion.choices[0].message.content
        import json
        result = json.loads(response_text)
        
        return ClassifyResponse(
            is_scam=result.get("is_scam", True),
            confidence=result.get("confidence", 0.9),
            verdict_tier=result.get("verdict_tier", "HIGH_RISK"),
            source="llm_fallback"
        )
    except Exception as e:
        logger.error(f"Error in Groq classification fallback: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


# 2. /explain endpoint
@app.post("/api/explain", response_model=ExplainResponse)
async def explain_verdict(data: ExplainInput):
    if not groq_client:
        # If Groq is missing, provide a generic fallback explanation
        if data.is_scam:
            return ExplainResponse(
                red_flags=["Communication channel redirect (Telegram/WhatsApp)", "Vague high pay rate", "Immediate task offer"],
                verdict_reasoning="This message contains typical linguistic patterns found in recruitment scams, including unsolicited high-paying offers and a request to move to text-based chat apps."
            )
        else:
            return ExplainResponse(
                red_flags=[],
                verdict_reasoning="This message appears standard, referring to a specific corporate identity, standard interview methods, and professional communication patterns."
            )
            
    try:
        logger.info("Generating explanation using Groq...")
        
        verdict_str = "SCAM" if data.is_scam else "LEGITIMATE"
        
        prompt = f"""
You are an expert cybersecurity analyst specializing in recruitment scams and phishing detection.
The classifier has labeled the following message as {verdict_str} with {data.confidence * 100:.1f}% confidence.

Message:
\"\"\"{data.message}\"\"\"

Provide:
1. A list of 2 to 4 bullet points explaining specific "red flags" (if it is a scam) or "green flags" (if it is legit) based strictly on text indicators present in the message (e.g. Telegram handles, check scams, specific company domains, high-pay for basic tasks, professional vs casual grammar). Keep each bullet brief and direct.
2. A brief, 2-3 sentence overall plain-English reasoning verdict.

Output format must be exactly like this JSON block and nothing else:
{{
  "red_flags": ["bullet point 1", "bullet point 2"],
  "verdict_reasoning": "Detailed plain-English summary reasoning paragraph."
}}
"""
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful cybersecurity analyst. Output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.3
        )
        import json
        result = json.loads(chat_completion.choices[0].message.content)
        
        return ExplainResponse(
            red_flags=result.get("red_flags", []),
            verdict_reasoning=result.get("verdict_reasoning", "No explanation available.")
        )
    except Exception as e:
        logger.error(f"Error in explain endpoint: {e}")
        return ExplainResponse(
            red_flags=["Failed to fetch automated explanation details"],
            verdict_reasoning=f"System error: {str(e)}. Classification verdict stands."
        )


# 3. /simulate endpoint
@app.post("/api/simulate", response_model=SimulateResponse)
async def simulate_scam(data: SimulateInput):
    if not groq_client:
        # Generic fallback messages if Groq is not configured
        fallbacks = {
            1: "Hi, thank you for connecting! We will proceed with a written interview on Telegram. Please message our manager @job_verification to begin right now. What is your Telegram handle?",
            2: "Congratulations! Our hiring board reviewed your written test and decided to offer you the position. Here is your digital PDF offer letter. Please sign and return it. We will now proceed with equipment setup.",
            3: "To set up your home office, we will send you a certified check of $3,500. You must deposit it via your mobile app and send the funds to our verified software supplier immediately. Please send a screenshot of the deposit."
        }
        foci = {
            1: "Moving off-platform to Telegram/WhatsApp for unverified chat screening.",
            2: "Instant hire without face-to-face contact using generic PDF offer letters.",
            3: "Financial fraud: Advancing a bad check to force victim to send real money to 'vendors'."
        }
        return SimulateResponse(
            stage=data.stage,
            sender="Recruitment Coordinator",
            content=fallbacks.get(data.stage, "End of simulation."),
            playbook_focus=foci.get(data.stage, "Unknown stage.")
        )

    try:
        logger.info(f"Simulating stage {data.stage} of scam...")
        
        # Descriptions of the stages based on real playbook
        stages_info = {
            1: {
                "name": "Stage 1: Move Off-Platform & Written Interview",
                "goal": "The scammer tries to move the conversation to Telegram, WhatsApp, Signal, or Skype. They claim the interview is a 'written questionnaire' or 'text chat'.",
                "tone": "Polite but prompt, asking the user to add a specific handle or phone number."
            },
            2: {
                "name": "Stage 2: Low-Effort Task and Immediate Job Offer",
                "goal": "The candidate 'passes' the interview immediately (within hours). The scammer sends a PDF contract or job offer. They might assign a trivial start task (e.g. 'rating' apps, liking videos, or filling a basic spreadsheet).",
                "tone": "Congratulatory, authoritative, onboarding-focused."
            },
            3: {
                "name": "Stage 3: The Equipment Check/Invoice Fraud",
                "goal": "The scammer tells the user they need to purchase work hardware (laptop, monitor, software). They send a digital check (image), tell the user to print and mobile-deposit it, and then wire/Zelle/Crypto the funds to a 'verified vendor'. The check will eventually bounce, leaving the victim out of pocket.",
                "tone": "Urgent, guiding the user step-by-step through the bank deposit and payment process."
            }
        }
        
        stage_desc = stages_info.get(data.stage, stages_info[1])
        
        prompt = f"""
You are simulating a recruiter scammer based on a documented scam playbook. 
Your goal is to show the user exactly what the scammer's next message would look like if they kept responding.

Original outreach message pasted by the user:
\"\"\"{data.message}\"\"\"

Current Simulation Stage: {stage_desc['name']}
Playbook Focus & Goal: {stage_desc['goal']}
Tone: {stage_desc['tone']}

Write the message the scammer would send at this stage. Keep the message realistic, persuasive, and aligned with standard scam tactics (like specific links, names, check amounts, or handles).

Output format must be exactly like this JSON block and nothing else:
{{
  "sender": "e.g., Recruiting Manager or HR Coordinator",
  "content": "The actual message content here.",
  "playbook_focus": "1 sentence explanation of what trick the scammer is trying to pull here."
}}
"""
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a professional scam simulation assistant. Output only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
            temperature=0.7
        )
        import json
        result = json.loads(chat_completion.choices[0].message.content)
        
        return SimulateResponse(
            stage=data.stage,
            sender=result.get("sender", "Scammer Representative"),
            content=result.get("content", "Simulation message missing."),
            playbook_focus=result.get("playbook_focus", "Playbook focus missing.")
        )
        
    except Exception as e:
        logger.error(f"Error in simulate endpoint: {e}")
        return SimulateResponse(
            stage=data.stage,
            sender="System Error",
            content=f"Could not generate simulation: {str(e)}",
            playbook_focus="System error occurred."
        )

# Mount static files at root
# Note: Mount static files AFTER API endpoints so they take precedence.
try:
    os.makedirs("./static", exist_ok=True)
    app.mount("/", StaticFiles(directory="./static", html=True), name="static")
except Exception as e:
    logger.error(f"Error mounting static files: {e}")

# Fallback index route
@app.get("/")
async def read_index():
    return FileResponse("./static/index.html")
