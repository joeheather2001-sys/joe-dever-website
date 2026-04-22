#!/usr/bin/env python3
"""
Auto Blog Post Generator for jdigitalarchitecture
Uses Google Gemini API to generate SEO-optimized blog posts
"""

import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path

# Try multiple API clients
try:
    import google.genai as gemini
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
BLOG_DIR = Path(__file__).parent.parent / "blog"
POSTS_DIR = BLOG_DIR
BLOG_INDEX = Path(__file__).parent.parent / "blog.html"

# Topics relevant to jdigitalarchitecture (architecture/design focused web dev)
TOPICS = [
    "Website Architecture for Design Studios in 2026",
    "Why Architects Should Care About Core Web Vitals",
    "Minimalist Web Design Principles That Convert",
    "How to Choose Between Static and Dynamic Websites",
    "The True Cost of a Professional Website in 2026",
    "AI Tools That Speed Up Web Development Workflows",
    "Mobile-First Design for Architecture Portfolios",
    "SEO Basics for Architects and Designers",
    "Why Page Speed Matters for Design Portfolios",
    "CMS vs Static Site Generators for Creative Portfolios",
    "Building Credibility Through Web Design",
    "Key Web Design Trends Shaping 2026",
]

def generate_slug(title):
    """Convert title to URL-friendly slug"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = slug.strip('-')
    return slug

def generate_post_with_gemini(title):
    """Generate blog post content using Gemini API"""
    client = gemini.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""Write a blog post for a web developer/designer called "jdigitalarchitecture" who specializes in websites for architects and designers.

Title: {title}

Requirements:
- 400-600 words
- Conversational, professional tone
- Include 2-3 subheadings (## Heading format)
- Include a bullet list of key takeaways
- End with a soft CTA about getting a website consultation
- Use this exact format:

<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}} — jdigitalarchitecture</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="manifest" href="../manifest.webmanifest">
<meta name="theme-color" content="#111111">
<meta name="description" content="{{META_DESC}}">
<style>
  body{{font-family:Inter,sans-serif;background:#f5f5f7;color:#1d1d1f}}
  .glass{{background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.3)}}
  .btn{{display:inline-block;padding:12px 28px;border-radius:14px;font-weight:500;cursor:pointer;text-decoration:none}}
  .btn-primary{{background:#1d1d1f;color:#fff;box-shadow:0 6px 18px rgba(29,29,31,.12)}}
</style>
</head>
<body>
<header class="fixed w-full z-50 px-4 py-3">
  <div class="max-w-7xl mx-auto flex justify-between items-center glass rounded-2xl px-5 py-2.5 shadow-sm">
    <a href="../index.html" class="flex items-center gap-2"><img src="../assets/logo.svg" alt="" class="w-8 h-8"></a>
    <nav class="hidden md:flex space-x-6 font-medium text-sm">
      <a href="../index.html" class="hover:text-blue-400">Home</a>
      <a href="../about.html" class="hover:text-blue-400">About</a>
      <a href="../services.html" class="hover:text-blue-400">Services</a>
      <a href="../blog.html" class="hover:text-blue-400">Blog</a>
      <a href="../contact.html" class="hover:text-blue-400">Contact</a>
    </nav>
    <a href="../contact.html" class="btn btn-primary text-xs px-4 py-2">Hire Me</a>
  </div>
</header>
<main class="py-12 px-6 max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold mb-2">{{TITLE}}</h1>
  <p class="text-sm text-slate-500 mb-6">Published {datetime.now().strftime('%Y-%m-%d')}</p>
  <div class="glass rounded-2xl p-8">
    {{CONTENT}}
  </div>
</main>
<footer class="bg-slate-900 text-white py-12 mt-20">
  <div class="max-w-6xl mx-auto text-center px-4">
    <p class="text-slate-500 text-sm">© 2026 jdigitalarchitecture</p>
  </div>
</footer>
<script src="../js/app.js"></script>
</body></html>"""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return response.text

def generate_post_content_with_gemini(title):
    """Generate just the content portion (for blog listing)"""
    client = gemai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""Write a blog post for a web developer/designer called "jdigitalarchitecture" who specializes in websites for architects and designers.

Title: {title}

Write 400-600 words. Include:
- 2-3 subheadings (## Heading format)
- A bullet list of key takeaways
- A soft CTA at the end about website consultation

Write in a conversational, professional tone. No markdown formatting inside HTML - just clean HTML."""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return response.text

def update_blog_index(new_post_path, title, excerpt, date):
    """Update blog.html to include the new post"""
    # Read current blog.html
    with open(BLOG_INDEX, 'r') as f:
        content = f.read()
    
    # Create new post card HTML
    new_card = f'''    <article class="glass p-6 rounded-2xl border border-slate-100 hover:shadow-xl transition">
      <time class="text-sm text-slate-500">{date}</time>
      <h2 class="text-lg font-bold mt-1 mb-2">{title}</h2>
      <p class="text-sm text-slate-600 post-excerpt">{excerpt}</p>
      <a href="{new_post_path}" class="text-blue-500 text-sm mt-3 inline-block">Read more →</a>
    </article>
'''
    
    # Find the posts grid and insert after first card
    posts_div = content.find('<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="posts">')
    if posts_div == -1:
        print("ERROR: Could not find posts grid in blog.html")
        return False
    
    # Find the closing </div> of the grid
    end_div = content.find('</div>', posts_div)
    if end_div == -1:
        print("ERROR: Could not find end of posts grid")
        return False
    
    # Insert new card after the opening div of the grid
    insert_pos = posts_div + len('<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="posts">')
    content = content[:insert_pos] + '\n' + new_card + content[insert_pos:]
    
    with open(BLOG_INDEX, 'w') as f:
        f.write(content)
    
    return True

def main():
    # Check which API is available
    if not GEMINI_API_KEY and not OPENAI_API_KEY:
        print("ERROR: No API key found. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable.")
        sys.exit(1)
    
    if GEMINI_API_KEY:
        if not GEMINI_AVAILABLE:
            print("Installing google-genai...")
            os.system(f"{sys.executable} -m pip install google-genai -q")
            import google.genai as gemini
        
        print(f"Using Gemini API to generate post...")
        
        # Pick a random topic
        import random
        topic = random.choice(TOPICS)
        print(f"Topic: {topic}")
        
        # Generate full post HTML
        html_content = generate_post_with_gemini(topic)
        
        # Save the post
        slug = generate_slug(topic)
        date = datetime.now().strftime('%Y-%m-%d')
        filename = f"{slug}.html"
        filepath = POSTS_DIR / filename
        
        with open(filepath, 'w') as f:
            f.write(html_content)
        
        print(f"Created: {filepath}")
        
        # Extract excerpt for blog listing (first 150 chars of paragraph text)
        excerpt_match = re.search(r'<p[^>]*>([^<]+)</p>', html_content)
        excerpt = excerpt_match.group(1)[:150] + "..." if excerpt_match else "Read more..."
        
        # Update blog index
        post_path = f"blog/{filename}"
        if update_blog_index(post_path, topic, excerpt, date):
            print(f"Updated blog.html with new post")
        
        print(f"\nDone! Post published: {post_path}")
        
    else:
        print("ERROR: Gemini API key not available")
        sys.exit(1)

if __name__ == "__main__":
    main()
