# Northstar Ecommerce

## Deploy to Google App Engine

1. Install the Google Cloud SDK.
2. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   ```
3. Create or select a project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
4. Deploy:
   ```bash
   gcloud app deploy
   ```
5. Open the deployed URL shown by the command output.

This app uses Express and a local SQLite database. For production, consider moving the database to Cloud SQL or a persistent storage solution.
