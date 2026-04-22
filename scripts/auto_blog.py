#!/usr/bin/env python3
"""
Auto Blog Post Generator for jdigitalarchitecture
Uses Ollama (local) to generate SEO-optimized blog posts
"""

import os
import sys
import json
import re
import random
from datetime import datetime
from pathlib import Path
import subprocess

# Configuration
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3:latest")
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

def call_ollama(prompt):
    """Call Ollama API to generate content"""
    url = "http://localhost:11434/api/generate"
    
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 1024
        }
    })
    
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-d", payload],
        capture_output=True,
        text=True
    )
    
    try:
        response = json.loads(result.stdout)
        if "response" in response:
            return response["response"]
        else:
            print(f"Ollama Response: {response}")
            return None
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Response: {result.stdout}")
        return None

def generate_post_content(title):
    """Generate blog post content using Ollama"""
    
    prompt = f'''Write a blog post for a web developer/designer called "jdigitalarchitecture" who specializes in websites for architects and designers.

Title: {title}

Requirements:
- 400-600 words
- Conversational, professional tone
- Include 2-3 subheadings using <h2> tags
- Include a bullet list of key takeaways using <ul> and <li> tags
- End with a soft CTA about getting a website consultation
- Output ONLY the HTML content - just <p>, <h2>, <ul>, <li>, <strong> tags. No markdown. No code blocks. No HTML boilerplate.
- Keep it clean and ready to paste into a page template

Write the HTML content now:'''

    content = call_ollama(prompt)
    return content

def generate_post_html(title, content):
    """Build complete blog post HTML file"""
    
    if not content:
        return None
    
    date = datetime.now().strftime('%Y-%m-%d')
    slug = generate_slug(title)
    
    # Extract meta description from content
    meta_match = re.search(r'<p[^>]*>([^<]+)</p>', content)
    meta_desc = meta_match.group(1)[:150] if meta_match else title
    
    html = f'''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — jdigitalarchitecture</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="manifest" href="../manifest.webmanifest">
<meta name="theme-color" content="#111111">
<meta name="description" content="{meta_desc}">
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
  <h1 class="text-3xl font-bold mb-2">{title}</h1>
  <p class="text-sm text-slate-500 mb-6">Published {date}</p>
  <div class="glass rounded-2xl p-8">
    {content}
  </div>
</main>
<footer class="bg-slate-900 text-white py-12 mt-20">
  <div class="max-w-6xl mx-auto text-center px-4">
    <p class="text-slate-500 text-sm">© 2026 jdigitalarchitecture</p>
  </div>
</footer>
<script src="../js/app.js"></script>
</body></html>'''
    
    return html, slug, date, meta_desc

def update_blog_index(new_post_path, title, excerpt, date):
    """Update blog.html to include the new post"""
    with open(BLOG_INDEX, 'r') as f:
        content = f.read()
    
    new_card = f'''    <article class="glass p-6 rounded-2xl border border-slate-100 hover:shadow-xl transition">
      <time class="text-sm text-slate-500">{date}</time>
      <h2 class="text-lg font-bold mt-1 mb-2">{title}</h2>
      <p class="text-sm text-slate-600 post-excerpt">{excerpt}</p>
      <a href="{new_post_path}" class="text-blue-500 text-sm mt-3 inline-block">Read more →</a>
    </article>
'''
    
    posts_div = content.find('<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="posts">')
    if posts_div == -1:
        print("ERROR: Could not find posts grid in blog.html")
        return False
    
    insert_pos = posts_div + len('<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="posts">')
    content = content[:insert_pos] + '\n' + new_card + content[insert_pos:]
    
    with open(BLOG_INDEX, 'w') as f:
        f.write(content)
    
    return True

def main():
    print(f"Generating blog post with Ollama ({OLLAMA_MODEL})...")
    
    # Pick a random topic
    topic = random.choice(TOPICS)
    print(f"Topic: {topic}")
    
    # Generate content
    content = generate_post_content(topic)
    
    if not content:
        print("ERROR: Failed to generate content")
        sys.exit(1)
    
    result = generate_post_html(topic, content)
    
    if not result:
        print("ERROR: Failed to build HTML")
        sys.exit(1)
    
    html_content, slug, date, meta_desc = result
    
    # Save the post
    filename = f"{slug}.html"
    filepath = POSTS_DIR / filename
    
    with open(filepath, 'w') as f:
        f.write(html_content)
    
    print(f"Created: {filepath}")
    
    # Update blog index
    post_path = f"blog/{filename}"
    excerpt = meta_desc[:150] + "..."
    if update_blog_index(post_path, topic, excerpt, date):
        print(f"Updated blog.html with new post")
    
    # Auto-commit and push
    print("Committing and pushing to GitHub...")
    try:
        subprocess.run(["git", "add", "-A"], cwd=Path(__file__).parent.parent, check=True)
        subprocess.run(["git", "commit", "-m", f"Auto blog post {date}"], cwd=Path(__file__).parent.parent, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=Path(__file__).parent.parent, check=True)
        print("Pushed to GitHub!")
    except subprocess.CalledProcessError as e:
        print(f"Git error: {e}")
        print("Post created locally but push failed. Run 'git push' manually.")
    
    print(f"\nDone! Post published: {post_path}")

if __name__ == "__main__":
    main()
