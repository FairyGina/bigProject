#!/bin/bash
# Data loading is now handled by the Analysis Engine container (migrate_db.py)
# because it requires complex JSONB parsing that is difficult in Bash/SQL.
echo "✅ Data loading delegated to Analysis Engine."
exit 0
