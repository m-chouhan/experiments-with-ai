import sys

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

PROMPT = sys.argv[1] if len(sys.argv) > 1 else "Hello, my name is"
TOP_K = 10
BAR_WIDTH = 40

tokenizer = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2")

inputs = tokenizer(PROMPT, return_tensors="pt")
print(f"Prompt: {PROMPT!r}")
print("Tokens:", [tokenizer.decode(token_id) for token_id in inputs["input_ids"][0]])

with torch.no_grad():
    logits = model(**inputs).logits[0, -1]
probabilities = torch.softmax(logits, dim=-1)
top = torch.topk(probabilities, TOP_K)

print(f"\nTop {TOP_K} guesses for the next token:")
for probability, token_id in zip(top.values, top.indices):
    bar = "█" * round(probability.item() / top.values[0].item() * BAR_WIDTH)
    print(f"{tokenizer.decode(token_id)!r:>14}  {probability.item():6.2%}  {bar}")
