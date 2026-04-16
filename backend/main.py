from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.core import loader
from backend.routes import cases, actions, chat

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    loader.load_all()
    yield


app = FastAPI(title="Casework Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)
app.include_router(actions.router)
app.include_router(chat.router)

# Mount static assets (CSS, JS)
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")


@app.get("/", response_class=HTMLResponse)
async def serve_queue_page():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/case", response_class=HTMLResponse)
async def serve_case_page():
    return FileResponse(FRONTEND_DIR / "case.html")
