# for testing in an isolated environment
# Base image: Bun official image (includes Node, npm, etc.)
FROM oven/bun:latest

# Install Git
RUN apt-get update && apt-get install -y git && apt-get clean

# Set working directory inside container
WORKDIR /usr/src/app

# Copy project files (optional)
COPY . .

# Default command (interactive shell)
CMD [ "bash" ]
