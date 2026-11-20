from transformers import pipeline, set_seed

PROMPT = "the capital of india is"

set_seed(42)
generator = pipeline("text-generation", model="gpt2")
outputs = generator(PROMPT, max_new_tokens=5, do_sample=True, num_return_sequences=3)

for output in outputs:
    print(output["generated_text"], "\n---")
