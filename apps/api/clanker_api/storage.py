import hashlib
import os
from pathlib import Path
from typing import Protocol


class ObjectStore(Protocol):
    def put(self, key: str, data: bytes) -> str: ...
    def get(self, key: str) -> bytes: ...


class LocalStore:
    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def path(self, key: str) -> Path:
        target = (self.root / key).resolve()
        if not target.is_relative_to(self.root) or target == self.root:
            raise ValueError("Object key must stay inside the asset directory.")
        return target

    def put(self, key: str, data: bytes) -> str:
        path = self.path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.read_bytes() != data:
            raise ValueError("An immutable artifact already exists with different content.")
        temp = path.with_suffix(path.suffix + ".tmp")
        temp.write_bytes(data)
        temp.replace(path)
        return hashlib.sha256(data).hexdigest()

    def get(self, key: str) -> bytes:
        return self.path(key).read_bytes()


class S3Store:
    def __init__(self):
        import boto3

        self.bucket = os.environ["S3_BUCKET"]
        self.client = boto3.client("s3", endpoint_url=os.getenv("S3_ENDPOINT_URL"))

    def put(self, key: str, data: bytes) -> str:
        checksum = hashlib.sha256(data).hexdigest()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, Metadata={"sha256": checksum})
        return checksum

    def get(self, key: str) -> bytes:
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()


def get_store() -> ObjectStore:
    return (
        S3Store()
        if os.getenv("STORAGE_BACKEND") == "s3"
        else LocalStore(os.getenv("ASSET_ROOT", ".data/assets"))
    )
