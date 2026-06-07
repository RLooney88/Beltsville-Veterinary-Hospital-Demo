"""Generate animal images using OpenAI GPT Image 1."""
import asyncio
import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

API_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "images" / "animals"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    # DOG LIFE STAGES
    "dog-puppy": "A joyful golden retriever puppy sitting on green grass, tongue out, bright happy eyes, warm sunlight, soft bokeh background, professional pet photography, photorealistic, no text, no people, no watermarks",
    "dog-adult": "A healthy happy adult labrador retriever standing in a park, athletic build, shiny coat, confident expression, warm afternoon light, professional pet photography, photorealistic, no text, no people",
    "dog-senior": "A gentle senior golden retriever with gray muzzle resting peacefully on a soft blanket indoors, wise calm eyes, warm lighting, dignified and comfortable, heartwarming not sad, professional pet photography, photorealistic, no text, no people",
    # DOG CONDITIONS
    "dog-dental": "A calm friendly dog at a veterinary clinic having teeth gently examined by a vet, the dog looks relaxed, clean clinical setting, warm tones, not graphic, professional veterinary photography, photorealistic, no text",
    "dog-allergy-skin": "A golden retriever being gently examined by a veterinarian checking the dog's ear, the dog is calm, warm clinical setting, caring interaction, not graphic, professional veterinary photography, photorealistic, no text",
    "dog-arthritis": "A senior dog walking slowly on a nature path, slight stiffness visible but still dignified and loved, warm golden hour light, compassionate not sad, professional pet photography, photorealistic, no text, no people",
    "dog-obesity": "A slightly overweight but happy corgi sitting next to a healthy food bowl, warm kitchen setting, non-judgmental and caring tone, professional pet photography, photorealistic, no text, no people",
    "dog-gi": "A concerned but loving owner gently placing hand on a resting dog's belly, warm indoor setting, caring not dramatic, soft lighting, professional pet photography, photorealistic, no text",
    # CAT LIFE STAGES
    "cat-kitten": "An adorable playful tabby kitten sitting on a soft white blanket, big curious eyes, tiny paws, warm natural light, joyful and innocent, professional pet photography, photorealistic, no text, no people",
    "cat-adult": "A beautiful healthy adult tabby cat sitting regally on a windowsill, confident green eyes, sleek coat, warm afternoon sunlight streaming in, professional pet photography, photorealistic, no text, no people",
    "cat-senior": "A gentle senior cat with slightly graying face resting peacefully on a cozy cushion, soft wise eyes, warm indoor lighting, dignified and comfortable, heartwarming not sad, professional pet photography, photorealistic, no text, no people",
    # CAT CONDITIONS
    "cat-dental": "A calm cat at a veterinary clinic being gently examined, the vet's gloved hand near the cat's mouth, the cat is relaxed, clean clinical setting, warm tones, not graphic, professional veterinary photography, photorealistic, no text",
    "cat-urinary": "A cat near a clean litter box in a bright bathroom, the cat looks alert but comfortable, informational tone not dramatic, warm indoor lighting, professional pet photography, photorealistic, no text, no people",
    "cat-kidney": "A senior cat drinking water from a clean bowl, peaceful kitchen setting, warm natural light, calm and content expression, professional pet photography, photorealistic, no text, no people",
    "cat-respiratory": "A white cat with slightly runny nose being comforted, gentle and caring, warm indoor setting, not graphic or distressing, compassionate, professional pet photography, photorealistic, no text",
    "cat-hyperthyroid": "A thin senior cat being weighed on a veterinary scale, gentle hands supporting, clean clinical setting, professional and caring, warm tones, not sad, professional veterinary photography, photorealistic, no text",
    # RABBIT
    "rabbit-young": "An adorable baby lop-eared rabbit sitting in soft hay, tiny and fluffy, bright curious eyes, warm natural light, joyful and innocent, professional pet photography, photorealistic, no text, no people",
    "rabbit-adult": "A beautiful healthy adult holland lop rabbit sitting alertly on green grass, soft fur, bright eyes, warm afternoon light, professional pet photography, photorealistic, no text, no people",
    "rabbit-senior": "A gentle older rabbit resting comfortably on a soft fleece blanket, calm peaceful expression, warm indoor lighting, dignified, professional pet photography, photorealistic, no text, no people",
    "rabbit-dental": "A cute rabbit munching on fresh timothy hay, showing healthy teeth and natural chewing behavior, warm natural light, informational and positive, professional pet photography, photorealistic, no text, no people",
    "rabbit-gi": "A rabbit sitting next to fresh hay and leafy greens, healthy digestive context, bright kitchen or living room setting, warm natural light, positive and informational, professional pet photography, photorealistic, no text, no people",
    # GUINEA PIG
    "gp-young": "An adorable baby guinea pig sitting in soft bedding, tiny and fluffy with bright curious eyes, warm natural light, joyful and innocent, professional pet photography, photorealistic, no text, no people",
    "gp-adult": "A beautiful healthy adult guinea pig with multicolored fur sitting in a clean habitat with hay, bright alert eyes, warm lighting, professional pet photography, photorealistic, no text, no people",
    "gp-dental": "A cute guinea pig eating fresh vegetables and hay, showing healthy chewing behavior, bright natural light, positive and informational, professional pet photography, photorealistic, no text, no people",
    "gp-skin": "A fluffy guinea pig being gently held in caring hands, soft fur visible, warm indoor lighting, gentle and compassionate, not graphic, professional pet photography, photorealistic, no text",
}

async def generate_one(gen, slug, prompt):
    out = OUT_DIR / f"{slug}.png"
    if out.exists():
        print(f"SKIP {slug} (exists)")
        return
    try:
        print(f"GEN  {slug}...")
        images = await gen.generate_images(prompt=prompt, model="gpt-image-1", number_of_images=1)
        if images:
            out.write_bytes(images[0])
            print(f"OK   {slug} -> {out}")
        else:
            print(f"FAIL {slug}: no image returned")
    except Exception as e:
        print(f"FAIL {slug}: {e}")

async def main():
    gen = OpenAIImageGeneration(api_key=API_KEY)
    for slug, prompt in PROMPTS.items():
        await generate_one(gen, slug, prompt)
        await asyncio.sleep(1)  # Small delay between calls
    print("DONE - all images generated")

if __name__ == "__main__":
    asyncio.run(main())
