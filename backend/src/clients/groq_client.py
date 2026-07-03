from groq import Groq

from backend.src.configs.api_config import api_settings

class GroqClient:
    def __init__(self):
        self.client = Groq(
            api_key=api_settings
        )