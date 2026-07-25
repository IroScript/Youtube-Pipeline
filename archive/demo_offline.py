"""
Offline AI Agent Demo (no internet required)
"""

import asyncio
from ai_agent.core.conversation import ConversationManager


class MockAIModel:
    """Mock AI model for demonstration purposes"""
    
    def __init__(self, name="Demo AI"):
        self.name = name
        self.responses = [
            "Hello! I'm a demo AI assistant. I'm here to help you understand how the AI agent works!",
            "I'm doing well, thank you for asking! This is a demonstration of the conversation system.",
            "The AI agent framework includes conversation management, plugin systems, and multiple model support.",
            "You can extend this system with real AI models like Ollama, Hugging Face, or local transformers.",
            "This framework is designed to be modular and extensible for your specific needs.",
            "Thanks for trying out the AI agent! Check out the FREE_SETUP.md for real AI models."
        ]
        self.response_index = 0
    
    async def generate(self, messages):
        """Generate a mock response"""
        # Simulate thinking time
        await asyncio.sleep(0.5)
        
        # Get the last user message
        user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break
        
        # Generate contextual response
        if "hello" in user_message.lower() or "hi" in user_message.lower():
            response = self.responses[0]
        elif "how are you" in user_message.lower():
            response = self.responses[1]
        elif "what" in user_message.lower() and ("agent" in user_message.lower() or "this" in user_message.lower()):
            response = self.responses[2]
        elif "model" in user_message.lower() or "ai" in user_message.lower():
            response = self.responses[3]
        elif "extend" in user_message.lower() or "use" in user_message.lower():
            response = self.responses[4]
        else:
            # Use rotating responses
            response = self.responses[self.response_index % len(self.responses)]
            self.response_index += 1
        
        return MockResponse(response)


class MockResponse:
    """Mock response object"""
    def __init__(self, content):
        self.content = content


async def main():
    """Offline AI agent demo"""
    print("🤖 AI Agent Demo (Offline)")
    print("=" * 50)
    print("This is a demonstration of the AI agent framework")
    print("using a mock AI model (no internet required).")
    print("For real AI models, see FREE_SETUP.md")
    print("=" * 50)
    
    # Initialize mock model
    model = MockAIModel()
    
    # Initialize conversation manager
    conversation = ConversationManager(
        max_history=10,
        system_prompt="You are a helpful AI assistant demonstrating the agent framework."
    )
    
    print("\n💬 Interactive Chat Demo")
    print("Type 'quit' to exit, 'help' for commands")
    print("-" * 30)
    
    try:
        while True:
            # Get user input
            user_input = input("\n👤 You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if user_input.lower() == 'help':
                print("Available commands:")
                print("  help - Show this help")
                print("  quit - Exit the demo")
                print("  clear - Clear conversation history")
                print("  summary - Show conversation summary")
                continue
            
            if user_input.lower() == 'clear':
                conversation.clear_history()
                print("🧹 Conversation cleared!")
                continue
            
            if user_input.lower() == 'summary':
                summary = conversation.get_conversation_summary()
                print(f"📊 Conversation Summary:")
                print(f"   Total messages: {summary['total_messages']}")
                print(f"   User messages: {summary['user_messages']}")
                print(f"   Assistant messages: {summary['assistant_messages']}")
                continue
            
            if not user_input:
                continue
            
            # Add user message
            conversation.add_user_message(user_input)
            
            # Get messages for model
            messages = conversation.get_messages_for_api()
            
            # Generate response
            print("🤔 Thinking...")
            response = await model.generate(messages)
            
            # Add assistant response
            conversation.add_assistant_message(response.content)
            
            print(f"🤖 Assistant: {response.content}")
    
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrupted. Goodbye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    print("\n✨ Demo completed!")
    print("\n🚀 To use real AI models:")
    print("1. 📖 Read FREE_SETUP.md for free options")
    print("2. 🦙 Install Ollama for local models")
    print("3. 🤗 Get Hugging Face API token")
    print("4. 🔬 Install transformers for offline models")


if __name__ == "__main__":
    asyncio.run(main())
