/**
 * Seed the AI / frontier-tech company list.
 * Usage: npx tsx scripts/seed-ai-companies.ts
 * Safe to re-run — skips companies that already exist by name.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

type Input = {
  name: string;
  website?: string;
  headquarters?: string;
  industry?: string;
};

const COMPANIES: Input[] = [
  // ── Frontier model labs ──────────────────────────────────────────────────
  { name: "OpenAI",          website: "openai.com",          headquarters: "San Francisco, CA" },
  { name: "Anthropic",       website: "anthropic.com",       headquarters: "San Francisco, CA" },
  { name: "Google DeepMind", website: "deepmind.google",     headquarters: "London, UK" },
  { name: "xAI",             website: "x.ai",                headquarters: "San Francisco, CA" },
  { name: "Meta AI",         website: "ai.meta.com",         headquarters: "Menlo Park, CA" },
  { name: "Mistral AI",      website: "mistral.ai",          headquarters: "Paris, France" },
  { name: "Cohere",          website: "cohere.com",          headquarters: "Toronto, Canada" },
  { name: "AI21 Labs",       website: "ai21.com",            headquarters: "Tel Aviv, Israel" },
  { name: "Inflection AI",   website: "inflection.ai",       headquarters: "Palo Alto, CA" },
  { name: "Reka AI",         website: "reka.ai",             headquarters: "San Francisco, CA" },
  { name: "Aleph Alpha",     website: "aleph-alpha.com",     headquarters: "Heidelberg, Germany" },
  { name: "Black Forest Labs",website: "blackforestlabs.ai", headquarters: "Freiburg, Germany" },
  { name: "DeepSeek",        website: "deepseek.com",        headquarters: "Hangzhou, China" },
  { name: "Moonshot AI",     website: "moonshot.cn",         headquarters: "Beijing, China" },
  { name: "Zhipu AI",        website: "zhipuai.cn",          headquarters: "Beijing, China" },
  { name: "Baichuan AI",     website: "baichuan-ai.com",     headquarters: "Beijing, China" },
  { name: "01.AI",           website: "01.ai",               headquarters: "Beijing, China" },
  { name: "MiniMax",         website: "minimax.io",          headquarters: "Shanghai, China" },
  { name: "Stability AI",    website: "stability.ai",        headquarters: "London, UK" },
  { name: "ByteDance",       website: "bytedance.com",       headquarters: "Beijing, China" },
  { name: "Sakana AI",       website: "sakana.ai",           headquarters: "Tokyo, Japan" },
  { name: "Liquid AI",       website: "liquid.ai",           headquarters: "Boston, MA" },
  { name: "Essential AI",    website: "essential.ai",        headquarters: "San Francisco, CA" },
  { name: "Contextual AI",   website: "contextual.ai",       headquarters: "San Francisco, CA" },
  { name: "Kyutai",          website: "kyutai.org",          headquarters: "Paris, France" },
  { name: "Alibaba (Qwen)",  website: "alibaba.com",         headquarters: "Hangzhou, China" },
  { name: "Baidu (Ernie)",   website: "baidu.com",           headquarters: "Beijing, China" },
  { name: "Tencent (Hunyuan)",website: "tencent.com",        headquarters: "Shenzhen, China" },
  { name: "Naver",           website: "naver.com",           headquarters: "Seongnam, South Korea" },
  { name: "Rinna",           website: "rinna.co.jp",         headquarters: "Tokyo, Japan" },
  { name: "Krutrim",         website: "krutrim.com",         headquarters: "Bangalore, India" },
  { name: "Sarvam AI",       website: "sarvam.ai",           headquarters: "Bangalore, India" },
  { name: "Yandex",          website: "yandex.com",          headquarters: "Amsterdam, Netherlands" },
  { name: "G42",             website: "g42.ai",              headquarters: "Abu Dhabi, UAE" },
  { name: "Silo AI",         website: "silo.ai",             headquarters: "Helsinki, Finland" },

  // ── Chips & compute infrastructure ───────────────────────────────────────
  { name: "NVIDIA",          website: "nvidia.com",          headquarters: "Santa Clara, CA",   industry: "Semiconductors" },
  { name: "AMD",             website: "amd.com",             headquarters: "Santa Clara, CA",   industry: "Semiconductors" },
  { name: "Cerebras",        website: "cerebras.net",        headquarters: "Sunnyvale, CA",     industry: "Semiconductors" },
  { name: "Groq",            website: "groq.com",            headquarters: "Mountain View, CA", industry: "Cloud Infrastructure" },
  { name: "SambaNova",       website: "sambanova.ai",        headquarters: "Palo Alto, CA",     industry: "Semiconductors" },
  { name: "Tenstorrent",     website: "tenstorrent.com",     headquarters: "Santa Clara, CA",   industry: "Semiconductors" },
  { name: "Graphcore",       website: "graphcore.ai",        headquarters: "Bristol, UK",       industry: "Semiconductors" },
  { name: "Lightmatter",     website: "lightmatter.com",     headquarters: "Boston, MA",        industry: "Semiconductors" },
  { name: "Etched",          website: "etched.com",          headquarters: "Cupertino, CA",     industry: "Semiconductors" },
  { name: "CoreWeave",       website: "coreweave.com",       headquarters: "Roseland, NJ",      industry: "Cloud Infrastructure" },
  { name: "Lambda Labs",     website: "lambdalabs.com",      headquarters: "San Francisco, CA", industry: "Cloud Infrastructure" },
  { name: "Together AI",     website: "together.ai",         headquarters: "San Francisco, CA", industry: "Cloud Infrastructure" },
  { name: "Fireworks AI",    website: "fireworks.ai",        headquarters: "Redwood City, CA",  industry: "Cloud Infrastructure" },
  { name: "Modal",           website: "modal.com",           headquarters: "New York, NY",      industry: "Cloud Infrastructure" },
  { name: "Anyscale",        website: "anyscale.com",        headquarters: "San Francisco, CA", industry: "Cloud Infrastructure" },

  // ── MLOps / data / evals ─────────────────────────────────────────────────
  { name: "Hugging Face",    website: "huggingface.co",      headquarters: "New York, NY",      industry: "Developer Tools" },
  { name: "Databricks",      website: "databricks.com",      headquarters: "San Francisco, CA", industry: "Data & Analytics" },
  { name: "Snowflake",       website: "snowflake.com",       headquarters: "Bozeman, MT",       industry: "Data & Analytics" },
  { name: "Scale AI",        website: "scale.com",           headquarters: "San Francisco, CA" },
  { name: "Surge AI",        website: "surgehq.ai",          headquarters: "San Francisco, CA" },
  { name: "Snorkel AI",      website: "snorkel.ai",          headquarters: "Redwood City, CA" },
  { name: "Labelbox",        website: "labelbox.com",        headquarters: "San Francisco, CA" },
  { name: "Weights & Biases",website: "wandb.ai",            headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Braintrust",      website: "braintrust.dev",      headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Langfuse",        website: "langfuse.com",        headquarters: "Berlin, Germany",   industry: "Developer Tools" },
  { name: "Arize AI",        website: "arize.com",           headquarters: "Oakland, CA" },
  { name: "Fiddler AI",      website: "fiddler.ai",          headquarters: "Menlo Park, CA" },
  { name: "Patronus AI",     website: "patronus.ai",         headquarters: "San Francisco, CA" },
  { name: "Galileo",         website: "rungalileo.io",       headquarters: "San Francisco, CA" },

  // ── AI frameworks / retrieval / search ───────────────────────────────────
  { name: "LangChain",       website: "langchain.com",       headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "LlamaIndex",      website: "llamaindex.ai",       headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Pinecone",        website: "pinecone.io",         headquarters: "New York, NY",      industry: "Developer Tools" },
  { name: "Weaviate",        website: "weaviate.io",         headquarters: "Amsterdam, Netherlands", industry: "Developer Tools" },
  { name: "Chroma",          website: "trychroma.com",       headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Qdrant",          website: "qdrant.tech",         headquarters: "Berlin, Germany",   industry: "Developer Tools" },
  { name: "Vectara",         website: "vectara.com",         headquarters: "Palo Alto, CA",     industry: "Developer Tools" },
  { name: "Exa",             website: "exa.ai",              headquarters: "San Francisco, CA" },
  { name: "Tavily",          website: "tavily.com",          headquarters: "San Francisco, CA" },
  { name: "Kagi",            website: "kagi.com",            headquarters: "Palo Alto, CA" },
  { name: "Perplexity",      website: "perplexity.ai",       headquarters: "San Francisco, CA" },

  // ── Generative media ─────────────────────────────────────────────────────
  { name: "Character.AI",    website: "character.ai",        headquarters: "Menlo Park, CA" },
  { name: "Midjourney",      website: "midjourney.com",      headquarters: "San Francisco, CA" },
  { name: "Runway",          website: "runwayml.com",        headquarters: "New York, NY" },
  { name: "ElevenLabs",      website: "elevenlabs.io",       headquarters: "New York, NY" },
  { name: "Suno",            website: "suno.com",            headquarters: "Cambridge, MA" },
  { name: "Udio",            website: "udio.com",            headquarters: "New York, NY" },
  { name: "Pika Labs",       website: "pika.art",            headquarters: "Palo Alto, CA" },
  { name: "Luma AI",         website: "lumalabs.ai",         headquarters: "San Francisco, CA" },
  { name: "Synthesia",       website: "synthesia.io",        headquarters: "London, UK" },
  { name: "HeyGen",          website: "heygen.com",          headquarters: "Los Angeles, CA" },
  { name: "Descript",        website: "descript.com",        headquarters: "San Francisco, CA" },
  { name: "Freepik",         website: "freepik.com",         headquarters: "Málaga, Spain" },
  { name: "Photoroom",       website: "photoroom.com",       headquarters: "Paris, France" },
  { name: "KlingAI",         website: "klingai.com",         headquarters: "Beijing, China" },
  { name: "CapCut",          website: "capcut.com",          headquarters: "Beijing, China" },
  { name: "Canva",           website: "canva.com",           headquarters: "Sydney, Australia", industry: "Design" },
  { name: "Gamma",           website: "gamma.app",           headquarters: "San Francisco, CA" },
  { name: "Cartesia",        website: "cartesia.ai",         headquarters: "San Francisco, CA" },
  { name: "Deepgram",        website: "deepgram.com",        headquarters: "San Francisco, CA" },
  { name: "AssemblyAI",      website: "assemblyai.com",      headquarters: "San Francisco, CA" },
  { name: "Rime",            website: "rime.ai",             headquarters: "San Francisco, CA" },
  { name: "PlayHT",          website: "play.ht",             headquarters: "San Francisco, CA" },
  { name: "Sesame",          website: "sesame.com",          headquarters: "San Francisco, CA" },
  { name: "Inworld",         website: "inworld.ai",          headquarters: "San Francisco, CA" },
  { name: "Retell AI",       website: "retellai.com",        headquarters: "San Francisco, CA" },
  { name: "Tavus",           website: "tavus.io",            headquarters: "San Francisco, CA" },

  // ── Coding AI / developer tools ──────────────────────────────────────────
  { name: "Cursor",          website: "cursor.com",          headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Cognition",       website: "cognition.ai",        headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Replit",          website: "replit.com",          headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Codeium",         website: "codeium.com",         headquarters: "Mountain View, CA", industry: "Developer Tools" },
  { name: "Magic",           website: "magic.dev",           headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Poolside",        website: "poolside.ai",         headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Tabnine",         website: "tabnine.com",         headquarters: "Tel Aviv, Israel",  industry: "Developer Tools" },
  { name: "Lovable",         website: "lovable.dev",         headquarters: "Stockholm, Sweden", industry: "Developer Tools" },
  { name: "Vercel",          website: "vercel.com",          headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "GitHub Copilot",  website: "github.com",          headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Sourcegraph",     website: "sourcegraph.com",     headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Continue",        website: "continue.dev",        headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Glean",           website: "glean.com",           headquarters: "Palo Alto, CA",     industry: "Enterprise Software" },

  // ── AI agents / enterprise automation ────────────────────────────────────
  { name: "Sierra",          website: "sierra.ai",           headquarters: "San Francisco, CA" },
  { name: "Adept",           website: "adept.ai",            headquarters: "San Francisco, CA" },
  { name: "Imbue",           website: "imbue.com",           headquarters: "San Francisco, CA" },
  { name: "Rogo",            website: "rogo.ai",             headquarters: "New York, NY" },
  { name: "Mercor",          website: "mercor.com",          headquarters: "San Francisco, CA" },
  { name: "Decagon",         website: "decagon.ai",          headquarters: "San Francisco, CA" },
  { name: "Cresta",          website: "cresta.com",          headquarters: "San Francisco, CA" },
  { name: "Writer",          website: "writer.com",          headquarters: "San Francisco, CA" },
  { name: "Jasper",          website: "jasper.ai",           headquarters: "Austin, TX" },
  { name: "Notion AI",       website: "notion.so",           headquarters: "San Francisco, CA" },
  { name: "MultiOn",         website: "multion.ai",          headquarters: "San Francisco, CA" },
  { name: "Induced AI",      website: "induced.ai",          headquarters: "San Francisco, CA" },
  { name: "Orby",            website: "orby.ai",             headquarters: "San Francisco, CA" },
  { name: "/dev/agents",     website: "devagents.ai",        headquarters: "San Francisco, CA" },

  // ── Sales / GTM AI ───────────────────────────────────────────────────────
  { name: "Gong",            website: "gong.io",             headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Clari",           website: "clari.com",           headquarters: "Sunnyvale, CA",     industry: "Sales Technology" },
  { name: "Salesloft",       website: "salesloft.com",       headquarters: "Atlanta, GA",       industry: "Sales Technology" },
  { name: "Outreach",        website: "outreach.io",         headquarters: "Seattle, WA",       industry: "Sales Technology" },
  { name: "Apollo.io",       website: "apollo.io",           headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Common Room",     website: "commonroom.io",       headquarters: "Seattle, WA",       industry: "Sales Technology" },
  { name: "UserGems",        website: "usergems.com",        headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Regie.ai",        website: "regie.ai",            headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Nooks",           website: "nooks.ai",            headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Aircover",        website: "aircover.ai",         headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "11x",             website: "11x.ai",              headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Clay",            website: "clay.com",            headquarters: "New York, NY",      industry: "Sales Technology" },
  { name: "Instantly",       website: "instantly.ai",        headquarters: "San Francisco, CA", industry: "Sales Technology" },
  { name: "Customer.io",     website: "customer.io",         headquarters: "Portland, OR",      industry: "Marketing Technology" },
  { name: "Arcads",          website: "arcads.ai",           headquarters: "Paris, France",     industry: "Marketing Technology" },
  { name: "OpusClip",        website: "opus.pro",            headquarters: "San Francisco, CA", industry: "Marketing Technology" },
  { name: "AdCreative.ai",   website: "adcreative.ai",       headquarters: "Geneva, Switzerland",industry: "Marketing Technology" },
  { name: "Copy.ai",         website: "copy.ai",             headquarters: "Memphis, TN",       industry: "Marketing Technology" },
  { name: "Crossbeam",       website: "crossbeam.com",       headquarters: "Philadelphia, PA",  industry: "Sales Technology" },

  // ── Customer support AI ──────────────────────────────────────────────────
  { name: "Ada",             website: "ada.cx",              headquarters: "Toronto, Canada",   industry: "Customer Service" },
  { name: "Lorikeet",        website: "lorikeet.ai",         headquarters: "Sydney, Australia", industry: "Customer Service" },
  { name: "Forethought",     website: "forethought.ai",      headquarters: "San Francisco, CA", industry: "Customer Service" },
  { name: "Intercom Fin",    website: "intercom.com",        headquarters: "San Francisco, CA", industry: "Customer Service" },
  { name: "Crisp",           website: "crisp.chat",          headquarters: "Nantes, France",    industry: "Customer Service" },
  { name: "Parloa",          website: "parloa.com",          headquarters: "Berlin, Germany",   industry: "Customer Service" },
  { name: "Siena AI",        website: "siena.cx",            headquarters: "San Francisco, CA", industry: "Customer Service" },

  // ── Productivity / meeting AI ────────────────────────────────────────────
  { name: "Otter.ai",        website: "otter.ai",            headquarters: "Mountain View, CA", industry: "Productivity" },
  { name: "Read AI",         website: "read.ai",             headquarters: "Seattle, WA",       industry: "Productivity" },
  { name: "Fireflies.ai",    website: "fireflies.ai",        headquarters: "San Francisco, CA", industry: "Productivity" },
  { name: "Granola",         website: "granola.so",          headquarters: "London, UK",        industry: "Productivity" },
  { name: "Tactiq",          website: "tactiq.io",           headquarters: "San Francisco, CA", industry: "Productivity" },
  { name: "Metaview",        website: "metaview.ai",         headquarters: "London, UK",        industry: "Productivity" },
  { name: "Happyscribe",     website: "happyscribe.com",     headquarters: "Dublin, Ireland",   industry: "Productivity" },
  { name: "PLAUD",           website: "plaud.ai",            headquarters: "New York, NY",      industry: "Productivity" },
  { name: "Fyxer.ai",        website: "fyxer.ai",            headquarters: "London, UK",        industry: "Productivity" },
  { name: "Superhuman AI",   website: "superhuman.com",      headquarters: "San Francisco, CA", industry: "Productivity" },
  { name: "Mem",             website: "mem.ai",              headquarters: "San Francisco, CA", industry: "Productivity" },
  { name: "Grammarly",       website: "grammarly.com",       headquarters: "San Francisco, CA", industry: "Productivity" },
  { name: "Motion",          website: "usemotion.com",       headquarters: "San Francisco, CA", industry: "Productivity" },

  // ── Healthcare AI ────────────────────────────────────────────────────────
  { name: "Isomorphic Labs",            website: "isomorphiclabs.com",   headquarters: "London, UK",          industry: "Healthcare" },
  { name: "Recursion Pharmaceuticals",  website: "recursion.com",        headquarters: "Salt Lake City, UT",  industry: "Healthcare" },
  { name: "Insitro",                    website: "insitro.com",           headquarters: "South San Francisco, CA", industry: "Healthcare" },
  { name: "Tempus AI",                  website: "tempus.com",           headquarters: "Chicago, IL",         industry: "Healthcare" },
  { name: "Abridge",                    website: "abridge.com",          headquarters: "Pittsburgh, PA",      industry: "Healthcare" },
  { name: "Assort Health",              website: "assort.health",        headquarters: "San Francisco, CA",   industry: "Healthcare" },
  { name: "Hippocratic AI",             website: "hippocratic.ai",       headquarters: "Palo Alto, CA",       industry: "Healthcare" },
  { name: "Nabla",                      website: "nabla.com",            headquarters: "Paris, France",       industry: "Healthcare" },
  { name: "PathAI",                     website: "pathai.com",           headquarters: "Boston, MA",          industry: "Healthcare" },
  { name: "Iterative Health",           website: "iterative.health",     headquarters: "Cambridge, MA",       industry: "Healthcare" },
  { name: "Cleerly",                    website: "cleerly.com",          headquarters: "New York, NY",        industry: "Healthcare" },
  { name: "Viz.ai",                     website: "viz.ai",               headquarters: "San Francisco, CA",   industry: "Healthcare" },
  { name: "Aidoc",                      website: "aidoc.com",            headquarters: "Tel Aviv, Israel",    industry: "Healthcare" },
  { name: "K Health",                   website: "khealth.com",          headquarters: "New York, NY",        industry: "Healthcare" },

  // ── Legal AI ─────────────────────────────────────────────────────────────
  { name: "Solve Intelligence",  website: "solveintelligence.com", headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "Harvey",              website: "harvey.ai",             headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "Robin AI",            website: "robin.ai",              headquarters: "London, UK",        industry: "Legal Technology" },
  { name: "Spellbook",           website: "spellbook.legal",       headquarters: "Toronto, Canada",   industry: "Legal Technology" },
  { name: "Ironclad",            website: "ironcladapp.com",       headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "EvenUp",              website: "evenuplaw.com",         headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "Hebbia",              website: "hebbia.ai",             headquarters: "New York, NY",      industry: "Legal Technology" },
  { name: "Delve",               website: "delve.ai",              headquarters: "New York, NY",      industry: "Legal Technology" },
  { name: "Eve",                 website: "eveai.com",             headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "Crosby",              website: "crosby.ai",             headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "Alma",                website: "alma.com",              headquarters: "New York, NY",      industry: "Legal Technology" },
  { name: "Salient",             website: "salient.ai",            headquarters: "San Francisco, CA", industry: "Legal Technology" },
  { name: "Further AI",          website: "further.ai",            headquarters: "San Francisco, CA", industry: "Legal Technology" },

  // ── Finance AI ───────────────────────────────────────────────────────────
  { name: "Numerai",         website: "numer.ai",             headquarters: "San Francisco, CA", industry: "Financial Technology" },
  { name: "Kensho",          website: "kensho.com",           headquarters: "Cambridge, MA",     industry: "Financial Technology" },
  { name: "Bretton AI",      website: "bretton.ai",           headquarters: "San Francisco, CA", industry: "Financial Technology" },
  { name: "Atomic Canyon",   website: "atomiccanyon.com",     headquarters: "San Francisco, CA", industry: "Financial Technology" },

  // ── Robotics ─────────────────────────────────────────────────────────────
  { name: "Figure AI",           website: "figure.ai",           headquarters: "Sunnyvale, CA",     industry: "Robotics" },
  { name: "1X Technologies",     website: "1x.tech",             headquarters: "Moss, Norway",      industry: "Robotics" },
  { name: "Skild AI",            website: "skild.ai",            headquarters: "Pittsburgh, PA",    industry: "Robotics" },
  { name: "Physical Intelligence",website: "physicalintelligence.com", headquarters: "San Francisco, CA", industry: "Robotics" },
  { name: "Covariant",           website: "covariant.ai",        headquarters: "Emeryville, CA",    industry: "Robotics" },
  { name: "Agility Robotics",    website: "agilityrobotics.com", headquarters: "Corvallis, OR",     industry: "Robotics" },
  { name: "Apptronik",           website: "apptronik.com",       headquarters: "Austin, TX",        industry: "Robotics" },
  { name: "Sanctuary AI",        website: "sanctuary.ai",        headquarters: "Vancouver, Canada", industry: "Robotics" },
  { name: "Nimble",              website: "nimble.ai",           headquarters: "Los Angeles, CA",   industry: "Robotics" },
  { name: "Dexterity",           website: "dexterity.ai",        headquarters: "Redwood City, CA",  industry: "Robotics" },
  { name: "Serval",              website: "serval.ai",           headquarters: "San Francisco, CA", industry: "Robotics" },
  { name: "Applaud",             website: "applaud.ai",          headquarters: "San Francisco, CA", industry: "Robotics" },

  // ── Autonomous vehicles ──────────────────────────────────────────────────
  { name: "Wayve",           website: "wayve.ai",            headquarters: "London, UK",        industry: "Autonomous Vehicles" },
  { name: "Waymo",           website: "waymo.com",           headquarters: "Mountain View, CA", industry: "Autonomous Vehicles" },
  { name: "Cruise",          website: "getcruise.com",       headquarters: "San Francisco, CA", industry: "Autonomous Vehicles" },
  { name: "Nuro",            website: "nuro.ai",             headquarters: "Mountain View, CA", industry: "Autonomous Vehicles" },
  { name: "Zoox",            website: "zoox.com",            headquarters: "Foster City, CA",   industry: "Autonomous Vehicles" },

  // ── Defense AI ───────────────────────────────────────────────────────────
  { name: "Anduril",         website: "anduril.com",         headquarters: "Costa Mesa, CA",    industry: "Defense Technology" },
  { name: "Shield AI",       website: "shield.ai",           headquarters: "San Diego, CA",     industry: "Defense Technology" },
  { name: "Helsing",         website: "helsing.ai",          headquarters: "Munich, Germany",   industry: "Defense Technology" },
  { name: "Palantir",        website: "palantir.com",        headquarters: "Denver, CO",        industry: "Defense Technology" },
  { name: "Vannevar Labs",   website: "vannevarlabs.com",    headquarters: "Palo Alto, CA",     industry: "Defense Technology" },
  { name: "Rebellion Defense",website: "rebelliondefense.com",headquarters: "Washington, DC",   industry: "Defense Technology" },
  { name: "Saronic",         website: "saronic.com",         headquarters: "Austin, TX",        industry: "Defense Technology" },
  { name: "Planet Labs",     website: "planet.com",          headquarters: "San Francisco, CA", industry: "Defense Technology" },

  // ── HR / Talent AI ───────────────────────────────────────────────────────
  { name: "micro1",          website: "micro1.ai",           headquarters: "San Francisco, CA", industry: "Human Resources" },
  { name: "Eightfold",       website: "eightfold.ai",        headquarters: "Santa Clara, CA",   industry: "Human Resources" },
  { name: "Paradox",         website: "paradox.ai",          headquarters: "Scottsdale, AZ",    industry: "Human Resources" },
  { name: "Moveworks",       website: "moveworks.com",       headquarters: "Mountain View, CA", industry: "Human Resources" },
  { name: "Lattice AI",      website: "lattice.com",         headquarters: "San Francisco, CA", industry: "Human Resources" },
  { name: "HiredScore",      website: "hiredscore.com",      headquarters: "New York, NY",      industry: "Human Resources" },

  // ── Misc / emerging ──────────────────────────────────────────────────────
  { name: "Cluely",          website: "cluely.com",          headquarters: "San Francisco, CA" },
  { name: "Emergent",        website: "emergent.ai",         headquarters: "San Francisco, CA" },
  { name: "Manus",           website: "manus.ai",            headquarters: "San Francisco, CA" },
  { name: "Combinely",       website: "combinely.com",       headquarters: "San Francisco, CA" },
  { name: "Merlin",          website: "getmerlin.in",        headquarters: "San Francisco, CA" },
  { name: "Crew AI",         website: "crewai.com",          headquarters: "San Francisco, CA", industry: "Developer Tools" },
  { name: "Twin",            website: "twin.so",             headquarters: "London, UK" },
  { name: "Tenyx",           website: "tenyx.com",           headquarters: "Palo Alto, CA" },
  { name: "World Labs",      website: "worldlabs.ai",        headquarters: "San Francisco, CA" },
  { name: "Decart",          website: "decart.ai",           headquarters: "Tel Aviv, Israel" },
  { name: "Hedra",           website: "hedra.com",           headquarters: "San Francisco, CA" },
  { name: "Goodfire",        website: "goodfire.ai",         headquarters: "San Francisco, CA" },
  { name: "Inworld AI",      website: "inworld.ai",          headquarters: "San Francisco, CA" },
  { name: "Atomic Canyon",   website: "atomiccanyon.com",    headquarters: "San Francisco, CA" },
];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  const seen = new Set<string>(); // dedupe within the list itself

  for (const c of COMPANIES) {
    if (seen.has(c.name.toLowerCase())) continue;
    seen.add(c.name.toLowerCase());

    const existing = await prisma.company.findFirst({
      where: { name: { equals: c.name, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing) {
      console.log(`⏭  ${c.name}`);
      skipped++;
      continue;
    }

    // Ensure unique slug
    let slug = toSlug(c.name);
    let suffix = 0;
    while (await prisma.company.findUnique({ where: { slug } })) {
      suffix++;
      slug = `${toSlug(c.name)}-${suffix}`;
    }

    try {
      await prisma.company.create({
        data: {
          name: c.name,
          slug,
          website: c.website ? (c.website.startsWith("http") ? c.website : `https://${c.website}`) : null,
          industry: c.industry ?? "Artificial Intelligence",
          headquarters: c.headquarters ?? null,
          tags: [],
          sourceType: "manual",
        },
      });
      console.log(`✓  ${c.name}`);
      added++;
    } catch (err) {
      const msg = `✗  ${c.name}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Added:   ${added}`);
  console.log(`Skipped: ${skipped} (already in DB)`);
  if (errors.length) {
    console.log(`Errors:  ${errors.length}`);
    errors.forEach((e) => console.log(` ${e}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
