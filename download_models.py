from transformers import pipeline

print("Starting pre-download of offline AI models...")
print("Please ensure you have an active internet connection for this step.")

# 1. Download English to Hindi model
try:
    print("\nDownloading English -> Hindi model (approx 300MB)...")
    hi_model = pipeline("translation", model="Helsinki-NLP/opus-mt-en-hi")
    print("✅ Hindi model downloaded successfully!")
except Exception as e:
    print(f"❌ Failed to download Hindi model: {e}")

# 2. Download English to Marathi model
try:
    print("\nDownloading English -> Marathi model (approx 300MB)...")
    mr_model = pipeline("translation", model="Helsinki-NLP/opus-mt-en-mr")
    print("✅ Marathi model downloaded successfully!")
except Exception as e:
    print(f"❌ Failed to download Marathi model: {e}")

print("\n🎉 All models have been downloaded and cached!")
print("You can now run the application completely offline without any Wi-Fi!")
