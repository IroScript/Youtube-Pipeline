#!/usr/bin/env python3
"""
Simple demo of the AI Agent using local transformers (no external APIs needed).
This demonstrates the core functionality without requiring API keys.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from ai_agent.models.local_transformers_model import LocalTransformersModel
from ai_agent.core.conversation import ConversationManager
from ai_agent.core.config import Config
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

console = Console()

async def demo_local_transformers():
    """Demo using local transformers model."""
    
    console.print(Panel.fit(
        "[bold blue]AI Agent Local Demo[/bold blue]\n"
        "[dim]Using local transformers (no API keys required)[/dim]",
        border_style="blue"
    ))
    
    try:
        # Initialize the model
        console.print("[yellow]Loading local model (this may take a moment)...[/yellow]")
        model = LocalTransformersModel(
            model_name="gpt2",  # Small model for quick loading
            max_length=100,
            temperature=0.7
        )
        
        # Initialize conversation manager
        conversation = ConversationManager()
        
        console.print("[green]✅ Model loaded successfully![/green]")
        console.print("\n[dim]Type 'quit' to exit[/dim]")
        
        while True:
            # Get user input
            user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]")
            
            if user_input.lower() in ['quit', 'exit']:
                break
            
            # Add user message to conversation
            conversation.add_message("user", user_input)
            
            # Generate response
            console.print("[yellow]Thinking...[/yellow]")
            
            try:
                response = await model.generate(conversation.get_messages())
                
                # Add assistant response to conversation
                conversation.add_message("assistant", response.content)
                
                # Display response
                console.print(Panel(
                    response.content,
                    title="[bold green]AI Assistant[/bold green]",
                    border_style="green"
                ))
                
            except Exception as e:
                console.print(f"[red]Error: {e}[/red]")
    
    except Exception as e:
        console.print(f"[red]Failed to initialize model: {e}[/red]")
        console.print("\n[yellow]This demo requires the transformers library.[/yellow]")
        console.print("[yellow]Install it with: pip install transformers torch[/yellow]")

async def demo_offline_agent():
    """Demo the full agent in offline mode."""
    
    console.print(Panel.fit(
        "[bold green]AI Agent Offline Demo[/bold green]\n"
        "[dim]Showcasing core functionality without external APIs[/dim]",
        border_style="green"
    ))
    
    # Create a simple mock response function
    async def mock_generate(messages, **kwargs):
        """Mock AI response for demo purposes."""
        from ai_agent.models.base import ModelResponse
        
        # Get the last user message
        last_message = messages[-1] if messages else None
        user_text = last_message.content if last_message else ""
        
        # Generate a simple response based on input
        if "hello" in user_text.lower():
            response = "Hello! I'm your AI assistant. How can I help you today?"
        elif "weather" in user_text.lower():
            response = "I'd check the weather for you, but I'm running in offline mode. In a full setup, I could connect to weather APIs!"
        elif "time" in user_text.lower():
            import datetime
            response = f"The current time is {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        elif "calculate" in user_text.lower() or any(op in user_text for op in ['+', '-', '*', '/']):
            try:
                # Simple math evaluation (be careful with eval in production!)
                import re
                math_expr = re.search(r'[\d+\-*/\s\(\)\.]+', user_text)
                if math_expr:
                    result = eval(math_expr.group())
                    response = f"The result is: {result}"
                else:
                    response = "I can help with basic math. Try something like: calculate 2 + 3"
            except:
                response = "I couldn't calculate that. Please try a simpler expression."
        else:
            response = f"I understand you said: '{user_text}'. I'm currently running in demo mode, but I can help with various tasks!"
        
        return ModelResponse(
            content=response,
            model="demo-model",
            usage={"prompt_length": len(user_text), "completion_length": len(response)},
            finish_reason="stop",
            metadata={"provider": "demo"}
        )
    
    # Initialize conversation manager
    conversation = ConversationManager()
    
    console.print("[green]✅ Demo agent ready![/green]")
    console.print("\n[dim]Try asking about: weather, time, math calculations, or just chat![/dim]")
    console.print("[dim]Type 'quit' to exit[/dim]")
    
    while True:
        # Get user input
        user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]")
        
        if user_input.lower() in ['quit', 'exit']:
            break
        
        # Add user message to conversation
        conversation.add_message("user", user_input)
        
        # Generate response using mock function
        console.print("[yellow]Thinking...[/yellow]")
        
        try:
            response = await mock_generate(conversation.get_messages())
            
            # Add assistant response to conversation
            conversation.add_message("assistant", response.content)
            
            # Display response
            console.print(Panel(
                response.content,
                title="[bold green]AI Assistant (Demo Mode)[/bold green]",
                border_style="green"
            ))
            
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")

async def main():
    """Main demo function."""
    
    console.print(Panel.fit(
        "[bold magenta]🤖 AI Agent Demo[/bold magenta]\n"
        "[dim]Welcome to your AI assistant![/dim]",
        border_style="magenta"
    ))
    
    console.print("\n[yellow]Choose a demo mode:[/yellow]")
    console.print("1. [green]Local Transformers Demo[/green] (requires transformers library)")
    console.print("2. [blue]Offline Agent Demo[/blue] (no dependencies)")
    console.print("3. [red]Exit[/red]")
    
    choice = Prompt.ask("\nEnter your choice", choices=["1", "2", "3"])
    
    if choice == "1":
        await demo_local_transformers()
    elif choice == "2":
        await demo_offline_agent()
    elif choice == "3":
        console.print("Goodbye!")
        return
    
    console.print("\n[dim]Thanks for trying the AI Agent demo![/dim]")

if __name__ == "__main__":
    asyncio.run(main())
