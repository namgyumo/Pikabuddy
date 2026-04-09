from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings

from modules.auth.router import router as auth_router
from modules.courses.router import router as courses_router
from modules.assignments.router import router as assignments_router
from modules.editor.router import router as editor_router
from modules.analysis.router import router as analysis_router
from modules.tutor.router import router as tutor_router
from modules.notes.router import router as notes_router
from modules.dashboard.router import router as dashboard_router
from modules.proctor.router import router as proctor_router
from modules.runner.router import router as runner_router
from modules.agents.router import router as agents_router
from modules.materials.router import router as materials_router
from modules.gamification.router import router as gamification_router

settings = get_settings()

app = FastAPI(
    title="AI 교육 플랫폼 API",
    description="코딩·글쓰기·시험·노트를 통합하고, AI가 학습 과정을 분석하는 교육 플랫폼",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth_router, prefix="/api")
app.include_router(courses_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")
app.include_router(editor_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(tutor_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(proctor_router, prefix="/api")
app.include_router(runner_router, prefix="/api")
app.include_router(materials_router, prefix="/api")
app.include_router(gamification_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AI 교육 플랫폼 API", "docs": "/docs"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-edu-platform"}
