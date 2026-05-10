from flask import Flask, render_template, request, jsonify, abort
from datetime import datetime
import uuid
import re

app = Flask(__name__)

# ── In-memory store (swap with SQLAlchemy/SQLite for persistence) ──
posts = []
categories = ["Technology", "Design", "Culture", "Science", "Opinion"]

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

def find_post(post_id):
    return next((p for p in posts if p["id"] == post_id), None)

# ── PAGES ──
@app.route("/")
def index():
    return render_template("index.html")

# ── API: POSTS ──
@app.route("/api/posts", methods=["GET"])
def get_posts():
    category = request.args.get("category", "")
    search   = request.args.get("search", "").lower()
    status   = request.args.get("status", "published")
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 6))

    result = posts[:]
    if status != "all":
        result = [p for p in result if p["status"] == status]
    if category:
        result = [p for p in result if p["category"] == category]
    if search:
        result = [p for p in result if search in p["title"].lower() or search in p["excerpt"].lower()]

    result.sort(key=lambda x: x["published_at"] or x["created_at"], reverse=True)
    total = len(result)
    start = (page - 1) * per_page
    paginated = result[start:start + per_page]

    return jsonify({
        "posts": paginated,
        "total": total,
        "page": page,
        "pages": max(1, -(-total // per_page)),
    })

@app.route("/api/posts/<post_id>", methods=["GET"])
def get_post(post_id):
    post = find_post(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    # Increment views
    post["views"] = post.get("views", 0) + 1
    return jsonify(post)

@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json()
    if not data or not data.get("title", "").strip():
        return jsonify({"error": "Title is required"}), 400

    title = data["title"].strip()
    now   = datetime.now().isoformat()
    post  = {
        "id":           str(uuid.uuid4()),
        "title":        title,
        "slug":         slugify(title),
        "excerpt":      data.get("excerpt", "").strip(),
        "content":      data.get("content", "").strip(),
        "category":     data.get("category", "Technology"),
        "author":       data.get("author", "Anonymous").strip(),
        "cover_color":  data.get("cover_color", "#2c3e50"),
        "tags":         data.get("tags", []),
        "status":       data.get("status", "draft"),
        "views":        0,
        "created_at":   now,
        "published_at": now if data.get("status") == "published" else None,
    }
    posts.append(post)
    return jsonify(post), 201

@app.route("/api/posts/<post_id>", methods=["PATCH"])
def update_post(post_id):
    post = find_post(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404

    data    = request.get_json()
    allowed = {"title", "excerpt", "content", "category", "author", "cover_color", "tags", "status"}
    for key in allowed:
        if key in data:
            post[key] = data[key]

    if data.get("status") == "published" and not post["published_at"]:
        post["published_at"] = datetime.now().isoformat()
    if "title" in data:
        post["slug"] = slugify(data["title"])

    return jsonify(post)

@app.route("/api/posts/<post_id>", methods=["DELETE"])
def delete_post(post_id):
    global posts
    post = find_post(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    posts = [p for p in posts if p["id"] != post_id]
    return jsonify({"message": "Post deleted"})

# ── API: META ──
@app.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify(categories)

@app.route("/api/stats", methods=["GET"])
def get_stats():
    published = [p for p in posts if p["status"] == "published"]
    return jsonify({
        "total":     len(posts),
        "published": len(published),
        "drafts":    len(posts) - len(published),
        "views":     sum(p.get("views", 0) for p in published),
        "categories": len(set(p["category"] for p in posts)),
    })

# ── SEED DEMO DATA ──
def seed():
    samples = [
        {
            "title":       "The Art of Slow Writing",
            "excerpt":     "In an age of instant publishing, deliberate craft separates enduring prose from forgettable noise.",
            "content":     "Writing slowly is not about laziness. It is about intention...",
            "category":    "Culture",
            "author":      "Eleanor Marsh",
            "cover_color": "#1a1a2e",
            "tags":        ["writing", "craft", "creativity"],
            "status":      "published",
        },
        {
            "title":       "Designing with Restraint",
            "excerpt":     "Why the most powerful designs often say the least — a meditation on negative space and editorial clarity.",
            "content":     "Every element you remove makes the remaining elements stronger...",
            "category":    "Design",
            "author":      "Oliver Chen",
            "cover_color": "#2d4a3e",
            "tags":        ["design", "minimalism", "ui"],
            "status":      "published",
        },
        {
            "title":       "What Large Language Models Still Cannot Do",
            "excerpt":     "Despite breathless headlines, there remain profound gaps between pattern matching and genuine understanding.",
            "content":     "The distinction between correlation and causation remains a formidable barrier...",
            "category":    "Technology",
            "author":      "Dr. Priya Nair",
            "cover_color": "#2c2c54",
            "tags":        ["AI", "machine learning", "research"],
            "status":      "published",
        },
        {
            "title":       "The Quiet Revival of Long-Form Journalism",
            "excerpt":     "Readers are returning to depth and nuance after years of headline fatigue.",
            "content":     "Long-form journalism never died — it was merely overshadowed...",
            "category":    "Culture",
            "author":      "James Whitfield",
            "cover_color": "#3d2b1f",
            "tags":        ["journalism", "media", "reading"],
            "status":      "published",
        },
        {
            "title":       "Fermenting as Philosophy",
            "excerpt":     "What sourdough and kombucha taught me about patience, failure, and the passage of time.",
            "content":     "There is something deeply countercultural about fermentation...",
            "category":    "Culture",
            "author":      "Sofia Delacroix",
            "cover_color": "#3b4a1e",
            "tags":        ["food", "philosophy", "culture"],
            "status":      "published",
        },
        {
            "title":       "On the Aesthetics of Scientific Papers",
            "excerpt":     "Why academic publishing desperately needs designers, and what beauty has to do with truth.",
            "content":     "Scientific communication is in aesthetic crisis...",
            "category":    "Science",
            "author":      "Dr. Priya Nair",
            "cover_color": "#1a3a4a",
            "tags":        ["science", "design", "academia"],
            "status":      "published",
        },
        {
            "title":       "Draft: Against Productivity Culture",
            "excerpt":     "An unfinished polemic on why busyness has become the enemy of meaning.",
            "content":     "We have confused motion for progress...",
            "category":    "Opinion",
            "author":      "Eleanor Marsh",
            "cover_color": "#3a2a2a",
            "tags":        ["opinion", "culture", "work"],
            "status":      "draft",
        },
    ]
    for s in samples:
        now = datetime.now().isoformat()
        post = {
            "id":           str(uuid.uuid4()),
            "slug":         slugify(s["title"]),
            "views":        0,
            "created_at":   now,
            "published_at": now if s["status"] == "published" else None,
            **s,
        }
        posts.append(post)

if __name__ == "__main__":
    seed()
    app.run(debug=True, port=5000)
