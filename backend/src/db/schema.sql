CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    request_payload JSONB NOT NULL,
    target_url VARCHAR(2048) NOT NULL,
    response_payload JSONB,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    response_id UUID NOT NULL REFERENCES responses (id) ON DELETE CASCADE,
    z_score DECIMAL(10, 4) NOT NULL,
    predicted_value DECIMAL(10, 2) NOT NULL,
    actual_value DECIMAL(10, 2) NOT NULL,
    rolling_mean DECIMAL(10, 2) NOT NULL,
    rolling_stddev DECIMAL(10, 4) NOT NULL,
    is_anomaly BOOLEAN NOT NULL DEFAULT true,
    anomaly_type VARCHAR(50), -- 'high', 'low', 'timeout'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-computed stats cache (updated every 5 min, cleaned after 24h)
CREATE TABLE IF NOT EXISTS rolling_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    mean_response_time DECIMAL(10, 2) NOT NULL,
    stddev_response_time DECIMAL(10, 4) NOT NULL,
    min_response_time INTEGER NOT NULL,
    max_response_time INTEGER NOT NULL,
    sample_count INTEGER NOT NULL,
    sum_response_time BIGINT NOT NULL,
    sum_squared BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses (created_at DESC)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_responses_time_range ON responses (created_at)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_responses_status ON responses (status_code, created_at DESC)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_anomalies_response ON anomalies (response_id);

CREATE INDEX IF NOT EXISTS idx_anomalies_created ON anomalies (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rolling_stats_window ON rolling_stats (window_end DESC);