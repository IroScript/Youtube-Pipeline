from contextlib import contextmanager
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from flowboard.config import DB_PATH

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    echo=False,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_sqlite_fk(dbapi_conn, _connection_record) -> None:
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


def init_db() -> None:
    from sqlalchemy import inspect
    from flowboard.db import models

    with engine.connect() as conn:
        insp = inspect(conn)
        if insp.has_table("asset"):
            cols = {c["name"] for c in insp.get_columns("asset")}
            if "url" not in cols:
                models.Asset.__table__.drop(conn, checkfirst=True)
                conn.commit()

        if insp.has_table("edge"):
            edge_cols = {c["name"] for c in insp.get_columns("edge")}
            if "source_variant_idx" not in edge_cols:
                conn.exec_driver_sql(
                    "ALTER TABLE edge ADD COLUMN source_variant_idx INTEGER"
                )
                conn.commit()

    # Create ONLY Flowboard's 12 core tables in flowboard.db
    flowboard_tables = [
        models.Board.__table__,
        models.Node.__table__,
        models.Edge.__table__,
        models.Request.__table__,
        models.Asset.__table__,
        models.MediaProjectMapping.__table__,
        models.Reference.__table__,
        models.ChatMessage.__table__,
        models.Plan.__table__,
        models.PlanRevision.__table__,
        models.PipelineRun.__table__,
        models.BoardFlowProject.__table__,
    ]
    SQLModel.metadata.create_all(engine, tables=flowboard_tables)


@contextmanager
def get_session():
    with Session(engine) as session:
        yield session
