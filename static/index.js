// Frontend Client Logic for RecruitCheck

// Real examples for quick testing
const EXAMPLES = {
    scam1: "Hello! Excellent remote job opportunity. Earn $300 per day by rating apps online. It takes only 30 minutes a day. Payment sent via USDT or bank wire. Interested? Add our manager on Telegram: @app_ranking_pro",
    scam2: "CONGRATULATIONS! You have been accepted for a remote data verification role at Pfizer Pharmaceuticals. Monthly salary is $9,000. Before we ship your corporate apple workstation, you must send a refundable insurance fee of $120 via Bitcoin or Razer Gold gift card. Reply now.",
    legit1: "Hi Natalie, I hope you're doing well. I'm a recruiter at Pinterest, and I'm currently looking for an ML Data Scientist to join our Ads Ranking team. I noticed your published work on recommendation systems and deep learning. Your academic and practical background seems like a fantastic match for the technical challenges our team faces. Would you be open to a brief connection call this Thursday afternoon?"
};

let currentScannedMessage = "";

function loadExample(key) {
    const textarea = document.getElementById("message-input");
    if (EXAMPLES[key]) {
        textarea.value = EXAMPLES[key];
    }
}

// Attach scanner trigger
document.getElementById("scan-btn").addEventListener("click", runSecurityScan);

async function runSecurityScan() {
    const messageInput = document.getElementById("message-input").value.trim();
    if (!messageInput) {
        alert("Please paste a recruiter message first!");
        return;
    }

    currentScannedMessage = messageInput;

    // Show loading UI
    const scanBtn = document.getElementById("scan-btn");
    const btnText = document.getElementById("btn-text");
    const btnSpinner = document.getElementById("btn-spinner");
    
    btnText.textContent = "Scanning...";
    btnSpinner.classList.remove("hidden");
    scanBtn.disabled = true;

    // Reset results & simulator state
    resetSimulator();

    try {
        // 1. Call Classifier API
        const classifyResponse = await fetch("/api/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageInput })
        });

        if (!classifyResponse.ok) {
            throw new Error(`Classifier error: ${classifyResponse.statusText}`);
        }

        const classification = await classifyResponse.json();

        // 2. Call Explanation API
        const explainResponse = await fetch("/api/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: messageInput,
                is_scam: classification.is_scam,
                confidence: classification.confidence
            })
        });

        if (!explainResponse.ok) {
            throw new Error(`Explanation error: ${explainResponse.statusText}`);
        }

        const explanation = await explainResponse.json();

        // 3. Update UI
        displayResults(classification, explanation);
        
    } catch (error) {
        console.error("Analysis failed:", error);
        alert(`Verification failed: ${error.message}`);
    } finally {
        // Restore button state
        btnText.textContent = "Run Security Scan";
        btnSpinner.classList.add("hidden");
        scanBtn.disabled = false;
    }
}

function displayResults(classification, explanation) {
    // Reveal results panel, hide empty state
    document.getElementById("empty-state").classList.add("hidden");
    document.getElementById("results-state").classList.remove("hidden");

    // Dynamic banner styles based on verdict
    const banner = document.getElementById("verdict-banner");
    const badge = document.getElementById("verdict-badge");
    const title = document.getElementById("verdict-title");
    const sourceLabel = document.getElementById("verdict-source");

    banner.className = "verdict-banner"; // reset
    badge.className = "verdict-badge"; // reset

    // Format display elements
    const confidencePct = Math.round(classification.confidence * 100);
    sourceLabel.textContent = classification.source === "model" ? "Fine-tuned DistilBERT v1" : "LLM API Fallback";

    if (classification.is_scam) {
        banner.classList.add("scam-verdict");
        badge.classList.add("badge-scam");
        badge.textContent = classification.verdict_tier.replace("_", " ");
        title.textContent = "Potential Scam Identified";
        
        // Enable simulator controls
        document.getElementById("step-1-btn").disabled = false;
        document.getElementById("step-2-btn").disabled = false;
        document.getElementById("step-3-btn").disabled = false;
        document.getElementById("reset-sim-btn").disabled = false;

        // Initialize simulator chat with welcome message
        setSimulatorSystemMessage("Outreach flagged as suspicious. Scammer Simulator is active. Select Stage 1 to simulate their next playbook step.");
    } else {
        banner.classList.add("legit-verdict");
        badge.classList.add("badge-legit");
        badge.textContent = classification.verdict_tier.replace("_", " ");
        title.textContent = "Looks Legitimate";

        // Disable simulator controls for legit messages
        document.getElementById("step-1-btn").disabled = true;
        document.getElementById("step-2-btn").disabled = true;
        document.getElementById("step-3-btn").disabled = true;
        document.getElementById("reset-sim-btn").disabled = true;

        setSimulatorSystemMessage("This message appears legitimate. The simulator is deactivated as there is no scam playbook to execute.");
    }

    // Set score wheel gauge
    animateScoreCircle(confidencePct, classification.is_scam);

    // Set reasoning text
    document.getElementById("reasoning-block").textContent = explanation.verdict_reasoning;

    // Set bullet flags
    const flagsList = document.getElementById("flags-list");
    flagsList.innerHTML = "";
    flagsList.className = classification.is_scam ? "flags-list scam-list" : "flags-list legit-list";
    
    const points = explanation.red_flags && explanation.red_flags.length > 0 
        ? explanation.red_flags 
        : (classification.is_scam ? ["Unsolicited contact", "Suspicious link or chat redirect"] : ["Professional wording", "Clear company verification"]);

    points.forEach(flag => {
        const li = document.createElement("li");
        li.textContent = flag;
        flagsList.appendChild(li);
    });
}

