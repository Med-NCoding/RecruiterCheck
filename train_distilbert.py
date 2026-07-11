# RecruitCheck DistilBERT Fine-Tuning Script
# Save this file or copy-paste this code directly into a Google Colab notebook cell!
# Make sure to set the Colab runtime to GPU (Runtime -> Change runtime type -> T4 GPU).

"""
## Step 1: Install Dependencies
Run this in a cell to install Hugging Face libraries:
!pip install -q transformers datasets accelerate evaluate safetensors
"""

import os
import shutil
import pandas as pd
import numpy as np
import torch
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    Trainer, 
    TrainingArguments,
    DataCollatorWithPadding
)
import evaluate

# 1. Load and prep dataset
# In Colab, upload dataset.csv by clicking the folder icon on the left panel.
csv_path = 'dataset.csv'
if not os.path.exists(csv_path):
    raise FileNotFoundError("Please upload 'dataset.csv' to the Colab files panel before running this script.")

print("Loading dataset...")
df = pd.read_csv(csv_path)

# Map string labels to binary (fake -> 1, real -> 0)
df['label'] = df['label'].map({'fake': 1, 'real': 0})

# Quick validation check
if df['label'].isnull().any():
    print("Warning: Found invalid labels in the dataset! Fixing them by dropping nulls...")
    df = df.dropna(subset=['label'])
df['label'] = df['label'].astype(int)

# Split into train and evaluation splits (85% train, 15% validation)
train_df, val_df = train_test_split(df, test_size=0.15, random_state=42, stratify=df['label'])

print(f"Train samples: {len(train_df)} | Validation samples: {len(val_df)}")

# Convert to Hugging Face Dataset format
from datasets import Dataset
train_dataset = Dataset.from_pandas(train_df)
val_dataset = Dataset.from_pandas(val_df)

# 2. Tokenization
model_checkpoint = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)

def preprocess_function(examples):
    # Truncate and pad messages to 256 tokens max to stay lightweight
    return tokenizer(examples["message"], truncation=True, max_length=256)

print("Tokenizing datasets...")
tokenized_train = train_dataset.map(preprocess_function, batched=True)
tokenized_val = val_dataset.map(preprocess_function, batched=True)

# 3. Define metrics function
accuracy_metric = evaluate.load("accuracy")
f1_metric = evaluate.load("f1")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    acc = accuracy_metric.compute(predictions=predictions, references=labels)["accuracy"]
    f1 = f1_metric.compute(predictions=predictions, references=labels)["f1"]
    return {"accuracy": acc, "f1": f1}

# 4. Load Model
# 2 labels: 0 = Legit (real), 1 = Scam (fake)
model = AutoModelForSequenceClassification.from_pretrained(
    model_checkpoint, 
    num_labels=2,
    id2label={0: "Legit", 1: "Scam"},
    label2id={"Legit": 0, "Scam": 1}
)

# 5. Training Arguments
training_args = TrainingArguments(
    output_dir="./results",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=5,
    weight_decay=0.01,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    logging_steps=10,
    fp16=torch.cuda.is_available(), # Use FP16 speedup if GPU is active
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_train,
    eval_dataset=tokenized_val,
    tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
    compute_metrics=compute_metrics,
)

# 6. Train!
print("Starting training on DistilBERT...")
trainer.train()

# 7. Evaluate on validation set
print("Evaluating trained model...")
eval_results = trainer.evaluate()
print("Evaluation results:", eval_results)

# 8. Save local artifact
saved_model_dir = "./recruitcheck_model"
print(f"Saving final fine-tuned model to '{saved_model_dir}'...")
trainer.save_model(saved_model_dir)
tokenizer.save_pretrained(saved_model_dir)

# 9. Sanity Check Inference
print("\n--- Running Sanity Check Inference ---")
model.eval()
test_messages = [
    "Earn $300 per day by rating apps online. Add Telegram: @pro_apps",  # Expected: Scam
    "Hi Natalie, I noticed your research in deep learning. Do you have time for a connection call this Thursday? - Google Careers", # Expected: Legit
]

for msg in test_messages:
    inputs = tokenizer(msg, return_tensors="pt", truncation=True, max_length=256)
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
        model.cuda()
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=-1)
    pred_class = torch.argmax(probs, dim=-1).item()
    confidence = probs[0][pred_class].item()
    label_name = "Scam (fake)" if pred_class == 1 else "Legit (real)"
    print(f"Message: {msg}\nPrediction: {label_name} | Confidence: {confidence:.2f}\n")

# 10. Zip the model directory for easy download
shutil.make_archive("recruitcheck_model", 'zip', saved_model_dir)
print("Finished! Download the 'recruitcheck_model.zip' file from the Colab file panel.")
