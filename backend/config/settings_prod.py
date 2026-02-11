from .settings import *  # noqa

DEBUG = False
ALLOWED_HOSTS = ["trust.supplymax.net", "localhost", "127.0.0.1"]

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
  "staticfiles": {
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
  }
}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CSRF_TRUSTED_ORIGINS = ["https://trust.supplymax.net"]
