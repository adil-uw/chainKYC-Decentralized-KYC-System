from fastapi import FastAPI
from routers.test import router as test_router

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}


app.include_router(test_router)