function animateScoreCircle(targetPct, isScam) {
    const circle = document.getElementById("score-circle");
    const text = document.getElementById("score-text");
    
    circle.className = "circle"; // reset
    if (isScam) {
        circle.classList.add(targetPct > 80 ? "scam-stroke" : "warn-stroke");
    } else {
        circle.classList.add("legit-stroke");
    }

    // Animate dasharray
    let current = 0;
    const interval = setInterval(() => {
        if (current >= targetPct) {
            clearInterval(interval);
            current = targetPct;
        }
        // circular-chart perimeter is 100
        circle.setAttribute("stroke-dasharray", `${current}, 100`);
        text.textContent = `${current}%`;
        current += 2;
    }, 15);
}

/* Simulator controls */

function setSimulatorSystemMessage(text) {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.innerHTML = `
        <div class="chat-bubble received system">
            <p>${text}</p>
        </div>
    `;
}

function resetSimulator() {
    setSimulatorSystemMessage("Enter a message above and run the verification scan. Once verified, you can simulate the scam playbook here.");
    document.getElementById("step-1-btn").disabled = true;
    document.getElementById("step-2-btn").disabled = true;
    document.getElementById("step-3-btn").disabled = true;
    document.getElementById("reset-sim-btn").disabled = true;
    
    // Remove active step highlighting
    document.querySelectorAll(".btn-step").forEach(btn => btn.classList.remove("active"));
}

async function runSimulationStage(stageNum) {
    if (!currentScannedMessage) return;

    // Highlight selected step in panel
    document.querySelectorAll(".btn-step").forEach(btn => btn.classList.remove("active"));
    document.getElementById(`step-${stageNum}-btn`).classList.add("active");

    const chatMessages = document.getElementById("chat-messages");

    // Add User response text in chat window to simulate interaction leading to this stage
    let userMsg = "";
    if (stageNum === 1) {
        userMsg = "Yes, I am interested in this remote role! Can you tell me how to apply?";
    } else if (stageNum === 2) {
        userMsg = "Okay, I've added the manager on the chat app. What is the interview process?";
    } else if (stageNum === 3) {
        userMsg = "I've signed the offer letter. How do we get my home workstation setup?";
    }

    // Display user bubble
    appendBubble("You", userMsg, "sent");

    // Display dynamic typing indicator
    const typingBubble = appendTypingIndicator();
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Fetch simulation message
        const response = await fetch("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: currentScannedMessage,
                stage: stageNum
            })
        });

        if (!response.ok) {
            throw new Error("Could not fetch simulation details");
        }

        const data = await response.json();

        // Delay slightly for realistic typing effect
        setTimeout(() => {
            typingBubble.remove();
            appendBubble(data.sender, data.content, "received scam-message", data.playbook_focus);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1200);

    } catch (error) {
        console.error("Simulation failed:", error);
        typingBubble.remove();
        appendBubble("System Error", "Failed to load simulation output.", "received system");
    }
}

function appendBubble(sender, text, typeClass, playbookFocus = null) {
    const chatMessages = document.getElementById("chat-messages");
    
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${typeClass}`;
    
    let contentHtml = `<strong>${sender}</strong><br><p>${text}</p>`;
    
    if (playbookFocus) {
        contentHtml += `<span class="playbook-badge">⚠️ Playbook Objective: ${playbookFocus}</span>`;
    }
    
    bubble.innerHTML = contentHtml;
    chatMessages.appendChild(bubble);
    return bubble;
}

function appendTypingIndicator() {
    const chatMessages = document.getElementById("chat-messages");
    const indicator = document.createElement("div");
    indicator.className = "typing-bubble";
    indicator.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    chatMessages.appendChild(indicator);
    return indicator;
}
