# declutter.ai
User (Web UI)
   │
   ▼
API Gateway (REST)
   │
   ▼
AWS Lambda (Cleanup Scanner)
   ├──> S3 SDK: Scan files in user’s bucket
   ├──> Detect:
   │     ├── Duplicates (via hash)
   │     ├── Large files (size filter)
   │     └── Old files (last modified)
   └──> Store results in DynamoDB (optional)
   
UI pulls results from API Gateway again
   │
   ▼
Frontend displays cleanup suggestions
