---
title: "The Job Titles That Didn't Exist 3 Years Ago"
description: "AI isn't just displacing jobs — it's creating an entirely new tier of them. Here are the roles that barely existed before 2022, what they actually do, and which companies are hiring for them right now."
publishedAt: "2025-05-31"
readTime: "8 min read"
---

The conversation about AI and jobs usually goes one of two ways: either AI is going to take everyone's job, or it's going to create millions of new ones. Both framings miss what's actually happening on the ground right now.

A new tier of roles is emerging — roles that are senior, technical, and extremely well-compensated — that simply didn't exist three years ago. They're not entry-level prompt engineer gigs. They're positions that require deep expertise, pay competitively with the best engineering and product roles in tech, and are concentrated at a small number of frontier companies.

If you're a senior engineer, PM, or researcher and you haven't been paying attention to this shift, you probably should be.

## AI Engineer

**What it is:** Not a data scientist. Not an ML researcher. The AI Engineer sits at the intersection of software engineering and applied AI — they take foundation models (GPT-4, Claude, Gemini, Llama) and build reliable, production-grade products with them.

The core skills: prompt engineering at scale, RAG architectures, fine-tuning, evaluation frameworks, managing non-determinism in production. These engineers understand model behavior deeply enough to architect systems around its failure modes.

**Why it didn't exist before:** You couldn't build on top of capable foundation models before 2022. There was no GPT-3.5, no Claude, no accessible API for a powerful general-purpose model. The role only makes sense once the models exist.

**Who's hiring:** Anthropic, OpenAI, Cohere, Notion, Linear, Vercel, and frankly most product companies that have launched an AI feature in the last 18 months. The job title varies — "AI Engineer," "Applied AI Engineer," "LLM Engineer" — but it's the same role.

## Inference Engineer

**What it is:** Training a model costs a lot, but serving it costs more over time. The inference engineer's job is to make models fast and cheap to run in production — optimizing throughput, reducing latency, managing GPU utilization, quantization, batching, caching.

This is deep systems work. Think of it as performance engineering for AI: the kind of person who can reduce a 300ms model call to 80ms and cut serving costs by 60%.

**Why it didn't exist before:** When models were small or not deployed at consumer scale, serving cost was trivial. Now a company serving billions of inference requests per day has this as a core engineering problem. It's the difference between a product being profitable and not.

**Who's hiring:** Primarily the frontier labs — Anthropic, OpenAI, Groq, Cerebras, together.ai — and increasingly any large tech company running its own inference stack.

## AI Safety Researcher

**What it is:** Researchers working on making AI systems more aligned with human intent, less prone to dangerous or deceptive behavior, and more interpretable. This covers RLHF (reinforcement learning from human feedback), constitutional AI, scalable oversight, mechanistic interpretability, red-teaming, and more.

Unlike a typical ML researcher, the AI safety researcher's benchmark for success isn't model performance on a leaderboard — it's whether the model behaves better, more predictably, and more honestly.

**Why it didn't exist before:** The problem didn't exist before. When models were GPT-2 level — impressive but clearly limited — alignment wasn't a pressing concern. Now that models are capable enough to be genuinely useful in high-stakes contexts, getting their behavior right matters enormously.

**Who's hiring:** Anthropic (deeply mission-driven around safety), OpenAI's alignment team, DeepMind, and a handful of safety-focused research orgs. The number of open positions is small, but compensation and impact are both extremely high.

## AI Red Teamer

**What it is:** The person whose job is to try to break AI systems before they ship. Red teamers probe for jailbreaks, harmful outputs, biases, failure modes, and unexpected behaviors. They think adversarially about how models can be manipulated or misused.

Some red teamers come from security backgrounds; others from social science or philosophy. The common thread is adversarial thinking and a deep knowledge of model behavior.

**Why it didn't exist before:** Again — the models weren't capable enough to need it. You don't red-team a calculator. You do red-team a system that can write convincing phishing emails, synthesize information about dangerous topics, or be manipulated into roleplaying harmful scenarios.

**Who's hiring:** Anthropic, OpenAI, Google DeepMind, Scale AI, and increasingly any company deploying AI in regulated or high-stakes contexts (healthcare, legal, finance).

## LLM Ops / AI Platform Engineer

**What it is:** The DevOps/platform engineering equivalent for AI systems. This role builds the internal tooling, infrastructure, and pipelines that let a company deploy and monitor LLM-powered features reliably — evaluation frameworks, prompt versioning, A/B testing for models, observability, cost tracking.

**Why it didn't exist before:** The infrastructure problem only exists at scale. When a company has one AI feature used by a few internal teams, you don't need this. When you have 30 AI features in production and a team of 20 AI engineers building more, you need someone building the platform under them.

**Who's hiring:** Mostly larger companies that have meaningfully invested in AI — companies like Notion, Figma, Shopify, Databricks, and any company that's graduated from "AI experiment" to "AI as core product."

## AI Product Manager

**What it is:** A PM who specializes in AI-powered products. The differentiation from a regular PM: they understand model selection and tradeoffs, know how to write and evaluate prompts, can interpret evals, understand latency/cost tradeoffs, and can work fluidly with AI engineers on what's actually possible vs. what's a pipe dream.

The best AI PMs come from technical backgrounds — ex-engineers who moved to product, or researchers who discovered they loved the product side.

**Why it didn't exist before:** When AI was a feature sprinkled on top of a product, any good PM could handle it. Now AI is often the core product mechanism, and the PM needs to understand it at a meaningful depth. A PM who doesn't understand how RAG works is going to make bad product decisions.

**Who's hiring:** Perplexity, Anthropic, OpenAI, Cohere, and almost every AI-native company. Also increasingly at non-AI companies (Shopify, Figma, GitHub) for AI-specific product tracks.

## Foundation Model Researcher

**What it is:** The people building the models themselves — working on pretraining, architecture improvements, scaling laws, multimodality, and capability research. This is the most academically adjacent role on this list.

The distinction from a standard ML researcher: foundation model researchers specifically work on large-scale general-purpose models, not task-specific systems. They're thinking about emergent capabilities, training stability, data quality, and what happens when you scale by another order of magnitude.

**Who's hiring:** Almost exclusively the frontier labs: Anthropic, OpenAI, Mistral, Cohere, Google DeepMind, Meta AI. The talent pool is small, compensation is extraordinary, and it's one of the highest-leverage research positions that exists right now.

---

## What this means if you're a passive job seeker

The companies hiring for these roles are a specific, short list. Anthropic, OpenAI, Cohere, Mistral, Scale AI, Perplexity — plus a handful of AI-native product companies and the AI divisions of major tech companies.

Most of these roles don't get posted on LinkedIn first. They appear on company ATS systems — Ashby, Greenhouse, Lever — often before they make it to aggregators. And they fill fast.

The pattern for landing one of these roles:
1. Know exactly which companies you'd actually join
2. Be watching the right 10–20 companies closely, not scanning every job board
3. Apply early — often in the first few days of a role being posted

That's exactly what Crush is built for. Follow the companies you'd actually leave your current job for, set your role criteria, and get one targeted email the moment something opens. No noise, no irrelevant listings — just the signal.

[Track Anthropic, OpenAI, and the other frontier AI companies on Crush →](https://crushco.app)
