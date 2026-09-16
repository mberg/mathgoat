CREATE TABLE fact_hints (
 kid_id TEXT NOT NULL REFERENCES kids(id),
 a INTEGER NOT NULL,
 b INTEGER NOT NULL,
 payload TEXT NOT NULL,
 PRIMARY KEY (kid_id,a,b)
);
