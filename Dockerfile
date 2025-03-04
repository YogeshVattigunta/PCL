# Base image
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy images from your local machine to the container
COPY images/ /app/images/

# Default command to list images inside the container
CMD ["ls", "-l", "/app/images"]
