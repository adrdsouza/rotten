---
type: "agent_requested"
description: "Example description"
---
# Augment Rules — Vendure + Qwik + TypeScript + Tailwind v4 (with Hallucination Safeguards)

## 1. Context First & Validation
- Always check Augment memories, workspace context, and code files before answering.
- Use retrieval (MCP tools) as your source of truth; **never rely on internal model knowledge**.
- If the answer cannot be determined from memory or tools, explicitly respond: “I don’t know” instead of guessing.

## 2. Tool Priority Order
Use tools strictly in this sequence:
1. Git MCP – repo state, history, diffs
2. Vendure Docs MCP – API/schema reference
3. Redis MCP – caching/data store
4. GraphQL MCP – schema/query validation
5. Other local MCP tools
6. **Web search only as a last resort**, and always summarize findings with citations.

## 3. Anti-Hallucination Protocols
- Use **RAG-style grounding**: base responses only on known context or source data. :contentReference[oaicite:6]{index=6}
- Prompt itself must enforce: “Only use tools or memory; do not generate unsupported info.”
- Apply **chain-of-thought reasoning** when evaluating complex logic to ensure transparency. :contentReference[oaicite:7]{index=7}
- When generating code, **run validation**—either via AI verifier or human review/testing. :contentReference[oaicite:8]{index=8}
- Encourage reviewers to mark AI-generated sections for extra scrutiny. :contentReference[oaicite:9]{index=9}

## 4. Stack & Code Standards
(As previously defined—TypeScript strictness, Qwik components, Tailwind design tokens, Vendure service layers, GraphQL code generation, structure, etc.)

## 5. Output & Delivery
- Provide runnable, complete examples with imports, types, and reasoning.
- Point out trade-offs and pitfalls.
- If unsure, admit uncertainty—not hallucinate.

## 6. Code Hygiene & Oversight
- Maintain ESLint, Prettier, tests, reviewers, and documentation.
- Remove unused or commented-out code.
- Use JSDoc/TypeDoc and keep up code reviews.

