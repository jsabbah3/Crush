-- ============================================================
-- 004_seed_companies.sql
-- 20 hand-picked AI / tech companies.
--
-- source_type / source_id identify the ATS board used for
-- automated job ingestion:
--   greenhouse → boards.greenhouse.io/{source_id}/jobs
--   lever      → jobs.lever.co/{source_id}
--   ashby      → jobs.ashbyhq.com/{source_id}
--
-- source_id is NULL where the board token needs manual
-- verification before a scraper is pointed at it.
-- ============================================================

INSERT INTO companies (name, slug, description, website, industry, headquarters, source_type, source_id)
VALUES

-- AI
('Anthropic',
 'anthropic',
 'AI safety company building reliable, interpretable, and steerable AI systems.',
 'https://anthropic.com',
 'AI', 'San Francisco, CA',
 'greenhouse', 'anthropic'),

('OpenAI',
 'openai',
 'AI research and deployment company behind ChatGPT and the GPT model family.',
 'https://openai.com',
 'AI', 'San Francisco, CA',
 'greenhouse', 'openai'),

('Scale AI',
 'scale-ai',
 'Data platform that accelerates the development of AI for enterprise and government.',
 'https://scale.com',
 'AI', 'San Francisco, CA',
 'greenhouse', 'scaleai'),

('Hugging Face',
 'hugging-face',
 'The AI community building the future of open-source machine learning.',
 'https://huggingface.co',
 'AI', 'New York, NY',
 'greenhouse', 'huggingface'),

('Cohere',
 'cohere',
 'Enterprise AI platform for language understanding and generation.',
 'https://cohere.com',
 'AI', 'Toronto, Canada',
 'greenhouse', 'cohere'),

-- Developer Tools
('Vercel',
 'vercel',
 'Platform for frontend developers to build and deploy fast web applications.',
 'https://vercel.com',
 'Developer Tools', 'San Francisco, CA',
 'ashby', 'vercel'),

('Linear',
 'linear',
 'Project management tool built for modern, high-velocity software teams.',
 'https://linear.app',
 'Developer Tools', 'San Francisco, CA',
 'ashby', 'linear'),

('Cursor',
 'cursor',
 'AI-powered code editor that helps engineers write code faster.',
 'https://cursor.com',
 'Developer Tools', 'San Francisco, CA',
 'ashby', 'cursor'),

('Supabase',
 'supabase',
 'Open source Firebase alternative built on top of PostgreSQL.',
 'https://supabase.com',
 'Developer Tools', 'San Francisco, CA',
 'ashby', 'supabase'),

('Retool',
 'retool',
 'Low-code platform for building internal tools and dashboards.',
 'https://retool.com',
 'Developer Tools', 'San Francisco, CA',
 'greenhouse', 'retool'),

-- Fintech
('Stripe',
 'stripe',
 'Financial infrastructure platform for the internet.',
 'https://stripe.com',
 'Fintech', 'San Francisco, CA',
 'greenhouse', 'stripe'),

('Brex',
 'brex',
 'Financial services and spend management software for startups and enterprises.',
 'https://brex.com',
 'Fintech', 'San Francisco, CA',
 'lever', 'brex'),

('Plaid',
 'plaid',
 'Financial data network powering thousands of fintech applications.',
 'https://plaid.com',
 'Fintech', 'San Francisco, CA',
 'lever', 'plaid'),

-- Productivity / Collaboration
('Notion',
 'notion',
 'All-in-one workspace for notes, docs, wikis, and project management.',
 'https://notion.so',
 'Productivity', 'San Francisco, CA',
 'greenhouse', 'notion'),

('Figma',
 'figma',
 'Collaborative design platform for UI/UX designers and product teams.',
 'https://figma.com',
 'Design Tools', 'San Francisco, CA',
 'greenhouse', 'figma'),

('Airtable',
 'airtable',
 'Low-code platform combining spreadsheet flexibility with database structure.',
 'https://airtable.com',
 'Productivity', 'San Francisco, CA',
 'greenhouse', 'airtable'),

-- Infrastructure
('Cloudflare',
 'cloudflare',
 'Global network platform providing security, performance, and reliability.',
 'https://cloudflare.com',
 'Infrastructure', 'San Francisco, CA',
 'greenhouse', 'cloudflare'),

('Databricks',
 'databricks',
 'Unified data and AI platform built on the lakehouse architecture.',
 'https://databricks.com',
 'Data & AI', 'San Francisco, CA',
 'greenhouse', 'databricks'),

-- Consumer / Social
('Spotify',
 'spotify',
 'Audio streaming and media services provider with 600M+ monthly active users.',
 'https://spotify.com',
 'Entertainment', 'Stockholm, Sweden',
 'greenhouse', 'spotify'),

('Discord',
 'discord',
 'Voice, video, and text communication platform for communities and teams.',
 'https://discord.com',
 'Social', 'San Francisco, CA',
 'greenhouse', 'discord')

ON CONFLICT (slug) DO UPDATE SET
  description  = EXCLUDED.description,
  website      = EXCLUDED.website,
  industry     = EXCLUDED.industry,
  headquarters = EXCLUDED.headquarters,
  source_type  = EXCLUDED.source_type,
  source_id    = EXCLUDED.source_id,
  updated_at   = NOW();
