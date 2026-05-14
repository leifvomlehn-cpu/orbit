"""Pytest configuration for orbital backend."""
import pytest
from app import app as flask_app, cache


@pytest.fixture
def app():
    flask_app.config.update({"TESTING": True})
    yield flask_app


@pytest.fixture
def client(app):
    cache.clear()
    return app.test_client()
