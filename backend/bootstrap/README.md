Place an optional `db.sqlite` file in this directory before the first `docker compose up`.

If `AUTO_MIGRATE_SQLITE_TO_POSTGRES=true` and PostgreSQL is empty, the backend container will import data from `bootstrap/db.sqlite` one time during startup.
