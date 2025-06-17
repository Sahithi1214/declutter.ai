# declutter.ai

## System Architecture Overview
```mermaid
flowchart TD
    A[User Web UI] --> B[API Gateway REST]
    B --> C[AWS Lambda Cleanup Scanner]
    C --> D[S3 SDK: Scan files in user's bucket]
    C --> E{Detect}
    E --> F[Duplicates via hash]
    E --> G[Large files size filter]
    E --> H[Old files last modified]
    C --> I[DynamoDB optional: Store results]
    B --> J[UI pulls results from API Gateway]
    J --> K[Frontend displays cleanup suggestions]
