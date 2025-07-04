# Claude App Builder 🤖

An automated system that uses Claude Code to build complete applications through Test-Driven Development.

## What It Does

This system runs Claude Code CLI in different "roles" to automatically:
- Read your requirements
- Write comprehensive tests
- Implement code to pass tests
- Review and refine the code
- Continue until your app is complete

## Quick Start

1. **Define Your App**
   ```bash
   # Edit todo.md with your app requirements
   nano todo.md
   ```

2. **Run the Builder**
   ```bash
   ./automated-workflow.sh
   ```

3. **Watch It Build**
   - Claude writes tests first
   - Then implements features
   - Reviews and iterates
   - Updates progress automatically

## How It Works

The system uses 5 Claude roles in sequence with advanced automation:

1. **Test Writer** - Writes comprehensive tests for working features
2. **Test Reviewer** - Ensures test quality and logical correctness
3. **Developer** - Creates complete, functional implementations
4. **Code Reviewer** - Validates code quality and runs all tests
5. **Coordinator** - Updates progress and manages workflow

### Advanced Features

- 🔄 **Git Integration** - Auto-commits, checkpoints, and release tags
- 📦 **Auto Dependencies** - Installs npm packages automatically
- 🏗️ **Build Verification** - Ensures code compiles successfully
- 🔁 **Error Recovery** - Retry logic and rollback on failures
- 📋 **Project Templates** - Pre-built structures for common project types
- 🎯 **Smart Detection** - Auto-suggests templates based on requirements

## Example Apps You Can Build

- Web APIs (REST, GraphQL)
- CLI tools
- Desktop apps (Electron)
- Mobile apps (React Native)
- Automation scripts
- Data processing pipelines
- And more!

## Requirements

- Claude Code subscription
- Bash terminal
- Node.js (for JavaScript projects)
- Other language runtimes as needed

## Files

- `todo.md` - Your app requirements
- `memory.md` - System's knowledge base
- `automated-workflow.sh` - The magic happens here
- `CLAUDE.md` - Instructions for Claude

## Tips

- Start with clear, specific requirements
- Break complex features into smaller tasks
- Let the system handle the implementation details
- Review generated code for learning

---

Built with Claude Code 🚀