import os
import json
import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class TelegramCommandHandler:
    """
    Handles Telegram Bot listener and user command processing.
    User can send commands like: 'Impossible machine niye video banao'
    """
    def __init__(self, config_path="config.json"):
        self.config_path = config_path
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        else:
            self.config = {}

    def poll_user_command(self) -> str:
        """
        Polls Telegram for user requests.
        Returns the category specified by user (e.g. 'Impossible Machines')
        or returns None if no explicit user message is received.
        """
        logging.info("📱 Polling Telegram for user commands...")
        # Simulated check for Telegram message in this environment
        # If user sends a command like 'Impossible machine niye video banao', extract category
        return None

    def parse_category_from_text(self, text: str) -> str:
        """
        Parses text like 'Impossible machine niye video banao' into category string 'Impossible Machines'
        """
        text_lower = text.lower()
        if "impossible" in text_lower:
            return "Impossible Machines"
        elif "futuristic" in text_lower:
            return "Futuristic Machines"
        elif "quantum" in text_lower:
            return "Quantum Contraptions"
        elif "steampunk" in text_lower:
            return "Steampunk Wonders"
        elif "alien" in text_lower:
            return "Alien Technology"
        elif "cybernetic" in text_lower:
            return "Cybernetic Gadgets"
        elif "perpetuum" in text_lower:
            return "Perpetuum Mobile"
        elif "time" in text_lower:
            return "Time Devices"
        elif "microscopic" in text_lower or "bot" in text_lower:
            return "Microscopic Bots"
        elif "cosmic" in text_lower:
            return "Cosmic Engines"
        return "Impossible Machines"

if __name__ == "__main__":
    handler = TelegramCommandHandler()
    test_msg = "Impossible machine niye video banao"
    cat = handler.parse_category_from_text(test_msg)
    print(f"Parsed Command '{test_msg}' -> Category: '{cat}'")
