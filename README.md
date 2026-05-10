# Folio — Elegant Blog CMS
A full-stack Blog & CMS built with **Python (Flask)** backend and a refined editorial frontend.

## Project Structure
```
blog-cms/
├── app.py                  # Flask backend (REST API + routes)
├── requirements.txt
├── templates/
│   └── index.html          # Single-page editorial UI
└── static/
    ├── css/style.css       # Elegant editorial styles
    └── js/app.js           # SPA frontend logic
```

## Setup & Run

```bash
# 1. Install Flask
pip install -r requirements.txt

# 2. Start the server
python app.py

# 3. Open in browser
http://localhost:5000
```

## REST API

| Method   | Endpoint             | Description                          |
|----------|----------------------|--------------------------------------|
| GET      | `/api/posts`         | List posts (filter by category, search, status, page) |
| POST     | `/api/posts`         | Create a new post                    |
| GET      | `/api/posts/<id>`    | Get a single post (increments views) |
| PATCH    | `/api/posts/<id>`    | Update a post                        |
| DELETE   | `/api/posts/<id>`    | Delete a post                        |
| GET      | `/api/categories`    | List all categories                  |
| GET      | `/api/stats`         | Published count, drafts, total views |

## Features
- ✅ Create, edit, delete blog posts
- ✅ Rich editorial homepage with featured post
- ✅ Filter by category (Technology, Design, Culture, Science, Opinion)
- ✅ Full-text search (title + excerpt)
- ✅ Draft / Published status
- ✅ Tags, author, cover colour, due date
- ✅ Paginated grid with load-more
- ✅ Single post reading view
- ✅ Responsive design
- ✅ 7 demo posts pre-loaded

## Fonts Used
- **Cormorant Garamond** — editorial serif for headlines
- **Jost** — clean sans-serif for UI

## Production Tips
- Replace the in-memory `posts = []` list with **SQLite + flask-sqlalchemy**
- Add a rich text editor (Quill.js, TipTap) for formatted content
- Add image upload support via **flask-uploads** or S3
- Add user auth with **Flask-Login**
